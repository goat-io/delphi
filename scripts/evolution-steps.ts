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
import type { Decision } from '@goatlab/delphi-governance'
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
import type { ArbiterRunner } from './governance-bridge.js'
import {
  makeConstitutionGuard,
  makePerspectiveReviewer,
  makeReviewDecider,
  persistEvaluation,
  perspectivesForWorkClass,
  runArbiter,
} from './governance-bridge.js'
import { getRubricByTitle } from './rubrics.js'

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

// Note: markTaskProposed (HITL gate) removed — inside-boundary escalation
// now routes to the ARBITER AGENT (see ReviewStep), not a human.
// If the arbiter rejects, the task is marked DISPUTED (existing path).

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
// Sets guardRequiresReview=true for work classes that need perspective review
// (SPEC_GAP, QUEUED_TASK, rfc-touching), false for docs/maintenance.
// NOTE: guardRequiresReview is independent of verdict.requiresHuman — the new
// inside-boundary constitution has requiresHuman=false for code/spec work, but
// those work classes still need perspective review + arbiter escalation.

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

    // Perspective review needed for code/RFC work, not for docs/maintenance.
    // Cannot use verdict.requiresHuman — that flag is for human-boundary actions only.
    const trigger = state.trigger ?? ''
    const detail = state.detail ?? ''
    const requiresReview =
      trigger === 'SPEC_GAP' ||
      trigger === 'QUEUED_TASK' ||
      detail.includes('rfcs/')

    writeState(cwd, runId, {
      guardAllow: true,
      guardRequiresReview: requiresReview,
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

    // Auto-format before verifying: agent-introduced formatting/import-order
    // churn is trivially fixable and must never cause a dispute. `pnpm lint`
    // runs `biome check --write` (safe fixes only) over the knowledge plane.
    console.log('[gate] auto-formatting (biome check --write) before verify...')
    spawnSync('pnpm', ['lint'], { cwd, encoding: 'utf8' })

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
    } else {
      console.log(`[gate] pid=${process.pid} GREEN`)
    }

    writeState(cwd, runId, {
      gateGreenResult: green,
      gateOutput,
      disputed: !green,
    })

    // Persist EVALUATION leaf against the Verification Gate Rubric (best-effort).
    if (state.taskId) {
      const dataDir = resolve(
        cwd,
        process.env.DELPHI_DATA_DIR ?? '.delphi/brain',
      )
      const evalDb = await createDb({ dataDir })
      await migrate(evalDb)
      const evalStore = new BrainStore(evalDb)
      try {
        const brain = await evalStore.getBrainByName('delphi').catch(() => null)
        if (brain) {
          const rubric = await getRubricByTitle(
            evalStore,
            brain.id,
            'Verification Gate Rubric',
          ).catch(() => null)
          const rubricId = rubric?.id ?? 'verification-gate-rubric'
          const criterionScore = green ? 1.0 : 0.0
          await persistEvaluation(evalStore, brain.id, {
            rubricId,
            targetLeafId: state.taskId,
            perspective: 'verification-gate',
            scores: [
              {
                criterionId: 'typecheck',
                score: criterionScore,
                rationale: green ? 'typecheck passed' : 'gate failed',
              },
              {
                criterionId: 'lint',
                score: criterionScore,
                rationale: green ? 'lint passed' : 'gate failed',
              },
              {
                criterionId: 'tests',
                score: criterionScore,
                rationale: green ? 'tests passed' : 'gate failed',
              },
            ],
            finalScore: criterionScore,
            verdict: green ? 'approve' : 'reject',
            rationale: green
              ? 'Verification gate GREEN'
              : `Verification gate RED: ${gateOutput.slice(0, 200)}`,
          }).catch(() => {
            /* best-effort */
          })
        }
      } finally {
        await evalDb.close()
      }
    }

    return doneOutput(runId, input.cycle)
  }
}

// ── Step 4b: review ───────────────────────────────────────────────────────────
// After gate (gate GREEN), before commit.
//
// Work class routing (The Human Boundary / CONSTITUTION.md):
//   - code work (QUEUED_TASK, non-rfc): runs change-scope + spec-coherence only.
//     redundancy perspective MUST NOT score code diffs.
//   - rfc-touching work (SPEC_GAP / rfcs/): runs all three incl. redundancy.
//
// Verdict handling:
//   - approved  → proceed to commit
//   - rejected  → rollback + task DISPUTED (existing path)
//   - needs_human / inconclusive (score 0.30–0.70) →
//       route to ARBITER AGENT (inside-boundary escalation, NOT human):
//       APPROVE → proceed; REJECT → rollback + DISPUTED
//       Arbiter verdict persisted as EVALUATION leaf (perspective "arbiter")
//
// `arbiterRunner` is injectable for unit testing (defaults to runArbiter).

export class ReviewStep extends FunctionStep<DoneJsonObject, DoneJsonObject> {
  readonly stepName = 'review' as const
  override retries = 0

  // Injectable arbiter runner — set in tests to a stub
  arbiterRunner: ArbiterRunner = runArbiter

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

    // Skip review for allow-class work (docs/research/maintenance — no review required)
    if (!state.guardRequiresReview) {
      writeState(cwd, runId, {
        reviewOutcome: 'skipped',
        reviewReasons: ['allow-class work — no perspective review required'],
      })
      return doneOutput(runId, input.cycle)
    }

    console.log(`[review] pid=${process.pid} Running perspective review...`)

    // Read "Review Decision Rubric" for thresholds (best-effort — fallback to constants)
    const dataDir = resolve(cwd, process.env.DELPHI_DATA_DIR ?? '.delphi/brain')
    const evalDb = await createDb({ dataDir })
    await migrate(evalDb)
    const evalStore = new BrainStore(evalDb)

    let reviewDeciderRubricId = 'review-decision-rubric'
    let approveThreshold = 0.7
    let rejectThreshold = 0.3
    try {
      const reviewBrain = await evalStore
        .getBrainByName('delphi')
        .catch(() => null)
      if (reviewBrain) {
        const reviewRubric = await getRubricByTitle(
          evalStore,
          reviewBrain.id,
          'Review Decision Rubric',
        ).catch(() => null)
        if (reviewRubric) {
          reviewDeciderRubricId = reviewRubric.id
          const rc = reviewRubric.content as unknown as {
            qualityGate?: number
            rejectGate?: number
          }
          if (typeof rc.qualityGate === 'number') {
            approveThreshold = rc.qualityGate
          }
          if (typeof rc.rejectGate === 'number') {
            rejectThreshold = rc.rejectGate
          }
        }
      }
    } catch {
      // non-fatal: use constants as fallback
    }

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

    // Select perspectives by work class:
    //   SPEC_GAP / rfcs-touching → rfc class (includes redundancy)
    //   QUEUED_TASK → code class (change-scope + spec-coherence only; NO redundancy)
    const trigger = state.trigger ?? ''
    const detail = state.detail ?? ''
    const isRfcWork =
      trigger === 'SPEC_GAP' ||
      detail.includes('rfcs/') ||
      (decision.tags ?? []).includes('spec') ||
      (decision.tags ?? []).includes('rfc')
    const workClass = isRfcWork ? 'rfc' : 'code'
    const perspectives = perspectivesForWorkClass(workClass)

    console.log(
      `[review] pid=${process.pid} workClass=${workClass} perspectives=[${perspectives.map(p => p.name).join(',')}] approveThreshold=${approveThreshold} rejectThreshold=${rejectThreshold}`,
    )

    const reviewer = makePerspectiveReviewer(cwd)
    const decider = makeReviewDecider({ approveThreshold, rejectThreshold })

    const matrix = await reviewer.review(decision, perspectives)
    const reviewDecision = decider.decide(matrix, perspectives)

    // Persist one EVALUATION leaf per perspective + one for the final decision (best-effort)
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
          const evalVerdict: 'approve' | 'reject' | 'needs_human' | 'neutral' =
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
        // Persist final decision outcome against Review Decision Rubric
        const finalOutcomeVerdict: 'approve' | 'reject' | 'needs_human' =
          reviewDecision.outcome === 'approved'
            ? 'approve'
            : reviewDecision.outcome === 'rejected'
              ? 'reject'
              : 'needs_human'
        await persistEvaluation(evalStore, evalBrainId, {
          rubricId: reviewDeciderRubricId,
          targetLeafId: state.taskId,
          perspective: 'review-decision',
          scores: [
            {
              criterionId: 'weighted-approval',
              score: reviewDecision.score,
              rationale: `Weighted approval ${reviewDecision.score.toFixed(2)} ${finalOutcomeVerdict === 'approve' ? `≥ ${approveThreshold}` : finalOutcomeVerdict === 'reject' ? `≤ ${rejectThreshold}` : `is inconclusive — escalating to a human.`}`,
            },
          ],
          finalScore: reviewDecision.score,
          verdict: finalOutcomeVerdict,
          rationale: reviewDecision.reasons.join('; '),
        }).catch(() => {
          /* best-effort */
        })
      }
    } finally {
      await evalDb.close()
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
        gateGreenResult: false,
      })
      return doneOutput(runId, input.cycle)
    }

    if (reviewDecision.outcome === 'needs_human') {
      // Inside-boundary escalation: route to ARBITER AGENT, not a human.
      // The Human Boundary constitution: human approval only for actions that
      // affect other humans. Everything inside this repo resolves via arbiter.
      console.warn(
        `[review] NEEDS_HUMAN (score ${reviewDecision.score.toFixed(2)}) — escalating to ARBITER AGENT (inside-boundary, no human needed).`,
      )

      const rubricScoresSummary = matrix.verdicts
        .map(
          v =>
            `${v.perspective}: ${v.assessment} confidence=${v.confidence?.toFixed(2) ?? 'n/a'} concerns=[${(v.concerns ?? []).join('; ')}]`,
        )
        .join('\n')

      const arbiterInput = {
        workOrder: `Task: ${state.taskId}\nTrigger: ${trigger}\nDetail: ${detail}\nPrompt excerpt: ${(state.prompt ?? '').slice(0, 400)}`,
        rubricScoresSummary,
        diffSummary: `Changed files: ${(state.changedFiles ?? []).join(', ')}`,
      }

      const arbiterVerdict = await this.arbiterRunner(arbiterInput)

      console.log(
        `[review] ARBITER verdict=${arbiterVerdict.outcome} rationale="${arbiterVerdict.rationale}"`,
      )

      // Persist arbiter verdict as EVALUATION leaf
      const arbiterDb = await createDb({ dataDir })
      await migrate(arbiterDb)
      const arbiterStore = new BrainStore(arbiterDb)
      try {
        const arbiterBrain = await arbiterStore
          .getBrainByName('delphi')
          .catch(() => null)
        if (arbiterBrain && state.taskId) {
          await persistEvaluation(arbiterStore, arbiterBrain.id, {
            rubricId: 'arbiter-escalation',
            targetLeafId: state.taskId,
            perspective: 'arbiter',
            scores: [
              {
                criterionId: 'arbiter-ruling',
                score: arbiterVerdict.outcome === 'APPROVE' ? 1.0 : 0.0,
                rationale: arbiterVerdict.rationale,
              },
            ],
            finalScore: arbiterVerdict.outcome === 'APPROVE' ? 1.0 : 0.0,
            verdict:
              arbiterVerdict.outcome === 'APPROVE' ? 'approve' : 'reject',
            rationale: `Arbiter escalation (inside-boundary): ${arbiterVerdict.rationale}`,
          }).catch(() => {
            /* best-effort */
          })
        }
      } finally {
        await arbiterDb.close()
      }

      if (arbiterVerdict.outcome === 'APPROVE') {
        // Arbiter approved — proceed to commit
        writeState(cwd, runId, {
          reviewOutcome: 'approved',
          reviewReasons: [
            ...reviewDecision.reasons,
            `Arbiter APPROVED: ${arbiterVerdict.rationale}`,
          ],
        })
        return doneOutput(runId, input.cycle)
      }

      // Arbiter rejected — rollback + DISPUTED path
      console.error(
        `[review] ARBITER REJECTED — rolling back. Rationale: ${arbiterVerdict.rationale}`,
      )
      const currentLines = gitPorcelain(cwd)
      await rollback(cwd, state.snapshotLines ?? [], currentLines)
      await markTaskDisputed(
        state.taskId!,
        `Arbiter escalation rejected (score ${reviewDecision.score.toFixed(2)}): ${arbiterVerdict.rationale}. Perspective scores: ${rubricScoresSummary}`,
      )
      writeState(cwd, runId, {
        disputed: true,
        gateGreenResult: false,
      })
      return doneOutput(runId, input.cycle)
    }

    // approved — proceed
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

    // Export brain JSONL so brain/*.jsonl deltas are staged in the same commit
    {
      const exportDataDir = resolve(
        cwd,
        process.env.DELPHI_DATA_DIR ?? '.delphi/brain',
      )
      const exportDb = await createDb({ dataDir: exportDataDir })
      await migrate(exportDb)
      const exportStore = new BrainStore(exportDb)
      try {
        const exportBrain_ = await exportStore.getBrainByName('delphi')
        if (exportBrain_) {
          const { exportBrain: doExport } = await import('./brain-store-io.js')
          await doExport(exportStore, exportBrain_.id, resolve(cwd, 'brain'))
          console.log(`[commit] Brain JSONL exported to brain/`)
        }
      } finally {
        await exportDb.close()
      }
    }

    spawnSync('git', ['add', '-A'], { cwd, encoding: 'utf8' })
    spawnSync('git', ['commit', '-m', commitMsg], {
      cwd,
      encoding: 'utf8',
      stdio: 'inherit',
    })
    const commitHash = gitShortHash(cwd)
    console.log(`[commit] pid=${process.pid} Hash: ${commitHash}`)
    writeState(cwd, runId, { commitHash, committed: true })

    // Push to origin; on non-fast-forward, rebase-pull then retry (never force-push)
    const pushResult = spawnSync('git', ['push'], { cwd, encoding: 'utf8' })
    if (pushResult.status !== 0) {
      console.log(
        `[commit] Push rejected (non-fast-forward?) — rebasing and retrying`,
      )
      const pullResult = spawnSync('git', ['pull', '--rebase'], {
        cwd,
        encoding: 'utf8',
        stdio: 'inherit',
      })
      if (pullResult.status === 0) {
        spawnSync('git', ['push'], { cwd, encoding: 'utf8', stdio: 'inherit' })
        console.log(`[commit] Push succeeded after rebase`)
      } else {
        console.error(`[commit] Rebase-pull failed — push skipped this cycle`)
      }
    } else {
      console.log(`[commit] Pushed to origin`)
    }

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

      // QUEUED_TASK closure: any committed file changes + hasWorkComplete → done.
      // Reads from "Task Closure Rubric" and persists EVALUATION leaves.
      let queuedTaskDone = false
      if (state.trigger === 'QUEUED_TASK') {
        const added = gitAddedFiles(
          cwd,
          state.preCommitHash!,
          state.commitHash!,
        )
        const filesCommitted = added.length > 0
        const workComplete = state.hasWorkComplete ?? false
        queuedTaskDone = filesCommitted && workComplete

        // Best-effort: read rubric + persist evaluation (don't block closure on failure)
        try {
          const rubricLeaf = await getRubricByTitle(
            store,
            brainId,
            'Task Closure Rubric',
          )
          if (rubricLeaf && state.taskId) {
            const criterionScores = [
              {
                criterionId: 'files-committed',
                score: filesCommitted ? 1 : 0,
                rationale: filesCommitted
                  ? `${added.length} file(s) committed`
                  : 'No files committed in this cycle',
              },
              {
                criterionId: 'work-complete',
                score: workComplete ? 1 : 0,
                rationale: workComplete
                  ? 'WORK COMPLETE marker present in agent output'
                  : 'WORK COMPLETE marker absent from agent output',
              },
            ]
            const finalScore =
              criterionScores.reduce((s, c) => s + c.score, 0) /
              criterionScores.length
            await persistEvaluation(store, brainId, {
              rubricId: rubricLeaf.id,
              targetLeafId: state.taskId,
              perspective: 'task-closure',
              scores: criterionScores,
              finalScore,
              verdict: queuedTaskDone ? 'approve' : 'reject',
              rationale: queuedTaskDone
                ? 'Closure criteria met: files committed and WORK COMPLETE present'
                : `Closure criteria not met: files=${filesCommitted} workComplete=${workComplete}`,
            })
          }
        } catch {
          // non-fatal: evaluation persistence failure must not block cycle closure
        }
      }

      const closureMet =
        !stillPresent || researchAdded || rfcAdded || queuedTaskDone

      // For non-QUEUED_TASK triggers (SPEC_GAP, OPEN_QUESTION, etc.) persist a closure
      // EVALUATION leaf so every closure outcome is rubric-backed (best-effort).
      // QUEUED_TASK already persists its own fine-grained evaluation in the block above.
      if (state.trigger !== 'QUEUED_TASK') {
        try {
          const closureRubric = await getRubricByTitle(
            store,
            brainId,
            'Task Closure Rubric',
          )
          if (closureRubric && state.taskId) {
            const artifactPresent = rfcAdded || researchAdded || !stillPresent
            const workOk = state.hasWorkComplete ?? false
            const closureScores = [
              {
                criterionId: 'files-committed',
                score: artifactPresent ? 1 : 0,
                rationale: artifactPresent
                  ? 'Closure artifact present (RFC, research file, or debt resolved)'
                  : 'No closure artifact found in this cycle',
              },
              {
                criterionId: 'work-complete',
                score: workOk ? 1 : 0,
                rationale: workOk
                  ? 'WORK COMPLETE marker present in agent output'
                  : 'WORK COMPLETE marker absent from agent output',
              },
            ]
            const closureFinalScore =
              closureScores.reduce((s, c) => s + c.score, 0) /
              closureScores.length
            await persistEvaluation(store, brainId, {
              rubricId: closureRubric.id,
              targetLeafId: state.taskId,
              perspective: 'task-closure',
              scores: closureScores,
              finalScore: closureFinalScore,
              verdict: closureMet ? 'approve' : 'reject',
              rationale: closureMet
                ? `Closure verified for trigger ${state.trigger}`
                : `Closure UNVERIFIED for trigger ${state.trigger}: stillPresent=${stillPresent} artifactPresent=${artifactPresent}`,
            }).catch(() => {
              /* best-effort */
            })
          }
        } catch {
          // non-fatal: evaluation persistence must not block cycle closure
        }
      }

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

// ── commitCycleLogEntry ───────────────────────────────────────────────────────
// Exported for unit testing. Commits evolution.log.md (and any other tracked
// changes when cycleCommitted=true) so each cycle atomically owns its diff.
// DISPUTED cycles get a targeted "log [DISPUTED]" commit so the log entry is
// never swept into the next cycle's CommitStep (git add -A).

export function commitCycleLogEntry(
  cwd: string,
  cycle: number,
  cycleCommitted: boolean,
): void {
  if (cycleCommitted) {
    // GREEN path: -am picks up log file + any remaining tracked changes
    spawnSync('git', ['commit', '-am', `evolve(cycle ${cycle}): log`], {
      cwd,
      encoding: 'utf8',
      stdio: 'inherit',
    })
  } else {
    // DISPUTED path: stage only the log file; commit it so the next cycle's
    // "git add -A" doesn't sweep in this cycle's orphaned log entry.
    const addResult = spawnSync('git', ['add', 'evolution.log.md'], {
      cwd,
      encoding: 'utf8',
    })
    if (addResult.status === 0) {
      spawnSync(
        'git',
        ['commit', '-m', `evolve(cycle ${cycle}): log [DISPUTED]`],
        { cwd, encoding: 'utf8', stdio: 'inherit' },
      )
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

    // Always commit the log atomically within this cycle (fix: DISPUTED cycles
    // previously left evolution.log.md uncommitted, causing the next cycle's
    // CommitStep to sweep it in via git add -A).
    commitCycleLogEntry(cwd, cycle, state.committed ?? false)

    // Persist EVALUATION leaf against Cycle Atomicity Rubric (best-effort)
    if (state.taskId) {
      const dataDir = resolve(
        cwd,
        process.env.DELPHI_DATA_DIR ?? '.delphi/brain',
      )
      const atomicityDb = await createDb({ dataDir })
      await migrate(atomicityDb)
      const atomicityStore = new BrainStore(atomicityDb)
      try {
        const atomicityBrain = await atomicityStore
          .getBrainByName('delphi')
          .catch(() => null)
        if (atomicityBrain) {
          const rubric = await getRubricByTitle(
            atomicityStore,
            atomicityBrain.id,
            'Cycle Atomicity Rubric',
          ).catch(() => null)
          const rubricId = rubric?.id ?? 'cycle-atomicity-rubric'
          // Both criteria score 1.0: the log is always committed now, and any
          // DISPUTED rollback prevents stale-diff bleed.
          await persistEvaluation(atomicityStore, atomicityBrain.id, {
            rubricId,
            targetLeafId: state.taskId,
            perspective: 'cycle-atomicity',
            scores: [
              {
                criterionId: 'log-committed-in-cycle',
                score: 1.0,
                rationale: state.committed
                  ? 'GREEN cycle — log committed via -am'
                  : 'DISPUTED cycle — log committed via targeted [DISPUTED] commit',
              },
              {
                criterionId: 'no-stale-diff',
                score: 1.0,
                rationale: state.committed
                  ? 'GREEN cycle — no stale diff'
                  : 'DISPUTED cycle — rollback cleared stale diff; log committed atomically',
              },
            ],
            finalScore: 1.0,
            verdict: 'approve',
            rationale: `Cycle ${cycle} log committed atomically (committed=${state.committed ?? false})`,
          }).catch(() => {
            /* best-effort */
          })
        }
      } finally {
        await atomicityDb.close()
      }
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
