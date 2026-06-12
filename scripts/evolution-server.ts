// pnpm evolve:server [--cycles N] [--executor pty|headless] [--no-local-worker]
//
// Evolution engine server.
//
// Two modes:
//   1. Embedded PGlite (default): boots PGlite at .delphi/engine and exposes it
//      over the Postgres wire protocol via @electric-sql/pglite-socket on
//      localhost:PGLITE_PORT (default 5444). Remote workers connect with:
//        ENGINE_URL=postgres://localhost:5444/delphi pnpm evolve:worker
//
//   2. Real Postgres (DATABASE_URL set): skips pglite-socket entirely and uses
//      DATABASE_URL for the engine DB. True multi-machine topology.
//
// The server enqueues --cycles evolution-cycle workflow runs then waits for
// completion. By default it also starts an in-process worker (pass
// --no-local-worker to rely exclusively on remote workers).
//
// Gate: pnpm typecheck && pnpm lint:check && pnpm test (56 tests must stay green).

import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  CREATE_TABLES_SQL,
  createEngine,
  nanoId,
  runMigrations,
} from '@goatlab/delphi-core'
import { parseArgs } from './evolution-loop.js'
import {
  EvolutionCycleWorkflow,
  readState,
  startWorker,
} from './evolution-steps.js'
import { execMultiStatement } from './pglite-db-client.js'

// ── Arg parsing ───────────────────────────────────────────────────────────────

function parseServerArgs(argv: string[]): {
  cycles: number
  executor: string
  noLocalWorker: boolean
  dryRun: boolean
} {
  const base = parseArgs(argv)
  const noLocalWorker =
    argv.includes('--no-local-worker') || argv.includes('--no-worker')
  return {
    cycles: base.cycles,
    executor: base.executor,
    noLocalWorker,
    dryRun: base.dryRun,
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseServerArgs(process.argv.slice(2))
  const cwd = process.cwd()

  const pglitePort = Number(process.env.PGLITE_PORT ?? 5444)
  const useRealPostgres = Boolean(process.env.DATABASE_URL)

  console.log(
    `\n╔══ Delphi Evolution Server ═════════════════════════════════════╗`,
  )
  console.log(
    `║  pid=${process.pid}  cycles=${args.cycles}  executor=${args.executor}`,
  )
  console.log(
    `║  mode=${useRealPostgres ? 'real-postgres (DATABASE_URL)' : `pglite-socket :${pglitePort}`}`,
  )
  console.log(`║  localWorker=${!args.noLocalWorker}`)
  console.log(
    `╚═════════════════════════════════════════════════════════════════╝\n`,
  )

  if (args.executor) {
    process.env.AGENT_EXECUTOR = args.executor
  }

  const engineDataDir = resolve(cwd, '.delphi/engine')
  mkdirSync(engineDataDir, { recursive: true })

  let db: any
  let closeEngineDb: () => Promise<void>
  let socketServer: any = null

  if (useRealPostgres) {
    // Real Postgres: use pg pool directly via DATABASE_URL
    console.log(`Using real Postgres: ${process.env.DATABASE_URL}`)
    const { Pool } = await import('pg')
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const { createDbClient } = await import('@goatlab/delphi-core')
    db = createDbClient(pool)
    closeEngineDb = async () => {
      await db.destroy?.()
    }
  } else {
    // Embedded PGlite + socket server
    console.log(`Booting PGlite at ${engineDataDir}...`)
    const { PGlite } = await import('@electric-sql/pglite')
    const pgliteInstance = new PGlite(engineDataDir)

    // Import the socket server
    const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket')
    // maxConnections: 3 — allows one active poll connection from the remote worker
    // plus one spare for the self-test or connection pool warmup. PGlite still
    // serialises all queries internally, so higher maxConnections is safe.
    socketServer = new PGLiteSocketServer({
      db: pgliteInstance,
      port: pglitePort,
      host: '127.0.0.1',
      maxConnections: 3,
    })
    await socketServer.start()
    console.log(
      `PGlite socket server listening on postgres://127.0.0.1:${pglitePort}/delphi`,
    )
    console.log(
      `Remote workers: ENGINE_URL=postgres://127.0.0.1:${pglitePort}/delphi pnpm evolve:worker`,
    )

    // Use the PGlite-backed DbClient for the engine (same instance)
    const { createPGliteDbClient } = await import('./pglite-db-client.js')
    db = createPGliteDbClient(pgliteInstance as any)
    closeEngineDb = async () => {
      await db.destroy?.()
    }
  }

  // Run schema migrations
  await execMultiStatement(db, CREATE_TABLES_SQL)
  await runMigrations(db)

  // Build the typed engine
  const engine = createEngine({
    database: db,
    workflows: [new EvolutionCycleWorkflow()] as const,
    tenantId: 'default',
    disableStepStatusBuffering: true,
    dispatch: {
      pollingIntervalMs: 200,
      maxPollingIntervalMs: 2_000,
    },
  })

  // Optionally start in-process worker
  let stopWorker: (() => Promise<void>) | null = null
  if (!args.noLocalWorker) {
    console.log('Starting local in-process worker...')
    stopWorker = await startWorker(engine)
  } else {
    console.log(
      'No local worker — waiting for remote workers to claim steps...',
    )
  }

  // Summary
  const summary: Array<{
    cycle: number
    runId: string
    trigger: string
    title: string
    gate: string
    closure: string
    stepStatuses: Array<{ name: string; status: string; durationMs?: number }>
  }> = []

  try {
    for (let cycle = 1; cycle <= args.cycles; cycle++) {
      console.log(
        `\n━━━ Cycle ${cycle}/${args.cycles} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      )

      if (args.dryRun) {
        console.log('DRY-RUN mode — workflow not started')
        break
      }

      const runId = nanoId()

      const { runId: engineRunId } = await engine['evolution-cycle'].start({
        cycle,
        executor: args.executor,
        runId,
      })
      console.log(
        `[server] Engine run started: ${engineRunId} (state runId: ${runId})`,
      )

      // Poll for completion
      const timeoutMs = 35 * 60 * 1000
      const startMs = Date.now()
      let finalStatus: any = null

      while (Date.now() - startMs < timeoutMs) {
        await new Promise(r => setTimeout(r, 1000))
        const status = (await engine['evolution-cycle'].getStatus(
          engineRunId,
        )) as any
        if (
          ['COMPLETED', 'FAILED', 'CANCELLED'].includes(status.status as string)
        ) {
          finalStatus = status
          break
        }
        const runningSteps = ((status.steps as any[]) ?? []).filter(
          s => s.status === 'RUNNING',
        )
        if (runningSteps.length > 0) {
          process.stdout.write(
            `\r[server] running: ${runningSteps.map((s: any) => s.stepName).join(', ')}    `,
          )
        }
      }
      process.stdout.write('\n')

      if (!finalStatus) {
        console.error(`[server] Run ${engineRunId} timed out`)
        finalStatus = (await engine['evolution-cycle'].getStatus(
          engineRunId,
        )) as any
      }

      const steps = ((finalStatus?.steps as any[]) ?? []) as Array<{
        stepName: string
        status: string
        startedAt?: string
        completedAt?: string
        error?: string
        output?: any
      }>

      console.log(`\n── Engine Step Status for run ${engineRunId} ──`)
      console.log(`${'STEP'.padEnd(22)} ${'STATUS'.padEnd(12)} DURATION`)
      console.log('─'.repeat(50))
      const stepStatuses: Array<{
        name: string
        status: string
        durationMs?: number
      }> = []
      for (const s of steps) {
        let durationMs: number | undefined
        if (s.startedAt && s.completedAt) {
          durationMs =
            new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()
        }
        const dur =
          durationMs !== undefined ? `${(durationMs / 1000).toFixed(1)}s` : '—'
        console.log(`${s.stepName.padEnd(22)} ${s.status.padEnd(12)} ${dur}`)
        if (s.error) {
          console.log(`  ERROR: ${s.error.slice(0, 120)}`)
        }
        if (durationMs !== undefined) {
          stepStatuses.push({
            name: s.stepName,
            status: s.status,
            durationMs,
          })
        } else {
          stepStatuses.push({ name: s.stepName, status: s.status })
        }
      }
      console.log(`\nRun status: ${finalStatus?.status ?? 'UNKNOWN'}`)

      const finalState = readState(cwd, runId)
      const trigger = finalState.trigger ?? '(unknown)'
      const title = finalState.targetTitle ?? '(unknown)'
      const gate = finalState.gateGreenResult
        ? 'GREEN'
        : finalState.disputed
          ? 'DISPUTED'
          : 'RED'
      const closure = finalState.closureStatus ?? '(unknown)'

      summary.push({
        cycle,
        runId: engineRunId,
        trigger,
        title,
        gate,
        closure,
        stepStatuses,
      })
    }
  } finally {
    console.log('\nShutting down server...')
    if (stopWorker) {
      await stopWorker()
    }
    await engine.shutdown().catch(() => {})
    await engine.ingestBuffer.shutdown().catch(() => {})
    await closeEngineDb().catch(() => {})
    if (socketServer) {
      await socketServer.stop().catch(() => {})
      console.log('PGlite socket server stopped.')
    }
  }

  console.log(`\n${'═'.repeat(70)}`)
  console.log('EVOLUTION SERVER SUMMARY')
  console.log(`${'═'.repeat(70)}`)
  console.log(
    `${'CYC'.padEnd(5)} ${'TRIGGER'.padEnd(20)} ${'GATE'.padEnd(10)} ${'CLOSURE'.padEnd(14)} TITLE`,
  )
  console.log('─'.repeat(70))
  for (const row of summary) {
    console.log(
      `${String(row.cycle).padEnd(5)} ${row.trigger.padEnd(20)} ${row.gate.padEnd(10)} ${row.closure.padEnd(14)} ${row.title.slice(0, 24)}`,
    )
    for (const s of row.stepStatuses) {
      const dur =
        s.durationMs !== undefined
          ? `${(s.durationMs / 1000).toFixed(1)}s`
          : '—'
      console.log(`      ${s.name.padEnd(22)} ${s.status.padEnd(12)} ${dur}`)
    }
  }
  console.log(`${'═'.repeat(70)}\n`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => {
    console.error(e)
    process.exit(1)
  })
}
