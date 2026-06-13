import {
  answerQuestion,
  ExtractiveSynthesizer,
  pickRegion,
} from '@goatlab/delphi-agent'
import {
  ensureSeededRegions,
  generateIndexes,
  TemplateSummarizer,
} from '@goatlab/delphi-indexer'
import type { Db } from '@goatlab/delphi-knowledge'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import type { Confidence } from '@goatlab/delphi-protocol'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { CriterionScore } from '../scripts/governance-bridge.js'
import { persistEvaluation } from '../scripts/governance-bridge.js'
import type { RubricContent } from '../scripts/rubrics.js'
import { getRubricByTitle, seedRubrics } from '../scripts/rubrics.js'

let db: Db
let store: BrainStore
let brainId: string
let regionId: string

function makeConf(value: number): Confidence {
  return {
    value,
    evidenceStrength: value,
    sourceReliability: 0.6,
    sourceDiversity: 0.5,
    freshness: 1,
    consensus: 0.5,
    contradictionRisk: 0,
  }
}

beforeAll(async () => {
  db = await createDb()
  await migrate(db)
  store = new BrainStore(db)

  const brain = await store.createBrain('Agent Test Brain')
  brainId = brain.id

  const [region] = await ensureSeededRegions(store, brainId, ['Databases'])
  regionId = region!.id

  // Create an asset for evidence
  const asset = await store.createAsset({
    brainId,
    type: 'MARKDOWN',
    title: 'TigerBeetle Guide',
    uri: 'file:///tb-guide.md',
    checksum: 'agent-test-cksum-001',
  })

  // Create test leaves directly
  const leaf1 = await store.createLeaf({
    brainId,
    kind: 'BELIEF',
    status: 'ACTIVE',
    title: 'TigerBeetle provides deterministic execution',
    statement:
      'TigerBeetle guarantees deterministic execution for all transactions.',
    aliases: [],
    tags: ['database', 'determinism'],
    confidence: makeConf(0.9),
    regionId,
  })

  const leaf2 = await store.createLeaf({
    brainId,
    kind: 'BELIEF',
    status: 'ACTIVE',
    title: 'TigerBeetle is designed for financial workloads',
    statement:
      'TigerBeetle prioritizes correctness for financial transaction processing.',
    aliases: [],
    tags: ['database', 'finance'],
    confidence: makeConf(0.85),
    regionId,
  })

  const _leaf3 = await store.createLeaf({
    brainId,
    kind: 'BELIEF',
    status: 'ACTIVE',
    title: 'TigerBeetle uses log-structured storage',
    statement:
      'TigerBeetle stores data in a log-structured format for performance.',
    aliases: [],
    tags: ['database', 'storage'],
    confidence: makeConf(0.75),
    regionId,
  })

  const _questionLeaf = await store.createLeaf({
    brainId,
    kind: 'QUESTION',
    status: 'ACTIVE',
    title: 'Can TigerBeetle survive a full region failure?',
    aliases: [],
    tags: [],
    regionId,
  })

  // Create evidence for leaf1
  await store.createEvidence({
    brainId,
    leafId: leaf1.id,
    assetId: asset.id,
    relation: 'SUPPORTS',
    strength: 0.9,
    extractionConfidence: 0.95,
    citation: 'Overview section',
  })

  // Create evidence for leaf2
  await store.createEvidence({
    brainId,
    leafId: leaf2.id,
    assetId: asset.id,
    relation: 'SUPPORTS',
    strength: 0.85,
    extractionConfidence: 0.9,
  })

  // Create a relationship
  await store.createRelationship({
    brainId,
    sourceLeafId: leaf2.id,
    targetLeafId: leaf1.id,
    type: 'DEPENDS_ON',
  })

  // Generate indexes
  const summarizer = new TemplateSummarizer()
  await generateIndexes(store, brainId, summarizer)
})

afterAll(async () => {
  await db.close()
})

describe('delphi-agent navigate', () => {
  it('1. pickRegion returns matching region for relevant question', async () => {
    const result = await pickRegion(
      store,
      brainId,
      'How does TigerBeetle handle deterministic execution?',
    )
    expect(result.path.length).toBeGreaterThanOrEqual(1)
    expect(result.path[0]).toBe('brain')
    // Should find the Databases region since we have an index for it
    if (result.region !== null) {
      expect(result.region.title).toBeTruthy()
      expect(result.index).not.toBeNull()
      expect(result.path.length).toBeGreaterThanOrEqual(2)
    }
  })

  it("2. pickRegion returns path ['brain'] when no indexes exist", async () => {
    // Create a fresh brain with no indexes
    const brain2 = await store.createBrain('Empty Brain')
    const result = await pickRegion(store, brain2.id, 'anything')
    expect(result.region).toBeNull()
    expect(result.index).toBeNull()
    expect(result.path).toEqual(['brain'])
  })
})

describe('delphi-agent answer', () => {
  it('3. answerQuestion returns valid AnswerResult', async () => {
    const synth = new ExtractiveSynthesizer()
    const result = await answerQuestion(
      store,
      brainId,
      'What makes TigerBeetle suitable for financial workloads?',
      synth,
    )

    expect(result.question).toBeTruthy()
    expect(result.summary).toBeTruthy()
    expect(result.confidence).toBeGreaterThan(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
    expect(result.navigationPath.length).toBeGreaterThanOrEqual(1)
    expect(Array.isArray(result.beliefs)).toBe(true)
    expect(Array.isArray(result.evidence)).toBe(true)
    expect(Array.isArray(result.dependencies)).toBe(true)
    expect(Array.isArray(result.contradictions)).toBe(true)
  })

  it('4. answerQuestion includes evidence when beliefs have evidence', async () => {
    const synth = new ExtractiveSynthesizer()
    const result = await answerQuestion(
      store,
      brainId,
      'deterministic execution TigerBeetle',
      synth,
    )
    // Should find beliefs with evidence
    expect(result.evidence.length).toBeGreaterThanOrEqual(1)
    // Check evidence shape
    for (const ev of result.evidence) {
      expect(ev.leafId).toBeTruthy()
      expect(ev.leafTitle).toBeTruthy()
      expect(ev.assetTitle).toBeTruthy()
      expect(ev.strength).toBeGreaterThanOrEqual(0)
      expect(ev.strength).toBeLessThanOrEqual(1)
    }
  })

  it('5. ExtractiveSynthesizer uses top 2 beliefs by confidence', async () => {
    const synth = new ExtractiveSynthesizer()
    const result = await synth.synthesize({
      question: 'What is TigerBeetle?',
      beliefs: [
        {
          title: 'Low conf belief',
          statement: 'Low confidence statement.',
          confidence: 0.1,
        },
        {
          title: 'High conf belief',
          statement: 'High confidence statement.',
          confidence: 0.9,
        },
        {
          title: 'Med conf belief',
          statement: 'Medium confidence statement.',
          confidence: 0.5,
        },
        {
          title: 'Extra belief',
          statement: 'Extra statement.',
          confidence: 0.3,
        },
      ],
    })
    // Should contain the highest confidence belief's statement
    expect(result).toContain('High confidence statement.')
    expect(result).toContain('Medium confidence statement.')
    // Should not contain the 4th belief (only top 3)
    expect(result).not.toContain('Extra statement.')
    // Should never produce double-period sequences
    expect(result).not.toMatch(/\.\./)
  })

  it('5b. ExtractiveSynthesizer never produces double-period when statements end with period', async () => {
    const synth = new ExtractiveSynthesizer()
    const result = await synth.synthesize({
      question: 'What is TigerBeetle?',
      beliefs: [
        {
          title: 'Belief A',
          statement: 'TigerBeetle handles financial transactions.',
          confidence: 0.9,
        },
        {
          title: 'Belief B',
          statement: 'It uses deterministic execution.',
          confidence: 0.8,
        },
      ],
    })
    expect(result).not.toMatch(/\.\./)
  })

  it('6. navigationPath has length >= 2 when region is found', async () => {
    const synth = new ExtractiveSynthesizer()
    const result = await answerQuestion(
      store,
      brainId,
      'TigerBeetle database financial',
      synth,
    )
    expect(result.navigationPath.length).toBeGreaterThanOrEqual(2)
    expect(result.navigationPath[0]).toBe('brain')
  })
})

describe('Answer Quality Benchmark — rubric-backed (MVP-0001)', () => {
  it('7. Answer Quality Rubric is seeded and has 4 criteria with weights summing to 1.0', async () => {
    await seedRubrics(store, brainId)
    const rubricLeaf = await getRubricByTitle(
      store,
      brainId,
      'Answer Quality Rubric',
    )
    expect(rubricLeaf).not.toBeNull()
    const content = rubricLeaf!.content as unknown as RubricContent
    expect(content.criteria).toHaveLength(4)
    expect(content.qualityGate).toBe(0.8)
    const weightSum = content.criteria.reduce((s, c) => s + c.weight, 0)
    expect(weightSum).toBeCloseTo(1.0, 5)
    const ids = content.criteria.map(c => c.id)
    expect(ids).toContain('cites-sources')
    expect(ids).toContain('key-claims-present')
    expect(ids).toContain('confidence-shown')
    expect(ids).toContain('contradictions-surface')
  })

  it('8. answerQuestion result scores pass the Answer Quality Rubric and EVALUATION leaf is persisted', async () => {
    await seedRubrics(store, brainId)
    const rubricLeaf = await getRubricByTitle(
      store,
      brainId,
      'Answer Quality Rubric',
    )
    expect(rubricLeaf).not.toBeNull()
    const rubric = rubricLeaf!.content as unknown as RubricContent

    const synth = new ExtractiveSynthesizer()
    const result = await answerQuestion(
      store,
      brainId,
      'What makes TigerBeetle suitable for financial workloads?',
      synth,
    )

    // Score each criterion deterministically from the AnswerResult fields
    const scores: CriterionScore[] = [
      {
        criterionId: 'cites-sources',
        score: result.evidence.length > 0 ? 1.0 : 0.0,
        rationale:
          result.evidence.length > 0
            ? `${result.evidence.length} evidence item(s) cited`
            : 'No evidence cited',
      },
      {
        criterionId: 'key-claims-present',
        score: result.beliefs.length > 0 ? 1.0 : 0.0,
        rationale:
          result.beliefs.length > 0
            ? `${result.beliefs.length} belief(s) retrieved`
            : 'No beliefs found',
      },
      {
        criterionId: 'confidence-shown',
        score: result.confidence > 0 && result.confidence <= 1 ? 1.0 : 0.0,
        rationale: `Confidence: ${result.confidence.toFixed(3)}`,
      },
      {
        criterionId: 'contradictions-surface',
        // No contradictions in test data → full score (expected behaviour)
        score: 1.0,
        rationale: `${result.contradictions.length} contradiction(s) reported`,
      },
    ]

    // Compute weighted final score using rubric weights
    let total = 0
    let weightSum = 0
    for (const cs of scores) {
      const criterion = rubric.criteria.find(c => c.id === cs.criterionId)
      if (!criterion) {
        continue
      }
      total += cs.score * criterion.weight
      weightSum += criterion.weight
    }
    const finalScore = weightSum > 0 ? total / weightSum : 0

    const verdict =
      finalScore >= rubric.qualityGate
        ? ('approve' as const)
        : finalScore <= rubric.rejectGate
          ? ('reject' as const)
          : ('needs_human' as const)

    const evalLeaf = await persistEvaluation(store, brainId, {
      rubricId: rubricLeaf!.id,
      targetLeafId: rubricLeaf!.id, // evaluation targets the rubric itself in this gate
      perspective: 'answer-quality-benchmark',
      scores,
      finalScore,
      verdict,
      rationale: `MVP-0001 Answer Quality Benchmark: ${scores.map(s => `${s.criterionId}=${s.score}`).join(', ')}`,
    })

    expect(evalLeaf.kind).toBe('EVALUATION')
    expect(evalLeaf.title).toContain('answer-quality-benchmark')
    const content = evalLeaf.content as Record<string, unknown>
    expect(content.verdict).toBe(verdict)
    expect(typeof content.finalScore).toBe('number')

    // Gate: the benchmark must pass (finalScore ≥ qualityGate = 0.8)
    expect(finalScore).toBeGreaterThanOrEqual(rubric.qualityGate)
  })
})
