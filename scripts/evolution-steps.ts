// Shared step definitions for the evolution-cycle workflow.
// Imported by both evolution-workflow.ts (in-process) and
// evolution-server.ts / evolution-worker.ts (remote worker).
//
// Nothing here should import engine-startup code — only step classes,
// the workflow definition, and the shared helpers they depend on.

import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { StepExecutionContext } from '@goatlab/delphi-core'
import { FunctionStep, step, Workflow } from '@goatlab/delphi-core'
import type { Decision, Perspective } from '@goatlab/delphi-governance'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import {
  appendCycleLog,
  gateGreen,
  gitAddedFiles,
  gitPorcelain,
  gitShortHash,
  healthStr,
  lastLines,
  rollback,
  runAgent,
  runGate,
} from './evolution-loop.js'
import { buildWorkPrompt, createTaskFromDebt, scanDebt } from './evolve.js'
import {
  makeConstitutionGuard,
  makePerspectiveReviewer,
  makeReviewDecider,
  persistEvaluation,
} from './governance-bridge.js'

// ── Trigger input (what we pass to engine.start()) ────────────────────────────

export interface CycleTrigger {
  readonly cycle: number
  readonly executor: string
  readonly runId: string // pre-generated so steps can find the shared state file
}

// ── Shared cycle state (written to .delphi/engine-cycle-{runId}.json) ─────────

export interface CycleState {
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
  // Written by guard (after create-task, before run-agent)
  guardAllow?: boolean
  guardRequiresReview?: boolean
  guardReasons?: string[]
  // Written by review (after gate, before commit)
  reviewOutcome?: string // 'approved' | 'rejected' | 'needs_human'
  reviewScore?: number
  reviewReasons?: string[]
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

export type TriggerJsonObject = { [x: string]: any } & CycleTrigger
export type DoneJsonObject = { [x: string]: any } & {
  done: boolean
  runId: string
  cycle: number
}

export function stateFile(cwd: string, runId: string): string {
  return resolve(cwd, `.delphi/engine-cycle-${runId}.json`)
}

export function readState(cwd: string, runId: string): CycleState {
  try {
    return JSON.parse(readFileSync(stateFile(cwd, runId), 'utf8'))
  } catch {
    return {}
  }
}

export function writeState(
  cwd: string,
  runId: string,
  patch: CycleState,
): CycleState {
  const existing = readState(cwd, runId)
  const next = { ...existing, ...patch }
  writeFileSync(stateFile(cwd, runId), JSON.stringify(next, null, 2))
  return next
}

export function doneOutput(
  runId: string,
  cycle: number,
): { output: DoneJsonObject } {
  return { output: { done: true, runId, cycle } as DoneJsonObject }
}

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

// ── Step 1: scan ─────────────────────────────────────────────────────────────

export class ScanStep extends FunctionStep<TriggerJsonObject, DoneJsonObject> {
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
        `[scan] pid=${process.pid} debt=[${top.trigger}] pri=${top.priority} "${top.targetTitle}"`,
      )
      return doneOutput(input.runId, input.cycle)
    } finally {
      await db.close()
    }
  }
}

// ── Step 2: create-task ───────────────────────────────────────────────────────

export class PrepareStep extends FunctionStep<DoneJsonObject, DoneJsonObject> {
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
      console.log(
        `[create-task] pid=${process.pid} Task: ${state.taskId} — ${state.taskTitle}`,
      )
      return doneOutput(runId, input.cycle)
    } finally {
      await db.close()
    }
  }
}

// ── Step 2b: guard ────────────────────────────────────────────────────────────
// Runs the ConstitutionGuard on the work order. If blocked → task DISPUTED, end.
// If requiresHuman (spec work) → sets guardRequiresReview=true, continues.

export class GuardStep extends FunctionStep<DoneJsonObject, DoneJsonObject> {
  readonly stepName = 'guard' as const
  override retries = 0

  async handle(input: DoneJsonObject, _ctx: StepExecutionContext) {
    const cwd = process.cwd()
    const runId = input.runId
    const state = readState(cwd, runId)

    const guard = makeConstitutionGuard()
    // Represent the work order as a minimal Action-like GovernedItem
    const workItem = {
      name: state.taskId ?? 'unknown',
      kind: 'action' as const,
      description: state.detail ?? '',
      type: state.trigger ?? 'unknown',
      status: 'proposed' as const,
      tags: [state.trigger ?? ''],
      classifications: [],
    }

    const verdict = await guard.evaluate(workItem, { classifications: [] })

    console.log(
      `[guard] pid=${process.pid} allow=${verdict.allow} requiresHuman=${verdict.requiresHuman} reasons=[${verdict.reasons.join('; ')}]`,
    )

    if (!verdict.allow) {
      await markTaskDisputed(
        state.taskId!,
        `Constitution blocked: ${verdict.reasons.join('; ')}`,
      )
      writeState(cwd, runId, {
        guardAllow: false,
        guardRequiresReview: false,
        guardReasons: verdict.reasons,
        disputed: true,
      })
      return doneOutput(runId, input.cycle)
    }

    writeState(cwd, runId, {
      guardAllow: true,
      guardRequiresReview: verdict.requiresHuman,
      guardReasons: verdict.reasons,
    })
    return doneOutput(runId, input.cycle)
  }
}

// ── Step 3: run-agent ─────────────────────────────────────────────────────────

export class RunAgentStep extends FunctionStep<DoneJsonObject, DoneJsonObject> {
  readonly stepName = 'run-agent' as const
  override retries = 0

  async handle(input: DoneJsonObject, _ctx: StepExecutionContext) {
    const cwd = process.cwd()
    const runId = input.runId
    const state = readState(cwd, runId)

    // Guard blocked — skip agent execution
    if (state.disputed && state.guardAllow === false) {
      console.log('[run-agent] Skipping — guard blocked this work order.')
      return doneOutput(runId, input.cycle)
    }

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
      `[run-agent] pid=${process.pid} executor=${executor} permission-mode=${hasPermissionMode}`,
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
      `[run-agent] pid=${process.pid} ok=${agentResult.ok} changed=${changedFiles.length} workComplete=${hasWorkComplete}`,
    )
    console.log(`[run-agent] ${agentSummaryLine}`)
    return doneOutput(runId, input.cycle)
  }
}

// ── Step 4: gate ──────────────────────────────────────────────────────────────

export class GateStep extends FunctionStep<DoneJsonObject, DoneJsonObject> {
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

    console.log(`[gate] pid=${process.pid} GREEN`)
    writeState(cwd, runId, {
      gateGreenResult: true,
      gateOutput,
      disputed: false,
    })
    return doneOutput(runId, input.cycle)
  }
}

// ── Step 4b: review ───────────────────────────────────────────────────────────
// After gate (gate GREEN), before commit.
// For work orders flagged guardRequiresReview=true (spec/RFC work):
//   run PerspectiveReviewer → if REJECT → rollback + task DISPUTED.
//   if APPROVE → proceed; verdict recorded in state + later in log.
// Allow-class work: no review, passes through.

export class ReviewStep extends FunctionStep<DoneJsonObject, DoneJsonObject> {
  readonly stepName = 'review' as const
  override retries = 0

  async handle(input: DoneJsonObject, _ctx: StepExecutionContext) {
    const cwd = process.cwd()
    const runId = input.runId
    const state = readState(cwd, runId)

    // Skip review if gate didn't pass or already disputed
    if (!state.gateGreenResult || state.disputed) {
      writeState(cwd, runId, {
        reviewOutcome: 'skipped',
        reviewReasons: ['gate did not pass — review skipped'],
      })
      return doneOutput(runId, input.cycle)
    }

    // Skip review for allow-class work (no RFC involvement)
    if (!state.guardRequiresReview) {
      writeState(cwd, runId, {
        reviewOutcome: 'skipped',
        reviewReasons: ['allow-class work — no perspective review required'],
      })
      return doneOutput(runId, input.cycle)
    }

    console.log(`[review] pid=${process.pid} Running perspective review...`)

    // Build a Decision object from the work order for the reviewer
    const decision: Decision = {
      name: state.taskId ?? 'unknown',
      kind: 'decision',
      description: state.detail ?? '',
      status: 'proposed',
      tags: [state.trigger ?? ''],
    }
    if (state.prompt) {
      decision.context = state.prompt.slice(0, 500)
    }

    const perspectives: Perspective[] = [
      { name: 'redundancy', weight: 2 },
      { name: 'spec-coherence', weight: 1 },
      { name: 'scope', weight: 2 },
    ]

    const reviewer = makePerspectiveReviewer(cwd)
    const decider = makeReviewDecider()

    const matrix = await reviewer.review(decision, perspectives)
    const reviewDecision = decider.decide(matrix, perspectives)

    // Persist one EVALUATION leaf per perspective (best-effort — don't block the cycle)
    {
      const dataDir = resolve(
        cwd,
        process.env.DELPHI_DATA_DIR ?? '.delphi/brain',
      )
      const evalDb = await createDb({ dataDir })
      await migrate(evalDb)
      const evalStore = new BrainStore(evalDb)
      try {
        const brain = await evalStore.getBrainByName('delphi').catch(() => null)
        if (brain && state.taskId) {
          const evalBrainId = brain.id
          for (const verdict of matrix.verdicts) {
            const cs = (verdict as any).criterionScores ?? []
            const fs =
              typeof (verdict as any).finalScore === 'number'
                ? (verdict as any).finalScore
                : verdict.assessment === 'approve'
                  ? 0.8
                  : verdict.assessment === 'reject'
                    ? 0.2
                    : 0.5
            const evalVerdict:
              | 'approve'
              | 'reject'
              | 'needs_human'
              | 'neutral' =
              verdict.assessment === 'approve'
                ? 'approve'
                : verdict.assessment === 'reject'
                  ? 'reject'
                  : 'needs_human'
            await persistEvaluation(evalStore, evalBrainId, {
              rubricId: `${verdict.perspective}-rubric`,
              targetLeafId: state.taskId,
              perspective: verdict.perspective,
              scores: cs,
              finalScore: fs,
              verdict: evalVerdict,
              rationale: (verdict.concerns ?? []).join('; '),
            }).catch(() => {
              /* best-effort */
            })
          }
        }
      } finally {
        await evalDb.close()
      }
    }

    console.log(
      `[review] pid=${process.pid} outcome=${reviewDecision.outcome} score=${reviewDecision.score.toFixed(2)} reasons=[${reviewDecision.reasons.join('; ')}]`,
    )

    writeState(cwd, runId, {
      reviewOutcome: reviewDecision.outcome,
      reviewScore: reviewDecision.score,
      reviewReasons: reviewDecision.reasons,
    })

    if (reviewDecision.outcome === 'rejected') {
      console.error('[review] REJECTED — rolling back cycle changes.')
      const currentLines = gitPorcelain(cwd)
      await rollback(cwd, state.snapshotLines ?? [], currentLines)
      await markTaskDisputed(
        state.taskId!,
        `Perspective review rejected: ${reviewDecision.reasons.join('; ')}. Tradeoff matrix: ${JSON.stringify(matrix.verdicts)}`,
      )
      writeState(cwd, runId, {
        disputed: true,
        gateGreenResult: false, // prevent commit
      })
      return doneOutput(runId, input.cycle)
    }

    // approved or needs_human — proceed (log the verdict)
    return doneOutput(runId, input.cycle)
  }
}

// ── Step 5: commit ────────────────────────────────────────────────────────────

export class CommitStep extends FunctionStep<DoneJsonObject, DoneJsonObject> {
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
    console.log(`[commit] pid=${process.pid} Hash: ${commitHash}`)
    writeState(cwd, runId, { commitHash, committed: true })
    return doneOutput(runId, input.cycle)
  }
}

// ── Step 6: absorb ────────────────────────────────────────────────────────────

export class AbsorbStep extends FunctionStep<DoneJsonObject, DoneJsonObject> {
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

    console.log(`[absorb] pid=${process.pid} Running pnpm brain:bootstrap...`)
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

export class VerifyClosureStep extends FunctionStep<
  DoneJsonObject,
  DoneJsonObject
> {
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
      console.log(`[verify-closure] pid=${process.pid} ${closureStatus}`)
      return doneOutput(runId, input.cycle)
    } finally {
      await db.close()
    }
  }
}

// ── Step 8: log ───────────────────────────────────────────────────────────────

export class LogStep extends FunctionStep<DoneJsonObject, DoneJsonObject> {
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

    const reviewSummary =
      state.reviewOutcome && state.reviewOutcome !== 'skipped'
        ? ` | review=${state.reviewOutcome} score=${(state.reviewScore ?? 0).toFixed(2)} [${(state.reviewReasons ?? []).join('; ')}]`
        : ''
    const guardSummary =
      state.guardAllow !== undefined
        ? ` | guard=${state.guardAllow ? 'allow' : 'block'} requiresReview=${state.guardRequiresReview ?? false}`
        : ''

    appendCycleLog(cwd, {
      cycle,
      timestamp: new Date().toISOString(),
      taskId: state.taskId ?? '(unknown)',
      taskTitle: state.taskTitle ?? '(unknown)',
      trigger: state.trigger ?? '(unknown)',
      agentSummary:
        (state.agentSummaryLine ?? '(none)') + guardSummary + reviewSummary,
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

    try {
      rmSync(stateFile(cwd, runId))
    } catch {
      /* ignore */
    }
    return doneOutput(runId, input.cycle)
  }
}

// ── Step instances (exported so both entry points share the same instances) ───

export const scanStep = new ScanStep()
export const prepareStep = new PrepareStep()
export const guardStep = new GuardStep()
export const agentStep = new RunAgentStep()
export const gateStep = new GateStep()
export const reviewStep = new ReviewStep()
export const commitStep = new CommitStep()
export const absorbStep = new AbsorbStep()
export const verifyStep = new VerifyClosureStep()
export const logStep = new LogStep()

// ── Workflow definition (exported so both entry points register the same workflow) ─

export class EvolutionCycleWorkflow extends Workflow<TriggerJsonObject> {
  readonly workflowName = 'evolution-cycle' as const
  override readonly defaultRetries = 0
  override readonly defaultTimeoutMs = 30 * 60 * 1000

  readonly steps = [
    step(scanStep),
    step(prepareStep, { dependsOn: [scanStep] }),
    step(guardStep, { dependsOn: [prepareStep] }),
    step(agentStep, { dependsOn: [guardStep] }),
    step(gateStep, { dependsOn: [agentStep] }),
    step(reviewStep, { dependsOn: [gateStep] }),
    step(commitStep, { dependsOn: [reviewStep] }),
    step(absorbStep, { dependsOn: [commitStep] }),
    step(verifyStep, { dependsOn: [absorbStep] }),
    step(logStep, { dependsOn: [verifyStep] }),
  ] as const
}

// ── Shared worker wiring (used by both in-process and remote worker entry) ────

export async function startWorker(engine: any): Promise<() => Promise<void>> {
  const { stepTask, connector } = engine

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

// Ensure .delphi dir exists (called by both entry points)
export function ensureDelphiDir(cwd: string): void {
  mkdirSync(resolve(cwd, '.delphi'), { recursive: true })
}
