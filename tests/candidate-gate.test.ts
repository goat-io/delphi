// tests/candidate-gate.test.ts — Regression coverage for the candidate resolution gate.
// Verifies: gate reads RUBRIC leaf, persists EVALUATION leaf, scores reflect pipeline stats.

import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureSeededRegions } from '@goatlab/delphi-indexer'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  CANDIDATE_RUBRIC_TITLE,
  runCandidateGate,
} from '../scripts/candidate-gate.js'
import type { RubricContent } from '../scripts/rubrics.js'
import { getRubricByTitle, seedRubrics } from '../scripts/rubrics.js'

let store: BrainStore
let brainId: string
let targetLeafId: string
let db: any

beforeAll(async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'delphi-cgate-'))
  db = await createDb({ dataDir: tmpDir })
  await migrate(db)
  store = new BrainStore(db)

  const brain = await store.createBrain('delphi', 'Candidate gate test brain')
  brainId = brain.id
  await ensureSeededRegions(store, brainId, ['Objectives'])
  await seedRubrics(store, brainId)

  const target = await store.createLeaf({
    brainId,
    kind: 'TASK',
    status: 'ACTIVE',
    title: 'Candidate gate target task',
    aliases: [],
    tags: ['test'],
  })
  targetLeafId = target.id
}, 30_000)

afterAll(async () => {
  await db.close()
})

describe('candidate-gate', () => {
  it('1. Candidate Resolution Rubric is seeded with 3 criteria summing to 1.0', async () => {
    const rubric = await getRubricByTitle(
      store,
      brainId,
      CANDIDATE_RUBRIC_TITLE,
    )
    expect(rubric).not.toBeNull()

    const content = rubric!.content as unknown as RubricContent
    expect(content.scoringMethod).toBe('WEIGHTED')
    expect(content.qualityGate).toBeCloseTo(0.7)
    expect(content.rejectGate).toBeCloseTo(0.4)
    expect(content.criteria).toHaveLength(3)

    const ids = content.criteria.map(c => c.id)
    expect(ids).toContain('flagged-ratio-acceptable')
    expect(ids).toContain('candidate-yield')
    expect(ids).toContain('resolution-completeness')

    const weightSum = content.criteria.reduce((s, c) => s + c.weight, 0)
    expect(weightSum).toBeCloseTo(1.0, 5)
  })

  it('2. Good run (no flagged, all created) → approve verdict + EVALUATION leaf persisted', async () => {
    const result = await runCandidateGate(store, brainId, {
      targetLeafId,
      candidates: 10,
      created: 10,
      merged: 0,
      linked: 0,
      flagged: 0,
    })

    expect(result.verdict).toBe('approve')
    expect(result.finalScore).toBeGreaterThanOrEqual(0.7)
    expect(result.evaluationLeafId).toBeTruthy()

    const evalLeaf = await store.getLeaf(result.evaluationLeafId)
    expect(evalLeaf).not.toBeNull()
    expect(evalLeaf!.kind).toBe('EVALUATION')
    expect(evalLeaf!.title).toContain('candidate-resolution')

    const content = evalLeaf!.content as Record<string, unknown>
    expect(content.verdict).toBe('approve')
    expect(content.rubricId).toBeTruthy()
    expect(content.targetLeafId).toBe(targetLeafId)

    const scores = content.scores as Array<{
      criterionId: string
      score: number
    }>
    expect(
      scores.find(s => s.criterionId === 'flagged-ratio-acceptable')?.score,
    ).toBeCloseTo(1)
    expect(
      scores.find(s => s.criterionId === 'candidate-yield')?.score,
    ).toBeCloseTo(1)
    expect(
      scores.find(s => s.criterionId === 'resolution-completeness')?.score,
    ).toBeCloseTo(1)
  })

  it('3. High flagged ratio (all flagged) → reject or needs_human verdict', async () => {
    const target2 = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: 'High flagged ratio target',
      aliases: [],
      tags: ['test'],
    })

    const result = await runCandidateGate(store, brainId, {
      targetLeafId: target2.id,
      candidates: 10,
      created: 0,
      merged: 0,
      linked: 0,
      flagged: 10,
    })

    expect(['reject', 'needs_human']).toContain(result.verdict)
    expect(result.finalScore).toBeLessThan(0.7)

    const evalLeaf = await store.getLeaf(result.evaluationLeafId)
    expect(evalLeaf!.kind).toBe('EVALUATION')

    const content = evalLeaf!.content as Record<string, unknown>
    expect(content.targetLeafId).toBe(target2.id)
    const scores = content.scores as Array<{
      criterionId: string
      score: number
    }>
    expect(
      scores.find(s => s.criterionId === 'flagged-ratio-acceptable')?.score,
    ).toBeLessThan(1)
  })

  it('4. Zero candidates → reject verdict (no yield)', async () => {
    const target3 = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: 'Zero candidates target',
      aliases: [],
      tags: ['test'],
    })

    const result = await runCandidateGate(store, brainId, {
      targetLeafId: target3.id,
      candidates: 0,
      created: 0,
      merged: 0,
      linked: 0,
      flagged: 0,
    })

    expect(result.verdict).toBe('reject')
    expect(result.finalScore).toBeLessThan(0.4)
  })

  it('5. Gate reads thresholds from RUBRIC leaf, not hardcoded fallbacks', async () => {
    const rubric = await getRubricByTitle(
      store,
      brainId,
      CANDIDATE_RUBRIC_TITLE,
    )
    expect(rubric).not.toBeNull()

    const content = rubric!.content as unknown as RubricContent
    // Verify the rubric leaf id is recorded in the evaluation content
    const target4 = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: 'Rubric id recorded target',
      aliases: [],
      tags: ['test'],
    })

    const result = await runCandidateGate(store, brainId, {
      targetLeafId: target4.id,
      candidates: 5,
      created: 5,
      merged: 0,
      linked: 0,
      flagged: 0,
    })

    const evalLeaf = await store.getLeaf(result.evaluationLeafId)
    const evalContent = evalLeaf!.content as Record<string, unknown>

    // rubricId should be the actual leaf id (not the fallback title string)
    expect(evalContent.rubricId).toBe(rubric!.id)
    // qualityGate from rubric should determine approve
    expect(result.finalScore).toBeGreaterThanOrEqual(content.qualityGate)
    expect(result.verdict).toBe('approve')
  })

  it('6. persistEvaluation is idempotent: second call with same target+perspective returns same leaf', async () => {
    const target5 = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: 'Idempotency test target',
      aliases: [],
      tags: ['test'],
    })

    const r1 = await runCandidateGate(store, brainId, {
      targetLeafId: target5.id,
      candidates: 3,
      created: 3,
      merged: 0,
      linked: 0,
      flagged: 0,
    })
    const r2 = await runCandidateGate(store, brainId, {
      targetLeafId: target5.id,
      candidates: 3,
      created: 3,
      merged: 0,
      linked: 0,
      flagged: 0,
    })

    // Both calls return the same evaluation leaf (idempotent)
    expect(r1.evaluationLeafId).toBe(r2.evaluationLeafId)
  })
})
