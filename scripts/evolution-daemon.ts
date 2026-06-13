// pnpm evolve:daemon
//
// Continuous autonomous evolution: each tick spawns evolution-cycle-once.ts as
// a SEPARATE CHILD PROCESS via `pnpm evolve:cycle-once`, so each cycle gets its
// own heap and the OS reclaims all memory on exit. A cycle OOM (SIGKILL/exit 137)
// kills only the child — the daemon stays alive.
//
// Budgets (RFC-0028 spirit):
//   EVOLVE_MAX_CYCLES_PER_DAY  — default 12; when exhausted sleep until next UTC day.
//   EVOLVE_INTERVAL_MIN        — default 30; minutes between ticks.
//
// Stop conditions:
//   SIGINT / SIGTERM           — graceful (finish current cycle wait, then exit).
//   "no actionable debt"       — sleep long interval (4h), then try again.
//   3 consecutive failures     — daemon logs and exits non-zero (avoids crash loop).
//
// Child exit codes (from evolution-cycle-once.ts):
//   0   — cycle ran ok
//   2   — no actionable debt
//   1   — error
//   137 — OOM / SIGKILL
//   134 — SIGABRT (assertion / OOM)
//
// Each tick outcome + heartbeat is appended to evolution.log.md.

import { spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ── Constants ─────────────────────────────────────────────────────────────────

const INTERVAL_MIN = Number(process.env.EVOLVE_INTERVAL_MIN ?? '30')
const MAX_CYCLES_PER_DAY = Number(process.env.EVOLVE_MAX_CYCLES_PER_DAY ?? '12')
const LONG_SLEEP_MIN = 4 * 60 // 4 hours when no actionable debt
const INTERVAL_MS = INTERVAL_MIN * 60 * 1000
const LONG_SLEEP_MS = LONG_SLEEP_MIN * 60 * 1000
const MAX_CONSECUTIVE_FAILURES = 3

// Child heap cap: 6 GB so OOM kills the child (not daemon) on large brains
const CHILD_NODE_OPTIONS = '--max-old-space-size=6144'

// ── Heartbeat / log helpers ───────────────────────────────────────────────────

function appendDaemonLog(cwd: string, line: string): void {
  const logPath = resolve(cwd, 'evolution.log.md')
  if (!existsSync(logPath)) {
    writeFileSync(
      logPath,
      '# Evolution Log\n\nAutomatically maintained by `pnpm evolve:daemon`.\n\n',
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

// ── Run one cycle as a child process ─────────────────────────────────────────

type CycleOutcome = 'COMPLETED' | 'NO_DEBT' | 'FAILED'

function runOneCycle(opts: { cwd: string; cycleNumber: number }): CycleOutcome {
  const { cwd, cycleNumber } = opts

  console.log(`\n[daemon] ── Tick ${cycleNumber} ─────────────────────────────`)
  console.log(`[daemon] spawning evolution-cycle-once (child process)`)

  const result = spawnSync('pnpm', ['evolve:cycle-once'], {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: CHILD_NODE_OPTIONS,
    },
  })

  const exitCode = result.status ?? 1

  if (result.error) {
    console.error(`[daemon] spawn error: ${result.error.message}`)
    return 'FAILED'
  }

  if (exitCode === 0) {
    return 'COMPLETED'
  }

  if (exitCode === 2) {
    return 'NO_DEBT'
  }

  // 1 = generic error, 137 = SIGKILL/OOM, 134 = SIGABRT
  console.error(
    `[daemon] child exited with code ${exitCode} (OOM/error) on tick ${cycleNumber}`,
  )
  return 'FAILED'
}

// ── Main daemon loop ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const cwd = process.cwd()

  // Verify pnpm / evolve:cycle-once script exists (early failure)
  const versionCheck = spawnSync('pnpm', ['--version'], { encoding: 'utf8' })
  if (versionCheck.error || versionCheck.status !== 0) {
    console.error('[daemon] ERROR: `pnpm` not found.')
    process.exit(1)
  }

  // Read executor from env (passed through to child via process.env)
  const executor =
    (process.env.AGENT_EXECUTOR as string | undefined) ?? 'headless'

  console.log(
    `\n╔══ Delphi Evolution Daemon ══════════════════════════════════╗`,
  )
  console.log(
    `║  interval=${INTERVAL_MIN}min  maxPerDay=${MAX_CYCLES_PER_DAY}  executor=${executor}  childHeap=6GB`,
  )
  console.log(
    `╚═════════════════════════════════════════════════════════════╝\n`,
  )

  appendDaemonLog(
    cwd,
    `daemon starting interval=${INTERVAL_MIN}min maxPerDay=${MAX_CYCLES_PER_DAY} executor=${executor}`,
  )

  // Per-day budget tracking
  let currentDay = todayUtc()
  let cyclesThisDay = 0
  let globalCycle = 0
  let consecutiveFailures = 0

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

    const outcome = runOneCycle({
      cwd,
      cycleNumber: globalCycle,
    })

    if (shuttingDown) {
      break
    }

    appendDaemonLog(cwd, `tick=${globalCycle} outcome=${outcome}`)

    if (outcome === 'FAILED') {
      consecutiveFailures++
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        appendDaemonLog(
          cwd,
          `halting: ${MAX_CONSECUTIVE_FAILURES} consecutive cycle failures`,
        )
        console.error(
          `[daemon] Halting after ${MAX_CONSECUTIVE_FAILURES} consecutive failures.`,
        )
        process.exit(1)
      }
      // Continue to next tick after short sleep (normal interval)
      appendDaemonLog(
        cwd,
        `consecutive failures=${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES} — sleeping ${INTERVAL_MIN}min`,
      )
      await sleep(INTERVAL_MS)
    } else if (outcome === 'NO_DEBT') {
      consecutiveFailures = 0
      appendDaemonLog(cwd, `no actionable debt — sleeping ${LONG_SLEEP_MIN}min`)
      await sleep(LONG_SLEEP_MS)
    } else {
      consecutiveFailures = 0
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
