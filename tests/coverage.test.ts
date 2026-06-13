import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureSeededRegions } from '@goatlab/delphi-indexer'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { assessCoverage, COVERAGE_TARGET } from '../scripts/coverage.js'
import type { DebtItem } from '../scripts/evolve.js'
import { buildWorkPrompt, scanDebt } from '../scripts/evolve.js'

let store: BrainStore
let brainId: string

beforeAll(async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'delphi-coverage-'))
  const db = await createDb({ dataDir: tmpDir })
  await migrate(db)
  store = new BrainStore(db)

  const brain = await store.createBrain('delphi', 'Test brain for coverage')
  brainId = brain.id
}, 30_000)

afterAll(async () => {
  await store.db.close()
})

describe('assessCoverage', () => {
  it('1. well-covered region with deep index + 8 high-confidence beliefs + no open questions → score ≥ COVERAGE_TARGET', async () => {
    await ensureSeededRegions(store, brainId, ['Well Covered'])
    const region = await store.getRegionByTitle(brainId, 'Well Covered')
    const regionId = region!.id

    // Create 8 BELIEF leaves with high confidence
    const beliefIds: string[] = []
    for (let i = 0; i < 8; i++) {
      const leaf = await store.createLeaf({
        brainId,
        kind: 'BELIEF',
        status: 'ACTIVE',
        title: `Well Covered Belief ${i + 1}`,
        statement: `This is a well-supported belief about the well-covered region, statement ${i + 1}.`,
        aliases: [],
        tags: [],
        regionId,
        confidence: {
          value: 0.85,
          evidenceStrength: 0.9,
          sourceReliability: 0.8,
          sourceDiversity: 0.7,
          freshness: 0.9,
          consensus: 0.8,
          contradictionRisk: 0.1,
        },
      })
      beliefIds.push(leaf.id)
    }

    // Add evidence to each belief (2 per belief)
    const asset = await store.createAsset({
      brainId,
      type: 'TEXT',
      title: 'Test Asset',
      uri: 'test://asset',
      checksum: 'abc123',
    })
    for (const beliefId of beliefIds) {
      for (let j = 0; j < 2; j++) {
        await store.createEvidence({
          brainId,
          leafId: beliefId,
          assetId: asset.id,
          citation: `Section ${j + 1}`,
          relation: 'SUPPORTS',
          strength: 0.85,
          extractionConfidence: 0.9,
        })
      }
    }

    // Create a deep index using raw upsert
    await store.upsertIndex({
      brainId,
      regionId,
      title: 'Well Covered Index',
      summaryTiny: 'Tiny summary',
      summaryShort: 'Short summary of the well-covered region.',
      summaryMedium:
        'Medium summary of the well-covered region. This summary is more detailed and explains the core concepts in depth.',
      summaryLong:
        'Long summary of the well-covered region. This is a very detailed summary that covers all the key aspects of the region, including its main beliefs, questions, and evidence. It provides a thorough overview for any agent navigating to this region to understand what it contains and what knowledge is established here with high confidence.',
      keyConcepts: ['concept-a', 'concept-b'],
      keyBeliefs: beliefIds.slice(0, 3),
      keyQuestions: [],
      representativeLeafIds: beliefIds,
      stale: false,
      changedLeafCount: 0,
    })

    const results = await assessCoverage(store, brainId)
    const rc = results.find(r => r.regionTitle === 'Well Covered')

    expect(rc).toBeDefined()
    expect(rc!.score).toBeGreaterThanOrEqual(COVERAGE_TARGET)
  })

  it('2. sparse region (2 beliefs, no index, low confidence) → score < COVERAGE_TARGET with gaps listed', async () => {
    await ensureSeededRegions(store, brainId, ['Sparse Region'])
    const region = await store.getRegionByTitle(brainId, 'Sparse Region')
    const regionId = region!.id

    // Only 2 beliefs, low confidence, no evidence
    for (let i = 0; i < 2; i++) {
      await store.createLeaf({
        brainId,
        kind: 'BELIEF',
        status: 'ACTIVE',
        title: `Sparse Belief ${i + 1}`,
        aliases: [],
        tags: [],
        regionId,
        confidence: {
          value: 0.3,
          evidenceStrength: 0.2,
          sourceReliability: 0.3,
          sourceDiversity: 0.2,
          freshness: 0.3,
          consensus: 0.2,
          contradictionRisk: 0.7,
        },
      })
    }

    const results = await assessCoverage(store, brainId)
    const rc = results.find(r => r.regionTitle === 'Sparse Region')

    expect(rc).toBeDefined()
    expect(rc!.score).toBeLessThan(COVERAGE_TARGET)
    expect(rc!.gaps.length).toBeGreaterThan(0)
    // Should mention shallow/missing index and few beliefs
    const gapText = rc!.gaps.join(' ')
    expect(gapText).toMatch(/index|beliefs/)
  })

  it('3. scanDebt emits COVERAGE_GAP at priority 85 for under-covered region, sorts above SPEC_GAP (30) and OPEN_QUESTION (20)', async () => {
    await ensureSeededRegions(store, brainId, ['Under Covered Scan Test'])
    const region = await store.getRegionByTitle(
      brainId,
      'Under Covered Scan Test',
    )
    const regionId = region!.id

    // Add a single belief — clearly under target
    await store.createLeaf({
      brainId,
      kind: 'BELIEF',
      status: 'ACTIVE',
      title: 'Lone belief in scan test region',
      aliases: [],
      tags: [],
      regionId,
    })

    const debt = await scanDebt(store, brainId)

    const coverageGapItem = debt.find(
      d =>
        d.trigger === 'COVERAGE_GAP' &&
        d.targetTitle === 'Under Covered Scan Test',
    )
    expect(coverageGapItem).toBeDefined()
    expect(coverageGapItem!.priority).toBe(85)

    // Must sort above SPEC_GAP (30) and OPEN_QUESTION (20)
    const specGapItems = debt.filter(d => d.trigger === 'SPEC_GAP')
    const openQItems = debt.filter(d => d.trigger === 'OPEN_QUESTION')

    for (const sg of specGapItems) {
      expect(coverageGapItem!.priority).toBeGreaterThan(sg.priority)
    }
    for (const oq of openQItems) {
      expect(coverageGapItem!.priority).toBeGreaterThan(oq.priority)
    }

    // List must be sorted descending
    for (let i = 1; i < debt.length; i++) {
      expect((debt[i - 1] as DebtItem).priority).toBeGreaterThanOrEqual(
        (debt[i] as DebtItem).priority,
      )
    }
  })

  it('4. buildWorkPrompt COVERAGE_GAP contains "DEEPEN", "WORK COMPLETE", and the no-invent rule', () => {
    const item: DebtItem = {
      trigger: 'COVERAGE_GAP',
      target: 'region-test-id',
      targetTitle: 'Test Coverage Region',
      detail:
        "region 'Test Coverage Region' coverage 0.42 < 0.75 — gaps: no index, few beliefs (2/8)",
      priority: 85,
    }

    const fakeTask = {
      id: 'task-coverage-001',
      kind: 'TASK' as const,
      status: 'ACTIVE' as const,
      title: '[COVERAGE_GAP] Test Coverage Region',
      brainId: 'brain-test',
      aliases: [],
      tags: [],
      version: 1,
      content: {
        trigger: 'COVERAGE_GAP',
        target: 'region-test-id',
        priority: 85,
        origin: 'evolve-harness',
        closureCriteria:
          'region coverage score increased toward the target (more evidence-backed beliefs and/or answered questions)',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const prompt = buildWorkPrompt(
      item,
      fakeTask as Parameters<typeof buildWorkPrompt>[1],
    )

    expect(prompt).toContain('DEEPEN')
    expect(prompt).toContain('WORK COMPLETE')
    expect(prompt).toContain('do NOT invent content')
    expect(prompt).toContain('Test Coverage Region')
  })

  it('5. region at or above coverage target emits no COVERAGE_GAP debt item', async () => {
    // 'Well Covered' was seeded in test 1 with score ≥ COVERAGE_TARGET
    const debt = await scanDebt(store, brainId)
    const coverageGapItems = debt.filter(d => d.trigger === 'COVERAGE_GAP')

    // Verify that the 'Well Covered' region is NOT in coverage gap items
    const wellCoveredGap = coverageGapItems.find(
      d => d.targetTitle === 'Well Covered',
    )
    expect(wellCoveredGap).toBeUndefined()
  })
})
