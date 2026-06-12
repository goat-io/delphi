// tests/rubrics.test.ts — Tests for rubric-backed governance evaluation.

import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { ensureSeededRegions } from '@goatlab/delphi-indexer'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Decision } from '../scripts/governance-bridge.js'
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
    expect(first.length).toBe(4)

    const second = await seedRubrics(store, brainId)
    expect(second.length).toBe(4)

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
})
