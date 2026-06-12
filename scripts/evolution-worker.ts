// pnpm evolve:worker
//
// Standalone remote worker process for the evolution-cycle workflow.
//
// Connects to the engine's Postgres (or PGlite-socket) DB, registers the
// evolution-cycle step handlers, and runs PgConnector's poll loop, claiming
// work via FOR UPDATE SKIP LOCKED.
//
// Required env:
//   ENGINE_URL  — connection string for the engine DB
//                 e.g. postgres://localhost:5444/delphi  (pglite-socket)
//                      postgres://user:pw@host:5432/mydb (real Postgres)
//
// Optional env:
//   AGENT_EXECUTOR   — pty | headless (default: headless)
//   DELPHI_DATA_DIR  — brain data dir (default: .delphi/brain)
//
// This process exits cleanly on SIGTERM / SIGINT.

import {
  CREATE_TABLES_SQL,
  createEngine,
  runMigrations,
} from '@goatlab/delphi-core'
import { EvolutionCycleWorkflow, startWorker } from './evolution-steps.js'
import { execMultiStatement } from './pglite-db-client.js'

async function main(): Promise<void> {
  const engineUrl = process.env.ENGINE_URL ?? 'postgres://localhost:5444/delphi'

  const executor =
    (process.env.AGENT_EXECUTOR as 'pty' | 'headless' | undefined) ?? 'headless'
  process.env.AGENT_EXECUTOR = executor

  console.log(
    `\n╔══ Delphi Evolution Worker ══════════════════════════════════════╗`,
  )
  console.log(`║  pid=${process.pid}  executor=${executor}`)
  console.log(`║  ENGINE_URL=${engineUrl}`)
  console.log(
    `╚═════════════════════════════════════════════════════════════════╝\n`,
  )

  // Connect to the engine DB via standard pg pool (works with both
  // real Postgres and pglite-socket which speaks the PG wire protocol).
  const { Pool } = await import('pg')
  // max: 1 — pglite-socket serialises connections; one is sufficient for
  // pure polling (no LISTEN/NOTIFY). Keeps the socket slot predictable.
  const pool = new Pool({ connectionString: engineUrl, max: 1 })

  // Verify connectivity before proceeding
  let retries = 0
  while (retries < 15) {
    try {
      const client = await pool.connect()
      const { rows } = await client.query('SELECT 1 AS ok')
      client.release()
      console.log(
        `[worker] Connected to engine DB (${rows[0]?.ok === 1 || rows[0]?.ok === '1' ? 'ok' : 'unexpected'}). Retries: ${retries}`,
      )
      break
    } catch (err: any) {
      retries++
      if (retries >= 15) {
        console.error(
          `[worker] Cannot connect to ENGINE_URL after ${retries} attempts:`,
          err.message,
        )
        process.exit(1)
      }
      console.warn(
        `[worker] Waiting for engine DB... (attempt ${retries}/15): ${err.message}`,
      )
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  // Build a DbClient from the pg pool.
  // We deliberately hide the pool from getPool() so PgConnector
  // falls back to polling instead of trying to establish a LISTEN/NOTIFY
  // connection (which would require a second persistent socket to pglite-socket,
  // which only accepts one connection at a time).
  const { createDbClient } = await import('@goatlab/delphi-core')
  const pgBackedClient = createDbClient(pool)
  const db = {
    query: pgBackedClient.query.bind(pgBackedClient),
    getPool: () => undefined as any, // disables LISTEN/NOTIFY → pure polling
    transaction: pgBackedClient.transaction.bind(pgBackedClient),
    destroy: pgBackedClient.destroy.bind(pgBackedClient),
  }

  // Ensure schema exists (idempotent — swallows already-exists errors)
  await execMultiStatement(db, CREATE_TABLES_SQL)
  await runMigrations(db)

  // Build a typed engine — same workflow registration as the server,
  // but this process does NOT enqueue work; it only claims and executes steps.
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

  console.log(`[worker] pid=${process.pid} starting poll loop...`)
  const stopWorker = await startWorker(engine)

  // Handle graceful shutdown
  let stopping = false
  const shutdown = async (signal: string) => {
    if (stopping) {
      return
    }
    stopping = true
    console.log(`\n[worker] Received ${signal}, shutting down gracefully...`)
    try {
      await stopWorker()
    } catch {
      /* ignore */
    }
    try {
      await engine.shutdown()
    } catch {
      /* ignore */
    }
    try {
      await engine.ingestBuffer.shutdown()
    } catch {
      /* ignore */
    }
    try {
      await db.destroy?.()
    } catch {
      /* ignore */
    }
    try {
      await pool.end()
    } catch {
      /* ignore */
    }
    console.log(`[worker] pid=${process.pid} stopped.`)
    process.exit(0)
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))

  console.log(
    `[worker] pid=${process.pid} Ready — polling for evolution-cycle steps.`,
  )
  console.log(`[worker] Send SIGTERM or Ctrl-C to stop.\n`)

  // Keep alive — the poller runs on its own internal loop
  await new Promise<void>(resolve => {
    // Will be interrupted by shutdown signals
    process.on('exit', resolve)
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => {
    console.error(e)
    process.exit(1)
  })
}
