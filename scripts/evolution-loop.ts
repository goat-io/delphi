// pnpm evolve:loop [--cycles N] [--dry-run]

import { type SpawnSyncReturns, spawn, spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, writeFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import {
  buildWorkPrompt,
  createTaskFromDebt,
  type DebtItem,
  scanDebt,
} from './evolve.js'

// ── Argument parsing ──────────────────────────────────────────────────────────

export interface LoopArgs {
  cycles: number
  dryRun: boolean
}

export function parseArgs(argv: string[]): LoopArgs {
  let cycles = 3
  let dryRun = false

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--cycles' && argv[i + 1]) {
      const n = Number.parseInt(argv[i + 1] ?? '3', 10)
      cycles = Math.min(Math.max(Number.isNaN(n) ? 3 : n, 1), 5)
      i++
    } else if (argv[i] === '--dry-run') {
      dryRun = true
    }
  }

  return { cycles, dryRun }
}

// ── Git helpers ───────────────────────────────────────────────────────────────

function gitPorcelain(cwd: string): string[] {
  const r = spawnSync('git', ['status', '--porcelain'], {
    cwd,
    encoding: 'utf8',
  })
  return (r.stdout ?? '').split('\n').filter(Boolean)
}

function gitShortHash(cwd: string): string {
  const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd,
    encoding: 'utf8',
  })
  return (r.stdout ?? '').trim()
}

// ── Spawn agent ───────────────────────────────────────────────────────────────

async function spawnAgent(
  cliArgs: string[],
  prompt: string,
  cwd: string,
  timeoutMs: number,
): Promise<{ stdout: string; code: number | null }> {
  return new Promise(resolve_ => {
    const chunks: string[] = []
    const proc = spawn(cliArgs[0] ?? 'claude', cliArgs.slice(1), {
      cwd,
      stdio: ['pipe', 'pipe', 'inherit'],
      env: { ...process.env },
    })

    proc.stdin?.write(prompt)
    proc.stdin?.end()

    proc.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      process.stdout.write(text)
      chunks.push(text)
    })

    const timer = setTimeout(() => {
      proc.kill('SIGTERM')
    }, timeoutMs)

    proc.on('close', code => {
      clearTimeout(timer)
      resolve_({ stdout: chunks.join(''), code })
    })
  })
}

// ── Gate ─────────────────────────────────────────────────────────────────────

function runGate(cwd: string): SpawnSyncReturns<string> {
  return spawnSync(
    'pnpm',
    ['typecheck', '&&', 'pnpm', 'lint:check', '&&', 'pnpm', 'test'],
    { cwd, encoding: 'utf8', shell: true, stdio: 'pipe' },
  )
}

function gateGreen(r: SpawnSyncReturns<string>): boolean {
  return r.status === 0
}

function lastLines(text: string, n: number): string {
  return text.split('\n').slice(-n).join('\n')
}

// ── Rollback ─────────────────────────────────────────────────────────────────

async function rollback(
  cwd: string,
  snapshotPaths: string[],
  currentLines: string[],
): Promise<void> {
  const snapshotSet = new Set(snapshotPaths)

  for (const line of currentLines) {
    if (!line || line.length < 4) {
      continue
    }
    const status = line.slice(0, 2).trim()
    const filePath = line.slice(3).trim()

    if (snapshotSet.has(line)) {
      continue
    }

    if (status === '??' || status === 'A') {
      // Untracked or newly staged: delete
      const abs = resolve(cwd, filePath)
      try {
        await rm(abs, { recursive: true, force: true })
      } catch {
        // ignore
      }
    } else {
      // Modified tracked file: restore
      spawnSync('git', ['restore', '--', filePath], { cwd, encoding: 'utf8' })
    }
  }
}

// ── Evolution log ─────────────────────────────────────────────────────────────

interface CycleRecord {
  cycle: number
  timestamp: string
  taskId: string
  taskTitle: string
  trigger: string
  agentSummary: string
  gateResult: string
  commitHash: string
  closureStatus: string
  healthBefore: string
  healthAfter: string
}

function appendCycleLog(cwd: string, rec: CycleRecord): void {
  const logPath = resolve(cwd, 'evolution.log.md')
  if (!existsSync(logPath)) {
    writeFileSync(
      logPath,
      '# Evolution Log\n\nAutomatically maintained by `pnpm evolve:loop`.\n\n',
    )
  }

  const entry = [
    `## Cycle ${rec.cycle} — ${rec.timestamp}`,
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| Task | ${rec.taskId} — ${rec.taskTitle} |`,
    `| Trigger | ${rec.trigger} |`,
    `| Agent summary | ${rec.agentSummary} |`,
    `| Gate | ${rec.gateResult} |`,
    `| Commit | ${rec.commitHash} |`,
    `| Closure | ${rec.closureStatus} |`,
    `| Health before | ${rec.healthBefore} |`,
    `| Health after | ${rec.healthAfter} |`,
    '',
  ].join('\n')

  appendFileSync(logPath, entry)
}

// ── Health string helper ──────────────────────────────────────────────────────

function healthStr(h: {
  leaves: number
  beliefs: number
  evidence: number
  openQuestions: number
}): string {
  return `leaves=${h.leaves} beliefs=${h.beliefs} evidence=${h.evidence} openQ=${h.openQuestions}`
}

// ── Open / close db ───────────────────────────────────────────────────────────

async function openStore(dataDir: string): Promise<{
  store: BrainStore
  db: { close(): Promise<void>; query: unknown }
}> {
  const db = await createDb({ dataDir })
  await migrate(db)
  const store = new BrainStore(db)
  return {
    store,
    db: db as unknown as { close(): Promise<void>; query: unknown },
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const cwd = process.cwd()
  const dataDir = resolve(cwd, process.env.DELPHI_DATA_DIR ?? '.delphi/brain')

  console.log(
    `\n╔══ Delphi Evolution Loop ═══════════════════════════════════════╗`,
  )
  console.log(
    `║  cycles=${args.cycles}  dry-run=${args.dryRun}  data=${dataDir}`,
  )
  console.log(
    `╚════════════════════════════════════════════════════════════════╝\n`,
  )

  // Verify claude CLI
  const versionCheck = spawnSync('claude', ['--version'], { encoding: 'utf8' })
  if (versionCheck.error || versionCheck.status !== 0) {
    console.error(
      'ERROR: `claude` CLI not found. Install it before running the evolution loop.',
    )
    process.exit(1)
  }
  console.log(`claude CLI: ${(versionCheck.stdout ?? '').trim()}`)

  // Detect --permission-mode flag by probing a small invocation (--help output
  // is truncated at ~8192 bytes in non-TTY mode so we can't rely on it for
  // flags that appear late in the help text; test with acceptEdits instead).
  const permProbe = spawnSync(
    'claude',
    ['--permission-mode', 'acceptEdits', '--version'],
    { encoding: 'utf8' },
  )
  const hasPermissionMode = permProbe.status === 0
  const agentBaseArgs = hasPermissionMode
    ? ['claude', '-p', '--permission-mode', 'acceptEdits', '--model', 'sonnet']
    : ['claude', '-p', '--model', 'sonnet']

  console.log(`Detected flags: ${agentBaseArgs.slice(2).join(' ')}\n`)

  const summary: Array<{
    cycle: number
    trigger: string
    title: string
    gate: string
    closure: string
  }> = []

  for (let cycle = 1; cycle <= args.cycles; cycle++) {
    console.log(
      `\n━━━ Cycle ${cycle}/${args.cycles} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    )

    // 1. Open db, scan debt
    const { store, db } = await openStore(dataDir)

    const brain = await store.getBrainByName('delphi')
    if (!brain) {
      console.error('Brain "delphi" not found. Run pnpm brain:bootstrap first.')
      await (db as { close(): Promise<void> }).close()
      process.exit(1)
    }
    const brainId = brain.id

    const debt = await scanDebt(store, brainId)
    const actionable = debt.filter(d => d.priority >= 20)

    if (actionable.length === 0) {
      console.log('No actionable debt — evolution complete for now.')
      await (db as { close(): Promise<void> }).close()
      break
    }

    const top = actionable[0] as DebtItem
    console.log(
      `Top debt: [${top.trigger}] pri=${top.priority} — ${top.targetTitle}`,
    )

    const healthBefore = await store.health(brainId)
    const healthBeforeStr = healthStr(healthBefore)

    // 2. Create task, build prompt
    const task = await createTaskFromDebt(store, brainId, top)
    const prompt = buildWorkPrompt(top, task)

    // 3. Snapshot git state, close db
    const snapshotLines = gitPorcelain(cwd)
    await (db as { close(): Promise<void> }).close()

    // Dry-run: print prompt and stop
    if (args.dryRun) {
      console.log(`\n${'─'.repeat(70)}`)
      console.log('DRY-RUN — would send this prompt to agent:')
      console.log(`${'─'.repeat(70)}\n`)
      console.log(prompt)
      console.log(`\n${'─'.repeat(70)}`)
      console.log('(no agent executed, no commit made)')
      break
    }

    // 4. Execute agent
    // Build: claude -p "<prompt>" --permission-mode acceptEdits --model sonnet
    const agentSpawnArgs = hasPermissionMode
      ? ['-p', prompt, '--permission-mode', 'acceptEdits', '--model', 'sonnet']
      : ['-p', prompt, '--model', 'sonnet']

    console.log('\nRunning agent...')
    const agentResult = await spawnAgent(
      ['claude', ...agentSpawnArgs],
      '',
      cwd,
      15 * 60 * 1000,
    )

    const agentSummaryLine =
      agentResult.stdout
        .split('\n')
        .reverse()
        .find(l => l.includes('WORK COMPLETE:')) ?? '(no summary)'

    // 5. Gate
    let gateResult = runGate(cwd)
    let gateGreenResult = gateGreen(gateResult)

    if (!gateGreenResult) {
      console.warn('\nGate RED — attempting one fix...')
      const gateOutput = lastLines(
        (gateResult.stdout ?? '') + (gateResult.stderr ?? ''),
        100,
      )
      const fixPrompt = `The verification gate is failing after your changes. Output:\n${gateOutput}\nFix it. Same hard rules apply: never rename/version-bump packages, never touch protected packages, never edit .delphi/, do NOT git commit/push, end with WORK COMPLETE: <summary>.`
      const fixArgs = hasPermissionMode
        ? [
            '-p',
            fixPrompt,
            '--permission-mode',
            'acceptEdits',
            '--model',
            'sonnet',
          ]
        : ['-p', fixPrompt, '--model', 'sonnet']

      await spawnAgent(['claude', ...fixArgs], '', cwd, 15 * 60 * 1000)

      gateResult = runGate(cwd)
      gateGreenResult = gateGreen(gateResult)
    }

    if (!gateGreenResult) {
      console.error('\nGate still RED after fix attempt — rolling back cycle.')
      const currentLines = gitPorcelain(cwd)
      await rollback(cwd, snapshotLines, currentLines)

      // Reopen db, mark task DISPUTED
      const { store: s2, db: db2 } = await openStore(dataDir)
      try {
        await s2.updateLeaf(task.id, {
          status: 'DISPUTED' as 'ACTIVE',
          content: {
            ...((task.content as Record<string, unknown>) ?? {}),
            blocked: 'gate red after fix attempt',
          },
        })
      } finally {
        await (db2 as { close(): Promise<void> }).close()
      }

      summary.push({
        cycle,
        trigger: top.trigger,
        title: top.targetTitle,
        gate: 'RED',
        closure: 'ROLLED BACK',
      })
      continue
    }

    console.log('\nGate GREEN')

    // 6. Commit
    const commitMsg = `evolve(cycle ${cycle}): ${task.title.slice(0, 60)}\n\nTask: ${task.id}\nTrigger: ${top.trigger}\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
    spawnSync('git', ['add', '-A'], { cwd, encoding: 'utf8' })
    spawnSync('git', ['commit', '-m', commitMsg], {
      cwd,
      encoding: 'utf8',
      stdio: 'inherit',
    })
    const commitHash = gitShortHash(cwd)

    // 7. Absorb
    console.log('\nRunning pnpm brain:bootstrap...')
    spawnSync('pnpm', ['brain:bootstrap'], {
      cwd,
      encoding: 'utf8',
      stdio: 'inherit',
      shell: true,
    })

    // 8. Verify closure
    const { store: s3, db: db3 } = await openStore(dataDir)
    let closureMet = false
    let healthAfterStr = healthBeforeStr

    try {
      const freshDebt = await scanDebt(s3, brainId)
      const stillPresent = freshDebt.some(
        d => d.trigger === top.trigger && d.target === top.target,
      )

      // For OPEN_QUESTION also accept: research/ file added in commit
      let researchAdded = false
      if (top.trigger === 'OPEN_QUESTION') {
        const logResult = spawnSync(
          'git',
          ['show', '--name-only', '--format=', 'HEAD'],
          {
            cwd,
            encoding: 'utf8',
          },
        )
        researchAdded = (logResult.stdout ?? '')
          .split('\n')
          .some(f => f.startsWith('research/'))
      }

      closureMet = !stillPresent || researchAdded

      if (closureMet) {
        await s3.updateLeaf(task.id, {
          status: 'ARCHIVED',
          content: {
            ...((task.content as Record<string, unknown>) ?? {}),
            closedAt: new Date().toISOString(),
            evidence: `commit ${commitHash}: ${agentSummaryLine}`,
          },
        })
      } else {
        await s3.updateLeaf(task.id, {
          content: {
            ...((task.content as Record<string, unknown>) ?? {}),
            unverified: true,
          },
        })
      }

      const healthAfter = await s3.health(brainId)
      healthAfterStr = healthStr(healthAfter)
    } finally {
      await (db3 as { close(): Promise<void> }).close()
    }

    const closureStatus = closureMet ? 'CLOSED' : 'UNVERIFIED'
    console.log(`\nClosure: ${closureStatus}`)

    // 9. Write log and second commit
    appendCycleLog(cwd, {
      cycle,
      timestamp: new Date().toISOString(),
      taskId: task.id,
      taskTitle: task.title,
      trigger: top.trigger,
      agentSummary: agentSummaryLine,
      gateResult: 'GREEN',
      commitHash,
      closureStatus,
      healthBefore: healthBeforeStr,
      healthAfter: healthAfterStr,
    })

    spawnSync('git', ['commit', '-am', `evolve(cycle ${cycle}): log`], {
      cwd,
      encoding: 'utf8',
      stdio: 'inherit',
    })

    summary.push({
      cycle,
      trigger: top.trigger,
      title: top.targetTitle,
      gate: 'GREEN',
      closure: closureStatus,
    })
  }

  // Summary table
  console.log(`\n${'═'.repeat(70)}`)
  console.log('EVOLUTION LOOP SUMMARY')
  console.log(`${'═'.repeat(70)}`)
  console.log(
    `${'CYC'.padEnd(5)} ${'TRIGGER'.padEnd(20)} ${'GATE'.padEnd(8)} ${'CLOSURE'.padEnd(12)} TITLE`,
  )
  console.log('─'.repeat(70))
  for (const row of summary) {
    console.log(
      `${String(row.cycle).padEnd(5)} ${row.trigger.padEnd(20)} ${row.gate.padEnd(8)} ${row.closure.padEnd(12)} ${row.title.slice(0, 28)}`,
    )
  }
  console.log(`${'═'.repeat(70)}\n`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
