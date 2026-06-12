// pnpm evolve:daemon
//
// Continuous autonomous evolution: each tick runs ONE evolution cycle via the
// same in-process flow as evolve:engine (EvolutionCycleWorkflow), then sleeps
// EVOLVE_INTERVAL_MIN minutes (default 30).
//
// Budgets (RFC-0028 spirit):
//   EVOLVE_MAX_CYCLES_PER_DAY  — default 12; when exhausted sleep until next UTC day.
//   EVOLVE_INTERVAL_MIN        — default 30; minutes between ticks.
//
// Stop conditions:
//   SIGINT / SIGTERM           — graceful (finish current cycle, then exit).
//   "no actionable debt"       — sleep long interval (4h), then try again.
//
// Each tick outcome + heartbeat is appended to evolution.log.md.

import { spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
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
import { createEngineDb, execMultiStatement } from './pglite-db-client.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const INTERVAL_MIN = Number(process.env.EVOLVE_INTERVAL_MIN ?? '30')
const MAX_CYCLES_PER_DAY = Number(process.env.EVOLVE_MAX_CYCLES_PER_DAY ?? '12')
const LONG_SLEEP_MIN = 4 * 60 // 4 hours when no actionable debt
const INTERVAL_MS = INTERVAL_MIN * 60 * 1000
const LONG_SLEEP_MS = LONG_SLEEP_MIN * 60 * 1000

// ── Heartbeat / log helpers ───────────────────────────────────────────────────

function appendDaemonLog(cwd: string, line: string): void {
  const logPath = resolve(cwd, 'evolution.log.md')
  if (!existsSync(logPath)) {
    writeFileSync(
      logPath,
      '# Evolution Log\n\nAutomatically maintained by `pnpm evolve:loop`.\n\n',
    )
  }
  const ts = new Date().toISOString()
  appendFileSync(logPath, `<!-- daemon ${ts} ${line} -->\n`)
  console.log(`[daemon] ${ts} ${line}`)
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

function msUntilNextUtcDay(): number {
  const now = new Date()
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  )
  return tomorrow.getTime() - now.getTime()
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────

let shuttingDown = false

process.on('SIGINT', () => {
  console.log('\n[daemon] SIGINT received — will stop after current cycle.')
  shuttingDown = true
})
process.on('SIGTERM', () => {
  console.log('\n[daemon] SIGTERM received — will stop after current cycle.')
  shuttingDown = true
})

// ── Sleep helper (respects shuttingDown) ─────────────────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve_ => {
    const chunkMs = 1000
    let remaining = ms
    const tick = (): void => {
      if (shuttingDown || remaining <= 0) {
        resolve_()
        return
      }
      remaining -= chunkMs
      setTimeout(tick, Math.min(chunkMs, remaining + chunkMs))
    }
    setTimeout(tick, Math.min(chunkMs, ms))
  })
}

// ── Run one cycle via the engine ──────────────────────────────────────────────

async function runOneCycle(opts: {
  cwd: string
  executor: 'pty' | 'headless'
  cycleNumber: number
  engineDataDir: string
}): Promise<'NO_DEBT' | 'COMPLETED' | 'FAILED'> {
  const { cwd, executor, cycleNumber, engineDataDir } = opts

  console.log(`\n[daemon] ── Tick ${cycleNumber} ─────────────────────────────`)

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

  let outcome: 'NO_DEBT' | 'COMPLETED' | 'FAILED' = 'FAILED'

  try {
    const runId = nanoId()
    process.env.AGENT_EXECUTOR = executor

    const { runId: engineRunId } = await engine['evolution-cycle'].start({
      cycle: cycleNumber,
      executor,
      runId,
    })

    console.log(`[daemon] engine run started: ${engineRunId}`)

    const timeoutMs = 35 * 60 * 1000
    const startMs = Date.now()
    let finalStatus: any = null

    while (Date.now() - startMs < timeoutMs) {
      if (shuttingDown) {
        break
      }
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
        s => s.status === 'RUNNING',
      )
      if (running.length > 0) {
        process.stdout.write(
          `\r[daemon] running: ${running.map((s: any) => s.stepName).join(', ')}    `,
        )
      }
    }
    process.stdout.write('\n')

    if (!finalStatus) {
      console.error(`[daemon] run ${engineRunId} timed out`)
      outcome = 'FAILED'
    } else {
      const finalState = readState(cwd, runId)
      const engineStatus = finalStatus.status as string

      if (engineStatus === 'FAILED') {
        // Check if it's a NO_DEBT error
        const steps = ((finalStatus.steps as any[]) ?? []) as any[]
        const scanStep = steps.find((s: any) => s.stepName === 'scan')
        if (scanStep?.error?.includes('NO_DEBT')) {
          outcome = 'NO_DEBT'
        } else {
          outcome = 'FAILED'
        }
      } else {
        outcome = 'COMPLETED'
      }

      const gate = finalState.gateGreenResult
        ? 'GREEN'
        : finalState.disputed
          ? 'DISPUTED'
          : 'UNKNOWN'
      const closure = finalState.closureStatus ?? 'UNKNOWN'
      const trigger = finalState.trigger ?? 'unknown'
      appendDaemonLog(
        cwd,
        `tick=${cycleNumber} engine=${engineStatus} gate=${gate} closure=${closure} trigger=${trigger} outcome=${outcome}`,
      )
    }
  } catch (err) {
    const msg = (err as Error).message ?? String(err)
    console.error(`[daemon] cycle error: ${msg}`)
    appendDaemonLog(cwd, `tick=${cycleNumber} ERROR: ${msg}`)
    outcome = 'FAILED'
  } finally {
    await stopWorker().catch(() => {})
    await engine.shutdown().catch(() => {})
    await engine.ingestBuffer.shutdown().catch(() => {})
    await closeEngineDb().catch(() => {})
  }

  return outcome
}

// ── Main daemon loop ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const cwd = process.cwd()
  const engineDataDir = resolve(cwd, '.delphi/engine')
  const executor = args.executor

  // Verify claude CLI
  const versionCheck = spawnSync('claude', ['--version'], { encoding: 'utf8' })
  if (versionCheck.error || versionCheck.status !== 0) {
    console.error('[daemon] ERROR: `claude` CLI not found.')
    process.exit(1)
  }

  console.log(
    `\n╔══ Delphi Evolution Daemon ══════════════════════════════════╗`,
  )
  console.log(
    `║  interval=${INTERVAL_MIN}min  maxPerDay=${MAX_CYCLES_PER_DAY}  executor=${executor}`,
  )
  console.log(
    `╚═════════════════════════════════════════════════════════════╝\n`,
  )

  appendDaemonLog(
    cwd,
    `daemon starting interval=${INTERVAL_MIN}min maxPerDay=${MAX_CYCLES_PER_DAY}`,
  )

  // Per-day budget tracking
  let currentDay = todayUtc()
  let cyclesThisDay = 0
  let globalCycle = 0

  while (!shuttingDown) {
    // Day rollover check
    const today = todayUtc()
    if (today !== currentDay) {
      currentDay = today
      cyclesThisDay = 0
      appendDaemonLog(cwd, `day rollover → new day ${today} budget reset`)
    }

    // Budget exhausted: sleep until next UTC day
    if (cyclesThisDay >= MAX_CYCLES_PER_DAY) {
      const waitMs = msUntilNextUtcDay()
      appendDaemonLog(
        cwd,
        `budget exhausted (${cyclesThisDay}/${MAX_CYCLES_PER_DAY}) — sleeping ${Math.round(waitMs / 60_000)}min until next UTC day`,
      )
      await sleep(waitMs)
      continue
    }

    globalCycle++
    cyclesThisDay++

    const outcome = await runOneCycle({
      cwd,
      executor,
      cycleNumber: globalCycle,
      engineDataDir,
    })

    if (shuttingDown) {
      break
    }

    if (outcome === 'NO_DEBT') {
      appendDaemonLog(cwd, `no actionable debt — sleeping ${LONG_SLEEP_MIN}min`)
      await sleep(LONG_SLEEP_MS)
    } else {
      appendDaemonLog(cwd, `sleeping ${INTERVAL_MIN}min until next tick`)
      await sleep(INTERVAL_MS)
    }
  }

  appendDaemonLog(cwd, 'daemon stopped gracefully')
  console.log('[daemon] Stopped.')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => {
    console.error('[daemon]', e)
    process.exit(1)
  })
}
