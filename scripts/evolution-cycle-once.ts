// pnpm evolve:cycle-once
//
// Runs EXACTLY ONE evolution cycle using the same durable engine as evolve:engine.
// Designed to be invoked as a CHILD PROCESS by evolution-daemon.ts so each cycle
// gets its own heap and the OS reclaims all memory after the child exits.
//
// Exit codes:
//   0 — cycle completed (CLOSED or DISPUTED — "ran" is sufficient)
//   2 — no actionable debt (daemon should long-sleep 4h)
//   1 — error / OOM / unexpected failure
//
// Reads executor from env AGENT_EXECUTOR (default: pty).
// Prints a summary line to stdout before exiting.

import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  CREATE_TABLES_SQL,
  createEngine,
  nanoId,
  runMigrations,
} from '@goatlab/delphi-core'
import {
  EvolutionCycleWorkflow,
  readState,
  startWorker,
} from './evolution-steps.js'
import { createEngineDb, execMultiStatement } from './pglite-db-client.js'

const CYCLE_TIMEOUT_MS = 35 * 60 * 1000 // 35 min

async function main(): Promise<void> {
  const cwd = process.cwd()
  const engineDataDir = resolve(cwd, '.delphi/engine')
  const executor =
    (process.env.AGENT_EXECUTOR as 'pty' | 'headless' | undefined) ?? 'pty'

  console.log(
    `[cycle-once] starting  pid=${process.pid}  executor=${executor}  cwd=${cwd}`,
  )

  mkdirSync(engineDataDir, { recursive: true })

  const { db, close: closeEngineDb } = await createEngineDb(engineDataDir)
  await execMultiStatement(db, CREATE_TABLES_SQL)
  await runMigrations(db)

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

  const stopWorker = await startWorker(engine)

  try {
    const runId = nanoId()
    const cycleNumber = 1

    const { runId: engineRunId } = await engine['evolution-cycle'].start({
      cycle: cycleNumber,
      executor,
      runId,
    })

    console.log(`[cycle-once] engine run started: ${engineRunId}`)

    const startMs = Date.now()
    let finalStatus: any = null

    while (Date.now() - startMs < CYCLE_TIMEOUT_MS) {
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
      const running = ((status.steps as any[]) ?? []).filter(
        (s: any) => s.status === 'RUNNING',
      )
      if (running.length > 0) {
        process.stdout.write(
          `\r[cycle-once] running: ${running.map((s: any) => s.stepName).join(', ')}    `,
        )
      }
    }
    process.stdout.write('\n')

    if (!finalStatus) {
      console.error(
        `[cycle-once] timed out after ${CYCLE_TIMEOUT_MS / 60_000}min`,
      )
      process.exit(1)
    }

    const engineStatus = finalStatus.status as string

    // Check for NO_DEBT
    if (engineStatus === 'FAILED') {
      const steps = ((finalStatus.steps as any[]) ?? []) as any[]
      const scanStep = steps.find((s: any) => s.stepName === 'scan')
      if (scanStep?.error?.includes('NO_DEBT')) {
        console.log('[cycle-once] no actionable debt — exiting 2')
        process.exit(2)
      }
      console.error(
        `[cycle-once] cycle FAILED: ${scanStep?.error ?? 'unknown'}`,
      )
      process.exit(1)
    }

    // COMPLETED or CANCELLED → read final state for summary
    const finalState = readState(cwd, runId)
    const gate = finalState.gateGreenResult
      ? 'GREEN'
      : finalState.disputed
        ? 'DISPUTED'
        : 'RED'
    const closure = finalState.closureStatus ?? 'UNKNOWN'
    const trigger = finalState.trigger ?? 'unknown'
    const title = (finalState.targetTitle ?? '(unknown)').slice(0, 60)

    console.log(
      `[cycle-once] DONE  engine=${engineStatus}  gate=${gate}  closure=${closure}  trigger=${trigger}  title="${title}"`,
    )
    process.exit(0)
  } catch (err) {
    const msg = (err as Error).message ?? String(err)
    console.error(`[cycle-once] fatal error: ${msg}`)
    process.exit(1)
  } finally {
    await stopWorker().catch(() => {})
    await engine.shutdown().catch(() => {})
    await engine.ingestBuffer.shutdown().catch(() => {})
    await closeEngineDb().catch(() => {})
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => {
    console.error('[cycle-once]', e)
    process.exit(1)
  })
}
