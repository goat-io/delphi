// pnpm evolve:loop [--cycles N] [--dry-run] [--executor pty|headless]

import { type SpawnSyncReturns, spawn, spawnSync } from 'node:child_process'
import {
  appendFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
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
  executor: 'pty' | 'headless'
}

export function parseArgs(argv: string[]): LoopArgs {
  let cycles = 3
  let dryRun = false
  let executor: 'pty' | 'headless' =
    (process.env.AGENT_EXECUTOR as 'pty' | 'headless' | undefined) ===
    'headless'
      ? 'headless'
      : 'pty'

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--cycles' && argv[i + 1]) {
      const n = Number.parseInt(argv[i + 1] ?? '3', 10)
      cycles = Math.min(Math.max(Number.isNaN(n) ? 3 : n, 1), 5)
      i++
    } else if (argv[i] === '--dry-run') {
      dryRun = true
    } else if (argv[i] === '--executor' && argv[i + 1]) {
      const val = argv[i + 1]
      if (val === 'headless' || val === 'pty') {
        executor = val
      }
      i++
    }
  }

  return { cycles, dryRun, executor }
}

// ── Git helpers ───────────────────────────────────────────────────────────────

export function gitPorcelain(cwd: string): string[] {
  const r = spawnSync('git', ['status', '--porcelain'], {
    cwd,
    encoding: 'utf8',
  })
  return (r.stdout ?? '').split('\n').filter(Boolean)
}

export function gitShortHash(cwd: string): string {
  const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd,
    encoding: 'utf8',
  })
  return (r.stdout ?? '').trim()
}

/** Return names of files added between two commits (uses --diff-filter=A). */
export function gitAddedFiles(
  cwd: string,
  before: string,
  after: string,
): string[] {
  const r = spawnSync(
    'git',
    ['diff', '--name-only', '--diff-filter=A', `${before}..${after}`],
    { cwd, encoding: 'utf8' },
  )
  return (r.stdout ?? '').split('\n').filter(Boolean)
}

// ── Agent executor abstraction ────────────────────────────────────────────────

export interface AgentResult {
  output: string
  ok: boolean
}

/**
 * Headless executor: uses `claude -p` (the existing path).
 * No TTY allocated; usage goes to API quota.
 */
async function runAgentHeadless(
  prompt: string,
  cwd: string,
  hasPermissionMode: boolean,
  timeoutMs: number,
): Promise<AgentResult> {
  const agentSpawnArgs = hasPermissionMode
    ? ['-p', prompt, '--permission-mode', 'acceptEdits', '--model', 'sonnet']
    : ['-p', prompt, '--model', 'sonnet']

  const result = await spawnAgent(
    ['claude', ...agentSpawnArgs],
    '',
    cwd,
    timeoutMs,
  )

  return { output: result.stdout, ok: result.code === 0 }
}

/**
 * Detect PTY failure from spawn output / exit code.
 * Returns a non-empty reason string if the result looks like a PTY failure.
 */
function detectPtyFailure(
  output: string,
  code: number | null,
  sessionFileAppeared: boolean,
): string | null {
  if (
    output.includes('tcgetattr') ||
    output.includes('Operation not supported')
  ) {
    return 'tcgetattr/ioctl not supported (not a real TTY)'
  }
  if (code !== 0 && code !== null) {
    return `script exited with code ${code}`
  }
  if (!sessionFileAppeared) {
    return 'no new session JSONL appeared within 30s'
  }
  if (output.trim() === '') {
    return 'empty output from PTY executor'
  }
  return null
}

/**
 * PTY executor fallback: uses macOS `script -q /dev/null` to allocate a real
 * TTY, then watches the newest session JSONL under
 * ~/.claude/projects/<encoded-cwd>/ for the final assistant message + idle.
 *
 * This is the path taken when claude-pty-wrapper's dist is unavailable.
 * Keeps usage on the Claude subscription (interactive session).
 *
 * On PTY failure (tcgetattr error, bad exit code, no session file, empty
 * output), falls through to the headless executor automatically.
 */
async function runAgentPtyFallback(
  prompt: string,
  cwd: string,
  hasPermissionMode: boolean,
  timeoutMs: number,
): Promise<AgentResult> {
  // Encode cwd the same way Claude does for session directories
  const encodedCwd = cwd.replace(/\//g, '-').replace(/^-/, '')
  const sessionDir = join(homedir(), '.claude', 'projects', encodedCwd)

  // Take a snapshot of existing JSONL files before we start
  let preFiles: string[] = []
  try {
    preFiles = existsSync(sessionDir)
      ? readdirSync(sessionDir)
          .filter(f => f.endsWith('.jsonl'))
          .map(f => join(sessionDir, f))
      : []
  } catch {
    preFiles = []
  }

  const claudeArgs = hasPermissionMode
    ? ['claude', '--permission-mode', 'acceptEdits', '--model', 'sonnet']
    : ['claude', '--model', 'sonnet']

  // script -q /dev/null <claude-bin> [flags] allocates a PTY
  const scriptArgs = ['-q', '/dev/null', ...claudeArgs]

  const ptyResult = await new Promise<{
    output: string
    code: number | null
    sessionFileAppeared: boolean
  }>(resolve_ => {
    const chunks: string[] = []
    const errChunks: string[] = []
    let timedOut = false
    let sessionFileAppeared = false

    const proc = spawn('script', scriptArgs, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    })

    proc.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      process.stdout.write(text)
      chunks.push(text)
    })

    proc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      process.stderr.write(text)
      errChunks.push(text)
    })

    const globalTimer = setTimeout(() => {
      timedOut = true
      proc.kill('SIGTERM')
    }, timeoutMs)

    // Wait a moment for Claude to start and create a session file
    const startupDelay = setTimeout(() => {
      // Send prompt via stdin then wait for /exit
      try {
        proc.stdin?.write(`${prompt}\n`)
      } catch {
        // stdin may already be closed
      }
    }, 2000)

    // Poll for completion: watch for assistant message + idle in JSONL
    let pollInterval: ReturnType<typeof setInterval> | null = null
    let lastAssistantContent = ''
    let idleCount = 0
    const IDLE_POLLS_REQUIRED = 3 // ~9 seconds of no new content

    // Session file watcher: give it 30s to appear
    const SESSION_FILE_DEADLINE = 30_000
    const sessionFileTimer = setTimeout(() => {
      // Will be checked in detectPtyFailure via sessionFileAppeared flag
    }, SESSION_FILE_DEADLINE)

    const checkCompletion = () => {
      // Find the newest JSONL that appeared after our snapshot
      let candidateFiles: string[] = []
      try {
        candidateFiles = existsSync(sessionDir)
          ? readdirSync(sessionDir)
              .filter(f => f.endsWith('.jsonl'))
              .map(f => join(sessionDir, f))
              .filter(f => !preFiles.includes(f))
          : []
      } catch {
        return
      }

      if (candidateFiles.length > 0) {
        sessionFileAppeared = true
      }

      if (candidateFiles.length === 0) {
        return
      }

      // Read the most recently modified one
      const newest = candidateFiles.sort((a, b) => {
        try {
          return statSync(b).mtimeMs - statSync(a).mtimeMs
        } catch {
          return 0
        }
      })[0]

      if (!newest) {
        return
      }

      let jsonlContent = ''
      try {
        jsonlContent = readFileSync(newest, 'utf8')
      } catch {
        return
      }

      // Extract last assistant text block
      const lines = jsonlContent.split('\n').filter(Boolean)
      let lastContent = ''
      for (const line of lines) {
        try {
          const rec = JSON.parse(line)
          if (
            rec?.type === 'assistant' &&
            Array.isArray(rec?.message?.content)
          ) {
            for (const block of rec.message.content) {
              if (block?.type === 'text') {
                lastContent = block.text as string
              }
            }
          }
        } catch {
          // not valid JSON
        }
      }

      if (lastContent && lastContent === lastAssistantContent) {
        idleCount++
        if (idleCount >= IDLE_POLLS_REQUIRED) {
          // Looks done — send /exit
          if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }
          try {
            proc.stdin?.write('/exit\n')
            proc.stdin?.end()
          } catch {
            // stdin already closed
          }
        }
      } else if (lastContent) {
        lastAssistantContent = lastContent
        idleCount = 0
      }
    }

    pollInterval = setInterval(checkCompletion, 3000)

    proc.on('close', code => {
      clearTimeout(globalTimer)
      clearTimeout(startupDelay)
      clearTimeout(sessionFileTimer)
      if (pollInterval) {
        clearInterval(pollInterval)
      }

      if (timedOut) {
        console.warn('[PTY] Agent timed out')
      }

      resolve_({
        output: chunks.join('') + errChunks.join(''),
        code,
        sessionFileAppeared:
          sessionFileAppeared ||
          (() => {
            // Final check at close time
            try {
              return existsSync(sessionDir)
                ? readdirSync(sessionDir)
                    .filter(f => f.endsWith('.jsonl'))
                    .map(f => join(sessionDir, f))
                    .filter(f => !preFiles.includes(f)).length > 0
                : false
            } catch {
              return false
            }
          })(),
      })
    })
  })

  // Check if PTY actually worked
  const ptyFailureReason = detectPtyFailure(
    ptyResult.output,
    ptyResult.code,
    ptyResult.sessionFileAppeared,
  )

  if (ptyFailureReason) {
    console.warn(
      `[executor] PTY unavailable (${ptyFailureReason}) — falling back to headless`,
    )
    return runAgentHeadless(prompt, cwd, hasPermissionMode, timeoutMs)
  }

  return { output: ptyResult.output, ok: ptyResult.code === 0 }
}

/**
 * Top-level agent runner — selects executor based on args.
 * Falls back to headless on PTY runtime error.
 */
export async function runAgent(
  prompt: string,
  opts: {
    executor: 'pty' | 'headless'
    cwd: string
    hasPermissionMode: boolean
    timeoutMs: number
  },
): Promise<AgentResult> {
  if (opts.executor === 'headless') {
    return runAgentHeadless(
      prompt,
      opts.cwd,
      opts.hasPermissionMode,
      opts.timeoutMs,
    )
  }

  // PTY path — runAgentPtyFallback handles its own fallback to headless
  // on any PTY failure (tcgetattr, bad exit code, no session file, empty output).
  try {
    return await runAgentPtyFallback(
      prompt,
      opts.cwd,
      opts.hasPermissionMode,
      opts.timeoutMs,
    )
  } catch (err) {
    console.warn(
      `[PTY] PTY executor threw (${(err as Error).message}) — falling back to headless`,
    )
    return runAgentHeadless(
      prompt,
      opts.cwd,
      opts.hasPermissionMode,
      opts.timeoutMs,
    )
  }
}

// ── Spawn agent (used by headless path) ──────────────────────────────────────

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

export function runGate(cwd: string): SpawnSyncReturns<string> {
  return spawnSync(
    'pnpm',
    ['typecheck', '&&', 'pnpm', 'lint:check', '&&', 'pnpm', 'test'],
    { cwd, encoding: 'utf8', shell: true, stdio: 'pipe' },
  )
}

export function gateGreen(r: SpawnSyncReturns<string>): boolean {
  return r.status === 0
}

export function lastLines(text: string, n: number): string {
  return text.split('\n').slice(-n).join('\n')
}

// ── Rollback ─────────────────────────────────────────────────────────────────

export async function rollback(
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

export interface CycleRecord {
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

export function appendCycleLog(cwd: string, rec: CycleRecord): void {
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

export function healthStr(h: {
  leaves: number
  beliefs: number
  evidence: number
  openQuestions: number
}): string {
  return `leaves=${h.leaves} beliefs=${h.beliefs} evidence=${h.evidence} openQ=${h.openQuestions}`
}

// ── Open / close db ───────────────────────────────────────────────────────────

export async function openStore(dataDir: string): Promise<{
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
    `║  cycles=${args.cycles}  dry-run=${args.dryRun}  executor=${args.executor}  data=${dataDir}`,
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

  // Detect --permission-mode flag
  const permProbe = spawnSync(
    'claude',
    ['--permission-mode', 'acceptEdits', '--version'],
    { encoding: 'utf8' },
  )
  const hasPermissionMode = permProbe.status === 0

  console.log(
    `Executor: ${args.executor}  permission-mode: ${hasPermissionMode}\n`,
  )

  // Anti-livelock: track task ids dispatched this run
  const dispatchedTaskIds = new Set<string>()

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

    // Anti-livelock: find the first debt item that is not already dispatched /
    // not stuck as unverified
    let chosenDebt: DebtItem | undefined
    let chosenTask: Awaited<ReturnType<typeof createTaskFromDebt>> | undefined

    for (const candidate of actionable) {
      const t = await createTaskFromDebt(store, brainId, candidate)
      const isAlreadyDispatched = dispatchedTaskIds.has(t.id)
      const isUnverified =
        (t.content as Record<string, unknown> | undefined)?.unverified === true

      if (isAlreadyDispatched || isUnverified) {
        console.log(
          `Skipping [${candidate.trigger}] "${candidate.targetTitle}" — already dispatched or unverified (anti-livelock)`,
        )
        continue
      }

      chosenDebt = candidate
      chosenTask = t
      break
    }

    if (!chosenDebt || !chosenTask) {
      console.log(
        'No actionable debt remains after livelock check — ending loop.',
      )
      await (db as { close(): Promise<void> }).close()
      break
    }

    const top = chosenDebt
    const task = chosenTask

    console.log(
      `Top debt: [${top.trigger}] pri=${top.priority} — ${top.targetTitle}`,
    )

    const healthBefore = await store.health(brainId)
    const healthBeforeStr = healthStr(healthBefore)

    // 2. Build prompt
    const prompt = buildWorkPrompt(top, task)

    // 3. Snapshot git state, close db
    const snapshotLines = gitPorcelain(cwd)
    const preCommitHash = gitShortHash(cwd)
    await (db as { close(): Promise<void> }).close()

    // Dry-run: print prompt and stop
    if (args.dryRun) {
      console.log(`\n${'─'.repeat(70)}`)
      console.log('DRY-RUN — would send this prompt to agent:')
      console.log(`${'─'.repeat(70)}\n`)
      console.log(prompt)
      console.log(`\n${'─'.repeat(70)}`)
      console.log('(no agent executed, no commit made)')
      console.log(`Executor that would be used: ${args.executor}`)
      break
    }

    // 4. Execute agent
    console.log(`\nRunning agent (executor=${args.executor})...`)
    dispatchedTaskIds.add(task.id)

    const agentResult = await runAgent(prompt, {
      executor: args.executor,
      cwd,
      hasPermissionMode,
      timeoutMs: 15 * 60 * 1000,
    })

    const agentSummaryLine =
      agentResult.output
        .split('\n')
        .reverse()
        .find(l => l.includes('WORK COMPLETE:')) ?? '(no summary)'

    // 4b. Empty-cycle guard: if no files changed AND no WORK COMPLETE marker,
    //     the agent produced no work — mark DISPUTED and skip gate + commit.
    const postAgentLines = gitPorcelain(cwd)
    const changedFiles = postAgentLines.filter(l => !snapshotLines.includes(l))
    const hasWorkComplete = agentResult.output.includes('WORK COMPLETE')

    if (changedFiles.length === 0 && !hasWorkComplete) {
      console.warn(
        '\n[empty-cycle guard] Agent produced no file changes and no WORK COMPLETE marker.',
      )
      const { store: sDisp, db: dbDisp } = await openStore(dataDir)
      try {
        await sDisp.updateLeaf(task.id, {
          status: 'DISPUTED' as 'ACTIVE',
          content: {
            ...((task.content as Record<string, unknown>) ?? {}),
            blocked: 'agent produced no work',
          },
        })
      } finally {
        await (dbDisp as { close(): Promise<void> }).close()
      }

      appendCycleLog(cwd, {
        cycle,
        timestamp: new Date().toISOString(),
        taskId: task.id,
        taskTitle: task.title,
        trigger: top.trigger,
        agentSummary: '(no work produced — empty cycle)',
        gateResult: 'SKIPPED',
        commitHash: preCommitHash,
        closureStatus: 'DISPUTED',
        healthBefore: healthBeforeStr,
        healthAfter: healthBeforeStr,
      })

      summary.push({
        cycle,
        trigger: top.trigger,
        title: top.targetTitle,
        gate: 'SKIPPED',
        closure: 'DISPUTED',
      })
      continue
    }

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

      await runAgent(fixPrompt, {
        executor: args.executor,
        cwd,
        hasPermissionMode,
        timeoutMs: 15 * 60 * 1000,
      })

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

      // For OPEN_QUESTION: accept if research/ file added in commit
      let researchAdded = false
      if (top.trigger === 'OPEN_QUESTION') {
        const addedFiles = gitAddedFiles(cwd, preCommitHash, commitHash)
        researchAdded = addedFiles.some(f => f.startsWith('research/'))
      }

      // For SPEC_GAP: accept if any rfcs/RFC-*.md was added in commit
      // (drafting an RFC doesn't remove the triggering leaf, so re-scan
      // will always show the debt item — mirror the OPEN_QUESTION mechanism)
      let rfcAdded = false
      if (top.trigger === 'SPEC_GAP') {
        const addedFiles = gitAddedFiles(cwd, preCommitHash, commitHash)
        rfcAdded = addedFiles.some(
          f => f.startsWith('rfcs/RFC-') && f.endsWith('.md'),
        )
      }

      closureMet = !stillPresent || researchAdded || rfcAdded

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

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => {
    console.error(e)
    process.exit(1)
  })
}
