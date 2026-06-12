// pnpm evolve:engine [--cycles N] [--executor pty|headless]
//
// Evolution loop running on @goatlab/delphi-core (the durable Postgres
// workflow engine). Each knowledge-debt cycle is a persisted workflow run
// with steps: scan → create-task → run-agent → gate → commit → absorb →
// verify-closure → log.
//
// Engine state lives in .delphi/engine (embedded PGlite — no live Postgres).
// Brain state lives in .delphi/brain (existing PGlite instance, opened/closed
// inside steps as the existing loop does).
//
// Steps communicate through a shared JSON file written to .delphi/engine-cycle-{runId}.json
// (ephemeral — written in scan, read/updated in subsequent steps, deleted on log).
// This avoids the complex mapInput chain while still persisting each step's work.

import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { StepExecutionContext } from '@goatlab/delphi-core'
import {
  CREATE_TABLES_SQL,
  createEngine,
  FunctionStep,
  runMigrations,
  step,
  Workflow,
} from '@goatlab/delphi-core'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import {
  appendCycleLog,
  gateGreen,
  gitAddedFiles,
  gitPorcelain,
  gitShortHash,
  healthStr,
  lastLines,
  parseArgs,
  rollback,
  runAgent,
  runGate,
} from './evolution-loop.js'
import { buildWorkPrompt, createTaskFromDebt, scanDebt } from './evolve.js'
import { createEngineDb, execMultiStatement } from './pglite-db-client.js'

// ── Trigger input (what we pass to engine.start()) ────────────────────────────

interface CycleTrigger {
  readonly cycle: number
  readonly executor: string
  readonly runId: string // pre-generated so steps can find the shared state file
}

// ── Shared cycle state (written to .delphi/engine-cycle-{runId}.json) ─────────

interface CycleState {
  // Written by scan
  trigger?: string
  target?: string
  targetTitle?: string
  detail?: string
  priority?: number
  taskId?: string
  taskTitle?: string
  // Written by create-task
  snapshotLines?: string[]
  preCommitHash?: string
  prompt?: string
  healthBeforeStr?: string
  // Written by run-agent
  agentOk?: boolean
  agentSummaryLine?: string
  changedFiles?: string[]
  hasWorkComplete?: boolean
  // Written by gate
  gateGreenResult?: boolean
  gateOutput?: string
  disputed?: boolean
  // Written by commit
  commitHash?: string
  committed?: boolean
  // Written by absorb
  absorbed?: boolean
  // Written by verify-closure
  closureStatus?: string
  healthAfterStr?: string
}

function stateFile(cwd: string, runId: string): string {
  return resolve(cwd, `.delphi/engine-cycle-${runId}.json`)
}

function readState(cwd: string, runId: string): CycleState {
  try {
    return JSON.parse(readFileSync(stateFile(cwd, runId), 'utf8'))
  } catch {
    return {}
  }
}

function writeState(cwd: string, runId: string, patch: CycleState): CycleState {
  const existing = readState(cwd, runId)
  const next = { ...existing, ...patch }
  writeFileSync(stateFile(cwd, runId), JSON.stringify(next, null, 2))
  return next
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function markTaskDisputed(taskId: string, reason: string): Promise<void> {
  const cwd = process.cwd()
  const dataDir = resolve(cwd, process.env.DELPHI_DATA_DIR ?? '.delphi/brain')
  const db = await createDb({ dataDir })
  await migrate(db)
  const store = new BrainStore(db)
  try {
    const existing = await store.getLeaf(taskId)
    if (existing) {
      await store.updateLeaf(taskId, {
        status: 'DISPUTED' as any,
        content: { ...(existing.content ?? {}), blocked: reason },
      })
    }
  } finally {
    await db.close()
  }
}

// ── Step base: CycleTrigger → DoneJsonObject ─────────────────────────────────
// All steps take the same trigger input and output { done, runId, cycle }.
// runId and cycle are propagated through the output chain so every step
// can locate the shared state file.
// Real inter-step data flows through the shared state file (.delphi/engine-cycle-{runId}.json).

type TriggerJsonObject = { [x: string]: any } & CycleTrigger
// Each step output carries runId+cycle forward so downstream steps can read state
type DoneJsonObject = { [x: string]: any } & {
  done: boolean
  runId: string
  cycle: number
}

function doneOutput(runId: string, cycle: number): { output: DoneJsonObject } {
  return { output: { done: true, runId, cycle } as DoneJsonObject }
}

// ── Step 1: scan ─────────────────────────────────────────────────────────────

class ScanStep extends FunctionStep<TriggerJsonObject, DoneJsonObject> {
  readonly stepName = 'scan' as const
  override retries = 0

  async handle(input: TriggerJsonObject, _ctx: StepExecutionContext) {
    const cwd = process.cwd()
    const dataDir = resolve(cwd, process.env.DELPHI_DATA_DIR ?? '.delphi/brain')
    const db = await createDb({ dataDir })
    await migrate(db)
    const store = new BrainStore(db)
    try {
      const brain = await store.getBrainByName('delphi')
      if (!brain) {
        throw new Error(
          'Brain "delphi" not found. Run pnpm brain:bootstrap first.',
        )
      }
      const brainId = brain.id
      const debtItems = await scanDebt(store, brainId)
      const actionable = debtItems.filter(d => d.priority >= 20)
      if (actionable.length === 0) {
        throw new Error('NO_DEBT: No actionable knowledge debt.')
      }
      const top = actionable[0]!
      const task = await createTaskFromDebt(store, brainId, top)
      writeState(cwd, input.runId, {
        trigger: top.trigger,
        target: top.target,
        targetTitle: top.targetTitle,
        detail: top.detail,
        priority: top.priority,
        taskId: task.id,
        taskTitle: task.title,
      })
      console.log(
        `[scan] debt=[${top.trigger}] pri=${top.priority} "${top.targetTitle}"`,
      )
      return doneOutput(input.runId, input.cycle)
    } finally {
      await db.close()
    }
  }
}

// ── Step 2: create-task ───────────────────────────────────────────────────────

class PrepareStep extends FunctionStep<DoneJsonObject, DoneJsonObject> {
  readonly stepName = 'create-task' as const
  override retries = 0

  async handle(input: DoneJsonObject, _ctx: StepExecutionContext) {
    const cwd = process.cwd()
    const runId = input.runId
    const state = readState(cwd, runId)
    const dataDir = resolve(cwd, process.env.DELPHI_DATA_DIR ?? '.delphi/brain')
    const db = await createDb({ dataDir })
    await migrate(db)
    const store = new BrainStore(db)
    try {
      const brain = await store.getBrainByName('delphi')
      if (!brain) {
        throw new Error('Brain "delphi" not found.')
      }
      const brainId = brain.id
      const task = await store.getLeaf(state.taskId!)
      if (!task) {
        throw new Error(`Task ${state.taskId} not found`)
      }
      const healthBefore = await store.health(brainId)
      const prompt = buildWorkPrompt(
        {
          trigger: state.trigger as any,
          target: state.target!,
          targetTitle: state.targetTitle!,
          detail: state.detail!,
          priority: state.priority!,
        },
        task,
      )
      writeState(cwd, runId, {
        snapshotLines: gitPorcelain(cwd),
        preCommitHash: gitShortHash(cwd),
        prompt,
        healthBeforeStr: healthStr(healthBefore),
      })
      console.log(`[create-task] Task: ${state.taskId} — ${state.taskTitle}`)
      return doneOutput(runId, input.cycle)
    } finally {
      await db.close()
    }
  }
}

// ── Step 3: run-agent ─────────────────────────────────────────────────────────

class RunAgentStep extends FunctionStep<DoneJsonObject, DoneJsonObject> {
  readonly stepName = 'run-agent' as const
  override retries = 0

  async handle(input: DoneJsonObject, _ctx: StepExecutionContext) {
    const cwd = process.cwd()
    const runId = input.runId
    const state = readState(cwd, runId)
    const permProbe = spawnSync(
      'claude',
      ['--permission-mode', 'acceptEdits', '--version'],
      { encoding: 'utf8' },
    )
    const hasPermissionMode = permProbe.status === 0
    const executor =
      (process.env.AGENT_EXECUTOR as 'pty' | 'headless' | undefined) ??
      'headless'
    console.log(
      `[run-agent] executor=${executor} permission-mode=${hasPermissionMode}`,
    )

    const agentResult = await runAgent(state.prompt!, {
      executor,
      cwd,
      hasPermissionMode,
      timeoutMs: 15 * 60 * 1000,
    })

    const agentSummaryLine =
      agentResult.output
        .split('\n')
        .reverse()
        .find(l => l.includes('WORK COMPLETE:')) ?? '(no summary)'

    const postAgentLines = gitPorcelain(cwd)
    const changedFiles = postAgentLines.filter(
      l => !(state.snapshotLines ?? []).includes(l),
    )
    const hasWorkComplete = agentResult.output.includes('WORK COMPLETE')

    writeState(cwd, runId, {
      agentOk: agentResult.ok,
      agentSummaryLine,
      changedFiles,
      hasWorkComplete,
    })
    console.log(
      `[run-agent] ok=${agentResult.ok} changed=${changedFiles.length} workComplete=${hasWorkComplete}`,
    )
    console.log(`[run-agent] ${agentSummaryLine}`)
    return doneOutput(runId, input.cycle)
  }
}

// ── Step 4: gate ──────────────────────────────────────────────────────────────

class GateStep extends FunctionStep<DoneJsonObject, DoneJsonObject> {
  readonly stepName = 'gate' as const
  override retries = 0

  async handle(input: DoneJsonObject, _ctx: StepExecutionContext) {
    const cwd = process.cwd()
    const runId = input.runId
    const state = readState(cwd, runId)

    if ((state.changedFiles ?? []).length === 0 && !state.hasWorkComplete) {
      console.warn(
        '[gate] Empty cycle — agent produced no file changes and no WORK COMPLETE.',
      )
      await markTaskDisputed(state.taskId!, 'agent produced no work')
      writeState(cwd, runId, {
        gateGreenResult: false,
        gateOutput: 'empty cycle',
        disputed: true,
      })
      return doneOutput(runId, input.cycle)
    }

    let gateResult = runGate(cwd)
    let green = gateGreen(gateResult)

    if (!green) {
      console.warn('[gate] Gate RED — attempting one fix...')
      const gateOut = lastLines(
        (gateResult.stdout ?? '') + (gateResult.stderr ?? ''),
        100,
      )
      const fixPrompt = `The verification gate is failing after your changes. Output:\n${gateOut}\nFix it. Same hard rules apply: never rename/version-bump packages, never touch protected packages, never edit .delphi/, do NOT git commit/push, end with WORK COMPLETE: <summary>.`
      const executor =
        (process.env.AGENT_EXECUTOR as 'pty' | 'headless' | undefined) ??
        'headless'
      const permProbe2 = spawnSync(
        'claude',
        ['--permission-mode', 'acceptEdits', '--version'],
        { encoding: 'utf8' },
      )
      await runAgent(fixPrompt, {
        executor,
        cwd,
        hasPermissionMode: permProbe2.status === 0,
        timeoutMs: 15 * 60 * 1000,
      })
      gateResult = runGate(cwd)
      green = gateGreen(gateResult)
    }

    const gateOutput = lastLines(
      (gateResult.stdout ?? '') + (gateResult.stderr ?? ''),
      20,
    )

    if (!green) {
      console.error('[gate] Gate still RED after fix attempt — rolling back.')
      const currentLines = gitPorcelain(cwd)
      await rollback(cwd, state.snapshotLines ?? [], currentLines)
      await markTaskDisputed(state.taskId!, 'gate red after fix attempt')
      writeState(cwd, runId, {
        gateGreenResult: false,
        gateOutput,
        disputed: true,
      })
      return doneOutput(runId, input.cycle)
    }

    console.log('[gate] GREEN')
    writeState(cwd, runId, {
      gateGreenResult: true,
      gateOutput,
      disputed: false,
    })
    return doneOutput(runId, input.cycle)
  }
}

// ── Step 5: commit ────────────────────────────────────────────────────────────

class CommitStep extends FunctionStep<DoneJsonObject, DoneJsonObject> {
  readonly stepName = 'commit' as const
  override retries = 0

  async handle(input: DoneJsonObject, _ctx: StepExecutionContext) {
    const cwd = process.cwd()
    const runId = input.runId
    const state = readState(cwd, runId)
    const cycle = input.cycle

    if (!state.gateGreenResult || state.disputed) {
      writeState(cwd, runId, {
        commitHash: state.preCommitHash ?? '',
        committed: false,
      })
      return doneOutput(runId, input.cycle)
    }

    const commitMsg = `evolve(cycle ${cycle}): ${(state.taskTitle ?? '').slice(0, 60)}\n\nTask: ${state.taskId}\nTrigger: ${state.trigger}\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
    spawnSync('git', ['add', '-A'], { cwd, encoding: 'utf8' })
    spawnSync('git', ['commit', '-m', commitMsg], {
      cwd,
      encoding: 'utf8',
      stdio: 'inherit',
    })
    const commitHash = gitShortHash(cwd)
    console.log(`[commit] Hash: ${commitHash}`)
    writeState(cwd, runId, { commitHash, committed: true })
    return doneOutput(runId, input.cycle)
  }
}

// ── Step 6: absorb ────────────────────────────────────────────────────────────

class AbsorbStep extends FunctionStep<DoneJsonObject, DoneJsonObject> {
  readonly stepName = 'absorb' as const
  override retries = 1

  async handle(input: DoneJsonObject, _ctx: StepExecutionContext) {
    const cwd = process.cwd()
    const runId = input.runId
    const state = readState(cwd, runId)

    if (!state.committed) {
      writeState(cwd, runId, { absorbed: false })
      return doneOutput(runId, input.cycle)
    }

    console.log('[absorb] Running pnpm brain:bootstrap...')
    spawnSync('pnpm', ['brain:bootstrap'], {
      cwd,
      encoding: 'utf8',
      stdio: 'inherit',
      shell: true,
    })
    writeState(cwd, runId, { absorbed: true })
    return doneOutput(runId, input.cycle)
  }
}

// ── Step 7: verify-closure ────────────────────────────────────────────────────

class VerifyClosureStep extends FunctionStep<DoneJsonObject, DoneJsonObject> {
  readonly stepName = 'verify-closure' as const
  override retries = 0

  async handle(input: DoneJsonObject, _ctx: StepExecutionContext) {
    const cwd = process.cwd()
    const runId = input.runId
    const state = readState(cwd, runId)

    if (!state.committed) {
      writeState(cwd, runId, {
        closureStatus: 'DISPUTED',
        healthAfterStr: state.healthBeforeStr ?? '',
      })
      return doneOutput(runId, input.cycle)
    }

    const dataDir = resolve(cwd, process.env.DELPHI_DATA_DIR ?? '.delphi/brain')
    const db = await createDb({ dataDir })
    await migrate(db)
    const store = new BrainStore(db)
    try {
      const brain = await store.getBrainByName('delphi')
      if (!brain) {
        throw new Error('Brain "delphi" not found.')
      }
      const brainId = brain.id
      const freshDebt = await scanDebt(store, brainId)
      const stillPresent = freshDebt.some(
        d => d.trigger === state.trigger && d.target === state.target,
      )

      let researchAdded = false
      if (state.trigger === 'OPEN_QUESTION') {
        researchAdded = gitAddedFiles(
          cwd,
          state.preCommitHash!,
          state.commitHash!,
        ).some(f => f.startsWith('research/'))
      }

      let rfcAdded = false
      if (state.trigger === 'SPEC_GAP') {
        rfcAdded = gitAddedFiles(
          cwd,
          state.preCommitHash!,
          state.commitHash!,
        ).some(f => f.startsWith('rfcs/RFC-') && f.endsWith('.md'))
      }

      const closureMet = !stillPresent || researchAdded || rfcAdded

      if (closureMet) {
        const existing = await store.getLeaf(state.taskId!)
        await store.updateLeaf(state.taskId!, {
          status: 'ARCHIVED',
          content: {
            ...(existing?.content ?? {}),
            closedAt: new Date().toISOString(),
            evidence: `commit ${state.commitHash}: ${state.agentSummaryLine}`,
          },
        })
      } else {
        const existing = await store.getLeaf(state.taskId!)
        await store.updateLeaf(state.taskId!, {
          content: { ...(existing?.content ?? {}), unverified: true },
        })
      }

      const healthAfter = await store.health(brainId)
      const closureStatus = closureMet ? 'CLOSED' : 'UNVERIFIED'
      writeState(cwd, runId, {
        closureStatus,
        healthAfterStr: healthStr(healthAfter),
      })
      console.log(`[verify-closure] ${closureStatus}`)
      return doneOutput(runId, input.cycle)
    } finally {
      await db.close()
    }
  }
}

// ── Step 8: log ───────────────────────────────────────────────────────────────

class LogStep extends FunctionStep<DoneJsonObject, DoneJsonObject> {
  readonly stepName = 'log' as const
  override retries = 0

  async handle(input: DoneJsonObject, _ctx: StepExecutionContext) {
    const cwd = process.cwd()
    const runId = input.runId
    const cycle = input.cycle
    const state = readState(cwd, runId)

    const gateResultStr = state.gateGreenResult
      ? 'GREEN'
      : state.disputed
        ? 'DISPUTED'
        : 'RED'

    appendCycleLog(cwd, {
      cycle,
      timestamp: new Date().toISOString(),
      taskId: state.taskId ?? '(unknown)',
      taskTitle: state.taskTitle ?? '(unknown)',
      trigger: state.trigger ?? '(unknown)',
      agentSummary: state.agentSummaryLine ?? '(none)',
      gateResult: gateResultStr,
      commitHash: state.commitHash ?? state.preCommitHash ?? '',
      closureStatus: state.closureStatus ?? 'UNKNOWN',
      healthBefore: state.healthBeforeStr ?? '',
      healthAfter: state.healthAfterStr ?? state.healthBeforeStr ?? '',
    })

    if (state.committed) {
      spawnSync('git', ['commit', '-am', `evolve(cycle ${cycle}): log`], {
        cwd,
        encoding: 'utf8',
        stdio: 'inherit',
      })
    }

    // Clean up state file
    try {
      rmSync(stateFile(cwd, runId))
    } catch {
      /* ignore */
    }
    return doneOutput(runId, input.cycle)
  }
}

// ── Step instances (shared — one per workflow instance) ───────────────────────

const scanStep = new ScanStep()
const prepareStep = new PrepareStep()
const agentStep = new RunAgentStep()
const gateStep = new GateStep()
const commitStep = new CommitStep()
const absorbStep = new AbsorbStep()
const verifyStep = new VerifyClosureStep()
const logStep = new LogStep()

// ── Workflow definition ───────────────────────────────────────────────────────

class EvolutionCycleWorkflow extends Workflow<TriggerJsonObject> {
  readonly workflowName = 'evolution-cycle' as const
  override readonly defaultRetries = 0
  override readonly defaultTimeoutMs = 30 * 60 * 1000

  readonly steps = [
    step(scanStep),
    step(prepareStep, { dependsOn: [scanStep] }),
    step(agentStep, { dependsOn: [prepareStep] }),
    step(gateStep, { dependsOn: [agentStep] }),
    step(commitStep, { dependsOn: [gateStep] }),
    step(absorbStep, { dependsOn: [commitStep] }),
    step(verifyStep, { dependsOn: [absorbStep] }),
    step(logStep, { dependsOn: [verifyStep] }),
  ] as const
}

// ── Engine startup + PgConnector worker wiring ────────────────────────────────

async function startWorker(engine: any): Promise<() => Promise<void>> {
  const { stepTask, connector } = engine

  // PgConnector.listen() starts the polling loop.
  // Each queue name maps to a handler that processes one step payload.
  // All function steps use workflow_step_light; other weights use their own queues.
  const handle = async (payload: unknown) => {
    await (stepTask as any).handle(payload)
  }

  const listenHandle = await connector.listen({
    tasks: [
      { taskName: 'workflow_step_light', handle },
      { taskName: 'workflow_step_heavy', handle },
      { taskName: 'workflow_step_ai', handle },
      { taskName: 'workflow_step_sandbox', handle },
    ],
    defaultConcurrency: 2,
  })

  return listenHandle.stop
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const cwd = process.cwd()

  console.log(
    `\n╔══ Delphi Evolution Engine ══════════════════════════════════════╗`,
  )
  console.log(
    `║  cycles=${args.cycles}  executor=${args.executor}  engine=@goatlab/delphi-core`,
  )
  console.log(
    `╚═════════════════════════════════════════════════════════════════╝\n`,
  )

  // Verify claude CLI exists
  const versionCheck = spawnSync('claude', ['--version'], { encoding: 'utf8' })
  if (versionCheck.error || versionCheck.status !== 0) {
    console.error('ERROR: `claude` CLI not found.')
    process.exit(1)
  }
  console.log(`claude CLI: ${(versionCheck.stdout ?? '').trim()}`)

  // Override executor env for agent steps
  if (args.executor) {
    process.env.AGENT_EXECUTOR = args.executor
  }

  // Ensure engine data dir exists
  const engineDataDir = resolve(cwd, '.delphi/engine')
  mkdirSync(engineDataDir, { recursive: true })

  // Boot the engine with embedded PGlite
  console.log(`\nBooting engine (PGlite at ${engineDataDir})...`)
  const { db, close: closeEngineDb } = await createEngineDb(engineDataDir)

  // Create engine tables (PGlite can't execute multi-statement in one call)
  await execMultiStatement(db, CREATE_TABLES_SQL)
  // Run schema migrations
  await runMigrations(db)

  // Build the typed engine
  // No pgPool → polling dispatch + batch INSERT (no COPY FROM, no LISTEN/NOTIFY)
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

  // Start in-process worker
  const stopWorker = await startWorker(engine)

  // Summary table
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

      // Pre-generate a runId so steps can locate the shared state file
      const { nanoId } = await import('@goatlab/delphi-core')
      const runId = nanoId()

      // Start the workflow run
      const { runId: engineRunId } = await engine['evolution-cycle'].start({
        cycle,
        executor: args.executor,
        runId, // passed through so steps can find the state file
      })
      console.log(`Engine run started: ${engineRunId}`)

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
            `\r[engine] running: ${runningSteps.map(s => s.stepName).join(', ')}    `,
          )
        }
      }
      process.stdout.write('\n')

      if (!finalStatus) {
        console.error(`[engine] Run ${engineRunId} timed out`)
        finalStatus = (await engine['evolution-cycle'].getStatus(
          engineRunId,
        )) as any
      }

      // Print step status table
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
          stepStatuses.push({ name: s.stepName, status: s.status, durationMs })
        } else {
          stepStatuses.push({ name: s.stepName, status: s.status })
        }
      }
      console.log(`\nRun status: ${finalStatus?.status ?? 'UNKNOWN'}`)

      // Read final state for summary
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
    console.log('\nShutting down engine...')
    await stopWorker()
    await engine.shutdown().catch(() => {})
    await engine.ingestBuffer.shutdown().catch(() => {})
    await closeEngineDb().catch(() => {})
  }

  // Summary
  console.log(`\n${'═'.repeat(70)}`)
  console.log('EVOLUTION ENGINE SUMMARY')
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
