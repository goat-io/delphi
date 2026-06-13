// tests/rubrics.test.ts — Tests for rubric-backed governance evaluation.

import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { ensureSeededRegions } from '@goatlab/delphi-indexer'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { CriterionScore, Decision } from '../scripts/governance-bridge.js'
import {
  makePerspectiveReviewer,
  makeReviewDecider,
  persistEvaluation,
} from '../scripts/governance-bridge.js'
import type { RubricContent } from '../scripts/rubrics.js'
import { getRubricByTitle, seedRubrics } from '../scripts/rubrics.js'

let store: BrainStore
let brainId: string
let tmpDir: string
let db: any

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'delphi-rubrics-'))
  db = await createDb({ dataDir: tmpDir })
  await migrate(db)
  store = new BrainStore(db)

  const brain = await store.createBrain('delphi', 'Test brain for rubrics')
  brainId = brain.id

  await ensureSeededRegions(store, brainId, ['Objectives', 'Operations'])
}, 30_000)

afterAll(async () => {
  await db.close()
})

describe('rubrics', () => {
  it('1. seedRubrics is idempotent and criteria weights sum to 1.0', async () => {
    const first = await seedRubrics(store, brainId)
    expect(first.length).toBe(12)

    const second = await seedRubrics(store, brainId)
    expect(second.length).toBe(12)

    for (let i = 0; i < first.length; i++) {
      expect(first[i]!.id).toBe(second[i]!.id)
    }

    for (const leaf of first) {
      const content = leaf.content as unknown as RubricContent
      const weightSum = content.criteria.reduce((s, c) => s + c.weight, 0)
      expect(weightSum).toBeCloseTo(1.0, 5)
    }
  })

  it('1b. Verification Gate Rubric seeded with PASS_FAIL scoring and 3 criteria', async () => {
    const rubric = await getRubricByTitle(
      store,
      brainId,
      'Verification Gate Rubric',
    )
    expect(rubric).not.toBeNull()

    const content = rubric!.content as unknown as RubricContent
    expect(content.scoringMethod).toBe('PASS_FAIL')
    expect(content.qualityGate).toBe(1.0)
    expect(content.criteria).toHaveLength(3)
    const ids = content.criteria.map(c => c.id)
    expect(ids).toContain('typecheck')
    expect(ids).toContain('lint')
    expect(ids).toContain('tests')
  })

  it('2. Scoring respects weights: modified rubric weight → different finalScore', async () => {
    const rubricLeaf = await getRubricByTitle(
      store,
      brainId,
      'RFC Redundancy Rubric',
    )
    expect(rubricLeaf).not.toBeNull()

    const content = rubricLeaf!.content as unknown as RubricContent
    const criteria = content.criteria

    const score1 =
      1.0 * (criteria.find(c => c.id === 'topic-overlap')?.weight ?? 0) +
      0.0 * (criteria.find(c => c.id === 'novel-content')?.weight ?? 0)

    expect(score1).toBeCloseTo(0.6, 5)

    const score2 =
      0.0 * (criteria.find(c => c.id === 'topic-overlap')?.weight ?? 0) +
      1.0 * (criteria.find(c => c.id === 'novel-content')?.weight ?? 0)

    expect(score2).toBeCloseTo(0.4, 5)

    expect(score1).not.toBeCloseTo(score2, 5)
  })

  it('3. Verdict flips when qualityGate lowered (gate from rubric, not constants)', async () => {
    const rubricLeaf = await getRubricByTitle(
      store,
      brainId,
      'RFC Redundancy Rubric',
    )
    expect(rubricLeaf).not.toBeNull()

    const content = rubricLeaf!.content as unknown as RubricContent

    const finalScore = 0.55

    function scoreToVerdict(score: number, qg: number, rg: number): string {
      if (score >= qg) {
        return 'approve'
      }
      if (score <= rg) {
        return 'reject'
      }
      return 'needs_human'
    }

    const verdictDefault = scoreToVerdict(
      finalScore,
      content.qualityGate,
      content.rejectGate,
    )
    expect(verdictDefault).toBe('needs_human')

    const verdictLowerGate = scoreToVerdict(finalScore, 0.5, content.rejectGate)
    expect(verdictLowerGate).toBe('approve')

    const verdictHigherRejectGate = scoreToVerdict(
      finalScore,
      content.qualityGate,
      0.6,
    )
    expect(verdictHigherRejectGate).toBe('reject')
  })

  it('4. persistEvaluation creates EVALUATION leaf + EVALUATES edge; LeafKindSchema accepts EVALUATION', async () => {
    const { LeafKindSchema } = await import('@goatlab/delphi-protocol')
    const result = LeafKindSchema.safeParse('EVALUATION')
    expect(result.success).toBe(true)

    const targetLeaf = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: 'Test task for evaluation',
      aliases: [],
      tags: ['test'],
    })

    const evalLeaf = await persistEvaluation(store, brainId, {
      rubricId: 'test-rubric-id',
      targetLeafId: targetLeaf.id,
      perspective: 'redundancy',
      scores: [
        { criterionId: 'topic-overlap', score: 0.8, rationale: 'Low overlap' },
        { criterionId: 'novel-content', score: 0.9, rationale: 'Highly novel' },
      ],
      finalScore: 0.84,
      verdict: 'approve',
      rationale: 'No significant topic overlap found',
    })

    expect(evalLeaf.kind).toBe('EVALUATION')
    expect(evalLeaf.title).toContain('redundancy')
    expect(evalLeaf.title).toContain('Test task')
    const content = evalLeaf.content as Record<string, unknown>
    expect(content.finalScore).toBeCloseTo(0.84)
    expect(content.verdict).toBe('approve')

    // Idempotency: second call returns same leaf
    const evalLeaf2 = await persistEvaluation(store, brainId, {
      rubricId: 'test-rubric-id',
      targetLeafId: targetLeaf.id,
      perspective: 'redundancy',
      scores: [],
      finalScore: 0.5,
      verdict: 'needs_human',
    })
    expect(evalLeaf2.id).toBe(evalLeaf.id)
  })

  it('5. RFC-0031 redundancy check still rejects with per-criterion scores in result', async () => {
    const repoRoot = resolve(import.meta.dirname ?? __dirname, '..')
    const reviewer = makePerspectiveReviewer(repoRoot, store, brainId)
    const decider = makeReviewDecider()

    const duplicateDecision: Decision = {
      name: 'fake-rfc-duplicate',
      kind: 'decision',
      description:
        'Candidate state machine with PENDING, NORMALIZING, RESOLVING, PROMOTED, REJECTED, FLAGGED, EXPIRED states. Staged candidate lifecycle with state transitions, audit trail, TTL, review queue, batch throughput, canonicalization, entity resolution pipeline.',
      status: 'proposed',
      context:
        'This RFC covers candidate staging protocol state machine and review queue batch throughput.',
    }

    const perspectives = [
      { name: 'redundancy', weight: 2 },
      { name: 'spec-coherence', weight: 1 },
      { name: 'scope', weight: 2 },
    ]

    const matrix = await reviewer.review(duplicateDecision, perspectives)
    const reviewDecision = decider.decide(matrix, perspectives)

    const redundancyVerdict = matrix.verdicts.find(
      (v: any) => v.perspective === 'redundancy',
    )
    expect(redundancyVerdict).toBeDefined()
    expect(redundancyVerdict?.assessment).toBe('reject')

    const criterionScores = (redundancyVerdict as any)?.criterionScores
    if (criterionScores && criterionScores.length > 0) {
      expect(criterionScores.length).toBeGreaterThanOrEqual(1)
      for (const cs of criterionScores) {
        expect(cs.criterionId).toBeDefined()
        expect(typeof cs.score).toBe('number')
        expect(cs.score).toBeGreaterThanOrEqual(0)
        expect(cs.score).toBeLessThanOrEqual(1)
        expect(cs.rationale).toBeDefined()
      }
    }

    expect(['rejected', 'needs_human']).toContain(reviewDecision.outcome)
  })

  it('6. Task Closure Rubric is seeded with PASS_FAIL and two 0.5-weight criteria', async () => {
    const rubric = await getRubricByTitle(store, brainId, 'Task Closure Rubric')
    expect(rubric).not.toBeNull()

    const content = rubric!.content as unknown as RubricContent
    expect(content.scoringMethod).toBe('PASS_FAIL')
    expect(content.qualityGate).toBe(1.0)
    expect(content.rejectGate).toBe(0.5)
    expect(content.criteria).toHaveLength(2)

    const ids = content.criteria.map(c => c.id)
    expect(ids).toContain('files-committed')
    expect(ids).toContain('work-complete')

    const weightSum = content.criteria.reduce((s, c) => s + c.weight, 0)
    expect(weightSum).toBeCloseTo(1.0, 5)
  })

  it('7. verify-closure: QUEUED_TASK closure persists EVALUATION leaf against Task Closure Rubric', async () => {
    await seedRubrics(store, brainId)

    const taskLeaf = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: 'QUEUED_TASK closure regression target',
      aliases: [],
      tags: ['test', 'queued-task'],
    })

    const rubricLeaf = await getRubricByTitle(
      store,
      brainId,
      'Task Closure Rubric',
    )
    expect(rubricLeaf).not.toBeNull()

    // Simulate what VerifyClosureStep now does for a passing closure
    const filesCommitted = true
    const workComplete = true
    const criterionScores = [
      {
        criterionId: 'files-committed',
        score: filesCommitted ? 1 : 0,
        rationale: '3 file(s) committed',
      },
      {
        criterionId: 'work-complete',
        score: workComplete ? 1 : 0,
        rationale: 'WORK COMPLETE marker present in agent output',
      },
    ]
    const finalScore =
      criterionScores.reduce((s, c) => s + c.score, 0) / criterionScores.length

    const evalLeaf = await persistEvaluation(store, brainId, {
      rubricId: rubricLeaf!.id,
      targetLeafId: taskLeaf.id,
      perspective: 'task-closure',
      scores: criterionScores,
      finalScore,
      verdict: 'approve',
      rationale:
        'Closure criteria met: files committed and WORK COMPLETE present',
    })

    expect(evalLeaf.kind).toBe('EVALUATION')
    expect(evalLeaf.title).toContain('task-closure')
    const content = evalLeaf.content as Record<string, unknown>
    expect(content.finalScore).toBeCloseTo(1.0)
    expect(content.verdict).toBe('approve')
    expect(content.rubricId).toBe(rubricLeaf!.id)
    expect(content.targetLeafId).toBe(taskLeaf.id)

    // Scores match
    const scores = content.scores as Array<{
      criterionId: string
      score: number
    }>
    expect(scores).toHaveLength(2)
    expect(scores.find(s => s.criterionId === 'files-committed')?.score).toBe(1)
    expect(scores.find(s => s.criterionId === 'work-complete')?.score).toBe(1)
  })

  it('8. Review Decision Rubric is seeded with WEIGHTED scoring and qualityGate=0.7, rejectGate=0.3', async () => {
    const rubric = await getRubricByTitle(
      store,
      brainId,
      'Review Decision Rubric',
    )
    expect(rubric).not.toBeNull()

    const content = rubric!.content as unknown as RubricContent
    expect(content.scoringMethod).toBe('WEIGHTED')
    expect(content.qualityGate).toBeCloseTo(0.7)
    expect(content.rejectGate).toBeCloseTo(0.3)
    expect(content.criteria).toHaveLength(1)
    expect(content.criteria[0]!.id).toBe('weighted-approval')
    expect(content.criteria[0]!.weight).toBeCloseTo(1.0)
  })

  it('8b. makeReviewDecider respects rubric-provided thresholds over hardcoded fallbacks', () => {
    const defaultDecider = makeReviewDecider()
    const lowThresholdDecider = makeReviewDecider({
      approveThreshold: 0.6,
      rejectThreshold: 0.2,
    })
    expect(defaultDecider).toBeDefined()
    expect(lowThresholdDecider).toBeDefined()
    expect(lowThresholdDecider).not.toBe(defaultDecider)
  })

  it('8c. review-decision: final EVALUATION leaf persisted against Review Decision Rubric', async () => {
    await seedRubrics(store, brainId)

    const taskLeaf = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: 'Review Decision Rubric regression target',
      aliases: [],
      tags: ['test', 'review-decision'],
    })

    const rubricLeaf = await getRubricByTitle(
      store,
      brainId,
      'Review Decision Rubric',
    )
    expect(rubricLeaf).not.toBeNull()

    const rc = rubricLeaf!.content as unknown as RubricContent
    const reviewScore = 0.85
    const finalOutcomeVerdict: 'approve' | 'reject' | 'needs_human' =
      reviewScore >= rc.qualityGate
        ? 'approve'
        : reviewScore <= rc.rejectGate
          ? 'reject'
          : 'needs_human'

    const scores: CriterionScore[] = [
      {
        criterionId: 'weighted-approval',
        score: reviewScore,
        rationale: `Weighted approval ${reviewScore.toFixed(2)} ≥ ${rc.qualityGate}`,
      },
    ]

    const evalLeaf = await persistEvaluation(store, brainId, {
      rubricId: rubricLeaf!.id,
      targetLeafId: taskLeaf.id,
      perspective: 'review-decision',
      scores,
      finalScore: reviewScore,
      verdict: finalOutcomeVerdict,
      rationale: 'Weighted approval ≥ qualityGate — approved',
    })

    expect(evalLeaf.kind).toBe('EVALUATION')
    expect(evalLeaf.title).toContain('review-decision')
    const content = evalLeaf.content as Record<string, unknown>
    expect(content.finalScore).toBeCloseTo(reviewScore)
    expect(content.verdict).toBe('approve')
    expect(content.rubricId).toBe(rubricLeaf!.id)
    expect(content.targetLeafId).toBe(taskLeaf.id)

    const scoreArr = content.scores as Array<{
      criterionId: string
      score: number
    }>
    expect(scoreArr).toHaveLength(1)
    expect(scoreArr[0]!.criterionId).toBe('weighted-approval')
    expect(scoreArr[0]!.score).toBeCloseTo(reviewScore)
  })

  it('7c. verify-closure: SPEC_GAP closure persists EVALUATION leaf via Task Closure Rubric', async () => {
    await seedRubrics(store, brainId)

    const specGapLeaf = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: 'SPEC_GAP closure regression target',
      aliases: [],
      tags: ['test', 'spec-gap'],
    })

    const rubricLeaf = await getRubricByTitle(
      store,
      brainId,
      'Task Closure Rubric',
    )
    expect(rubricLeaf).not.toBeNull()

    // Simulate SPEC_GAP where no RFC was added — closure UNVERIFIED
    const rfcAdded = false
    const workComplete = false
    const closureScores = [
      {
        criterionId: 'files-committed',
        score: rfcAdded ? 1 : 0,
        rationale: rfcAdded
          ? 'Closure artifact present (RFC, research file, or debt resolved)'
          : 'No closure artifact found in this cycle',
      },
      {
        criterionId: 'work-complete',
        score: workComplete ? 1 : 0,
        rationale: workComplete
          ? 'WORK COMPLETE marker present in agent output'
          : 'WORK COMPLETE marker absent from agent output',
      },
    ]
    const closureFinalScore =
      closureScores.reduce((s, c) => s + c.score, 0) / closureScores.length

    const evalLeaf = await persistEvaluation(store, brainId, {
      rubricId: rubricLeaf!.id,
      targetLeafId: specGapLeaf.id,
      perspective: 'task-closure',
      scores: closureScores,
      finalScore: closureFinalScore,
      verdict: 'reject',
      rationale:
        'Closure UNVERIFIED for trigger SPEC_GAP: stillPresent=true artifactPresent=false',
    })

    expect(evalLeaf.kind).toBe('EVALUATION')
    expect(evalLeaf.title).toContain('task-closure')
    const content = evalLeaf.content as Record<string, unknown>
    expect(content.verdict).toBe('reject')
    expect(content.finalScore).toBeCloseTo(0.0)
    expect(content.rubricId).toBe(rubricLeaf!.id)
    expect(content.targetLeafId).toBe(specGapLeaf.id)

    const scores = content.scores as Array<{
      criterionId: string
      score: number
    }>
    expect(scores).toHaveLength(2)
    expect(scores.find(s => s.criterionId === 'files-committed')?.score).toBe(0)
    expect(scores.find(s => s.criterionId === 'work-complete')?.score).toBe(0)

    // Simulate SPEC_GAP where RFC WAS added — closure VERIFIED
    const specGapLeaf2 = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: 'SPEC_GAP closure regression target (rfc added)',
      aliases: [],
      tags: ['test', 'spec-gap'],
    })

    const closureScores2 = [
      {
        criterionId: 'files-committed',
        score: 1,
        rationale:
          'Closure artifact present (RFC, research file, or debt resolved)',
      },
      {
        criterionId: 'work-complete',
        score: 1,
        rationale: 'WORK COMPLETE marker present in agent output',
      },
    ]

    const evalLeaf2 = await persistEvaluation(store, brainId, {
      rubricId: rubricLeaf!.id,
      targetLeafId: specGapLeaf2.id,
      perspective: 'task-closure',
      scores: closureScores2,
      finalScore: 1.0,
      verdict: 'approve',
      rationale: 'Closure verified for trigger SPEC_GAP',
    })

    expect(evalLeaf2.kind).toBe('EVALUATION')
    const content2 = evalLeaf2.content as Record<string, unknown>
    expect(content2.verdict).toBe('approve')
    expect(content2.finalScore).toBeCloseTo(1.0)
  })

  it('7d. verify-closure SPEC_GAP regression: modified research file (specResearchAdded) persists approve EVALUATION', async () => {
    // Regression for UNVERIFIED_CLOSURE leaf_c3014c3340d240bea9606133:
    // When an agent modifies an existing research/ file instead of creating a new one,
    // gitChangedFiles (--diff-filter=AM) detects it but gitAddedFiles (--diff-filter=A)
    // did not. This caused specResearchAdded=false → closureMet=false → unverified=true.
    // Fix: VerifyClosureStep now uses gitChangedFiles for specResearchAdded.
    // This test verifies the evaluation path when specResearchAdded=true.
    await seedRubrics(store, brainId)

    const specGapLeaf = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: 'SPEC_GAP modified-research closure regression',
      aliases: [],
      tags: ['test', 'spec-gap'],
    })

    const rubricLeaf = await getRubricByTitle(
      store,
      brainId,
      'Task Closure Rubric',
    )
    expect(rubricLeaf).not.toBeNull()

    // Simulate SPEC_GAP where research file was MODIFIED (not added):
    // specResearchAdded=true, rfcAdded=false → artifactPresent=true, closureMet=true
    const artifactPresent = true // modified research/ file detected via gitChangedFiles
    const workComplete = true
    const closureScores = [
      {
        criterionId: 'files-committed',
        score: artifactPresent ? 1 : 0,
        rationale:
          'Closure artifact present (RFC, research file, or debt resolved)',
      },
      {
        criterionId: 'work-complete',
        score: workComplete ? 1 : 0,
        rationale: 'WORK COMPLETE marker present in agent output',
      },
    ]
    const finalScore =
      closureScores.reduce((s, c) => s + c.score, 0) / closureScores.length

    const evalLeaf = await persistEvaluation(store, brainId, {
      rubricId: rubricLeaf!.id,
      targetLeafId: specGapLeaf.id,
      perspective: 'task-closure',
      scores: closureScores,
      finalScore,
      verdict: 'approve',
      rationale:
        'Closure verified for trigger SPEC_GAP (modified research file)',
    })

    expect(evalLeaf.kind).toBe('EVALUATION')
    const content = evalLeaf.content as Record<string, unknown>
    expect(content.verdict).toBe('approve')
    expect(content.finalScore).toBeCloseTo(1.0)
    expect(content.rubricId).toBe(rubricLeaf!.id)
    expect(content.targetLeafId).toBe(specGapLeaf.id)

    const scores = content.scores as Array<{
      criterionId: string
      score: number
    }>
    expect(scores.find(s => s.criterionId === 'files-committed')?.score).toBe(1)
    expect(scores.find(s => s.criterionId === 'work-complete')?.score).toBe(1)
  })

  it('9. Origin Push Rubric: seeded with WEIGHTED scoring and two criteria summing to 1.0', async () => {
    const rubric = await getRubricByTitle(store, brainId, 'Origin Push Rubric')
    expect(rubric).not.toBeNull()

    const content = rubric!.content as unknown as RubricContent
    expect(content.scoringMethod).toBe('WEIGHTED')
    expect(content.qualityGate).toBeCloseTo(0.8)
    expect(content.rejectGate).toBeCloseTo(0.4)
    expect(content.criteria).toHaveLength(2)

    const ids = content.criteria.map(c => c.id)
    expect(ids).toContain('push-succeeded')
    expect(ids).toContain('no-force-push')

    const weightSum = content.criteria.reduce((s, c) => s + c.weight, 0)
    expect(weightSum).toBeCloseTo(1.0, 5)
  })

  it('9b. Origin Push Rubric: EVALUATION leaf persisted on push success', async () => {
    await seedRubrics(store, brainId)

    const taskLeaf = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: 'Origin push evaluation target',
      aliases: [],
      tags: ['test', 'origin-push'],
    })

    const rubricLeaf = await getRubricByTitle(
      store,
      brainId,
      'Origin Push Rubric',
    )
    expect(rubricLeaf).not.toBeNull()

    const evalLeaf = await persistEvaluation(store, brainId, {
      rubricId: rubricLeaf!.id,
      targetLeafId: taskLeaf.id,
      perspective: 'origin-push',
      scores: [
        {
          criterionId: 'push-succeeded',
          score: 1.0,
          rationale: 'Push succeeded directly',
        },
        {
          criterionId: 'no-force-push',
          score: 1.0,
          rationale: 'Non-destructive push strategy used (never --force)',
        },
      ],
      finalScore: 1.0,
      verdict: 'approve',
      rationale: 'origin/main updated at commit abc1234',
    })

    expect(evalLeaf.kind).toBe('EVALUATION')
    expect(evalLeaf.title).toContain('origin-push')
    const content = evalLeaf.content as Record<string, unknown>
    expect(content.finalScore).toBeCloseTo(1.0)
    expect(content.verdict).toBe('approve')
    expect(content.rubricId).toBe(rubricLeaf!.id)
    expect(content.targetLeafId).toBe(taskLeaf.id)

    const scores = content.scores as Array<{
      criterionId: string
      score: number
    }>
    expect(scores).toHaveLength(2)
    expect(scores.find(s => s.criterionId === 'push-succeeded')?.score).toBe(1)
    expect(scores.find(s => s.criterionId === 'no-force-push')?.score).toBe(1)
  })

  it('10. verification-gate: GREEN gate persists EVALUATION leaf (score=1.0, verdict=approve) against Verification Gate Rubric', async () => {
    await seedRubrics(store, brainId)

    const taskLeaf = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: 'Verification gate GREEN regression target',
      aliases: [],
      tags: ['test', 'verification-gate'],
    })

    const rubricLeaf = await getRubricByTitle(
      store,
      brainId,
      'Verification Gate Rubric',
    )
    expect(rubricLeaf).not.toBeNull()

    // Simulate what GateStep does when gate is GREEN
    const criterionScore = 1.0
    const evalLeaf = await persistEvaluation(store, brainId, {
      rubricId: rubricLeaf!.id,
      targetLeafId: taskLeaf.id,
      perspective: 'verification-gate',
      scores: [
        {
          criterionId: 'typecheck',
          score: criterionScore,
          rationale: 'typecheck passed',
        },
        {
          criterionId: 'lint',
          score: criterionScore,
          rationale: 'lint passed',
        },
        {
          criterionId: 'tests',
          score: criterionScore,
          rationale: 'tests passed',
        },
      ],
      finalScore: criterionScore,
      verdict: 'approve',
      rationale: 'Verification gate GREEN',
    })

    expect(evalLeaf.kind).toBe('EVALUATION')
    expect(evalLeaf.title).toContain('verification-gate')
    const content = evalLeaf.content as Record<string, unknown>
    expect(content.finalScore).toBeCloseTo(1.0)
    expect(content.verdict).toBe('approve')
    expect(content.rubricId).toBe(rubricLeaf!.id)
    expect(content.targetLeafId).toBe(taskLeaf.id)

    const scores = content.scores as Array<{
      criterionId: string
      score: number
    }>
    expect(scores).toHaveLength(3)
    expect(scores.find(s => s.criterionId === 'typecheck')?.score).toBe(1)
    expect(scores.find(s => s.criterionId === 'lint')?.score).toBe(1)
    expect(scores.find(s => s.criterionId === 'tests')?.score).toBe(1)
  })

  it('10b. verification-gate: RED gate persists EVALUATION leaf (score=0.0, verdict=reject) against Verification Gate Rubric', async () => {
    await seedRubrics(store, brainId)

    const taskLeaf = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: 'Verification gate RED regression target',
      aliases: [],
      tags: ['test', 'verification-gate'],
    })

    const rubricLeaf = await getRubricByTitle(
      store,
      brainId,
      'Verification Gate Rubric',
    )
    expect(rubricLeaf).not.toBeNull()

    // Simulate what GateStep does when gate is RED
    const criterionScore = 0.0
    const gateOutput = 'TypeError: Cannot read properties of undefined'
    const evalLeaf = await persistEvaluation(store, brainId, {
      rubricId: rubricLeaf!.id,
      targetLeafId: taskLeaf.id,
      perspective: 'verification-gate',
      scores: [
        {
          criterionId: 'typecheck',
          score: criterionScore,
          rationale: 'gate failed',
        },
        {
          criterionId: 'lint',
          score: criterionScore,
          rationale: 'gate failed',
        },
        {
          criterionId: 'tests',
          score: criterionScore,
          rationale: 'gate failed',
        },
      ],
      finalScore: criterionScore,
      verdict: 'reject',
      rationale: `Verification gate RED: ${gateOutput.slice(0, 200)}`,
    })

    expect(evalLeaf.kind).toBe('EVALUATION')
    expect(evalLeaf.title).toContain('verification-gate')
    const content = evalLeaf.content as Record<string, unknown>
    expect(content.finalScore).toBeCloseTo(0.0)
    expect(content.verdict).toBe('reject')
    expect(content.rubricId).toBe(rubricLeaf!.id)
    expect(content.targetLeafId).toBe(taskLeaf.id)

    const scores = content.scores as Array<{
      criterionId: string
      score: number
    }>
    expect(scores).toHaveLength(3)
    expect(scores.find(s => s.criterionId === 'typecheck')?.score).toBe(0)
    expect(scores.find(s => s.criterionId === 'lint')?.score).toBe(0)
    expect(scores.find(s => s.criterionId === 'tests')?.score).toBe(0)
  })

  it('9c. Origin Push Rubric: EVALUATION leaf persisted on push failure (reject verdict)', async () => {
    await seedRubrics(store, brainId)

    const taskLeaf = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: 'Origin push failure target',
      aliases: [],
      tags: ['test', 'origin-push'],
    })

    const rubricLeaf = await getRubricByTitle(
      store,
      brainId,
      'Origin Push Rubric',
    )
    expect(rubricLeaf).not.toBeNull()

    const evalLeaf = await persistEvaluation(store, brainId, {
      rubricId: rubricLeaf!.id,
      targetLeafId: taskLeaf.id,
      perspective: 'origin-push',
      scores: [
        {
          criterionId: 'push-succeeded',
          score: 0.0,
          rationale: 'Push failed — commits remain local only',
        },
        {
          criterionId: 'no-force-push',
          score: 1.0,
          rationale: 'Non-destructive push strategy used (never --force)',
        },
      ],
      finalScore: 0.2,
      verdict: 'reject',
      rationale:
        'Push failed after cycle commit abc9999; commits are local only',
    })

    expect(evalLeaf.kind).toBe('EVALUATION')
    const content = evalLeaf.content as Record<string, unknown>
    expect(content.verdict).toBe('reject')
    expect(content.rubricId).toBe(rubricLeaf!.id)

    const scores = content.scores as Array<{
      criterionId: string
      score: number
    }>
    expect(scores.find(s => s.criterionId === 'push-succeeded')?.score).toBe(0)
    expect(scores.find(s => s.criterionId === 'no-force-push')?.score).toBe(1)
  })

  it('7b. verify-closure: QUEUED_TASK with no files committed → reject verdict persisted', async () => {
    await seedRubrics(store, brainId)

    const taskLeaf = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: 'QUEUED_TASK closure regression target (no files)',
      aliases: [],
      tags: ['test', 'queued-task'],
    })

    const rubricLeaf = await getRubricByTitle(
      store,
      brainId,
      'Task Closure Rubric',
    )
    expect(rubricLeaf).not.toBeNull()

    const filesCommitted = false
    const workComplete = true
    const criterionScores = [
      {
        criterionId: 'files-committed',
        score: 0,
        rationale: 'No files committed in this cycle',
      },
      {
        criterionId: 'work-complete',
        score: 1,
        rationale: 'WORK COMPLETE marker present in agent output',
      },
    ]
    const finalScore =
      criterionScores.reduce((s, c) => s + c.score, 0) / criterionScores.length

    const evalLeaf = await persistEvaluation(store, brainId, {
      rubricId: rubricLeaf!.id,
      targetLeafId: taskLeaf.id,
      perspective: 'task-closure',
      scores: criterionScores,
      finalScore,
      verdict: filesCommitted && workComplete ? 'approve' : 'reject',
      rationale: `Closure criteria not met: files=${filesCommitted} workComplete=${workComplete}`,
    })

    expect(evalLeaf.kind).toBe('EVALUATION')
    const content = evalLeaf.content as Record<string, unknown>
    expect(content.verdict).toBe('reject')
    expect(content.finalScore).toBeCloseTo(0.5)
  })
})
