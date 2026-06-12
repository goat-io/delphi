import {
  detectHubRegions,
  ensureSeededRegions,
  generateIndexes,
  generateMaps,
  IndexScheduler,
  TemplateSummarizer,
} from '@goatlab/delphi-indexer'
import type { Db } from '@goatlab/delphi-knowledge'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import type { Confidence } from '@goatlab/delphi-protocol'
import { afterAll, describe, expect, it } from 'vitest'

let db: Db
let store: BrainStore
let brainId: string

// Leaf ids we need across tests
let objectLeafId: string
let b1Id: string
let b2Id: string
let b3Id: string
let b4Id: string
let databasesRegionId: string

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

async function setup() {
  db = await createDb()
  await migrate(db)
  store = new BrainStore(db)

  const brain = await store.createBrain('IndexerTest')
  brainId = brain.id

  // Seed region "Databases"
  const dbRegion = await store.createRegion(brainId, 'Databases', 'SEEDED')
  databasesRegionId = dbRegion.id

  // OBJECT leaf
  const obj = await store.createLeaf({
    brainId,
    kind: 'OBJECT',
    status: 'ACTIVE',
    title: 'TigerBeetle',
    aliases: [],
    tags: [],
    regionId: databasesRegionId,
  })
  objectLeafId = obj.id

  // 7 BELIEF leaves with varying confidence
  const b1 = await store.createLeaf({
    brainId,
    kind: 'BELIEF',
    status: 'ACTIVE',
    title: 'TigerBeetle provides deterministic execution.',
    statement:
      'TigerBeetle guarantees deterministic execution across replicas.',
    aliases: [],
    tags: [],
    confidence: makeConf(0.8),
    regionId: databasesRegionId,
  })
  b1Id = b1.id

  const b2 = await store.createLeaf({
    brainId,
    kind: 'BELIEF',
    status: 'ACTIVE',
    title: 'TigerBeetle uses a log-structured storage engine.',
    statement:
      'TigerBeetle stores data in a log-structured format for performance.',
    aliases: [],
    tags: [],
    confidence: makeConf(0.75),
    regionId: databasesRegionId,
  })
  b2Id = b2.id

  const b3 = await store.createLeaf({
    brainId,
    kind: 'BELIEF',
    status: 'ACTIVE',
    title: 'TigerBeetle is designed for financial workloads.',
    statement:
      'TigerBeetle prioritizes correctness for financial transaction processing.',
    aliases: [],
    tags: [],
    confidence: makeConf(0.9),
    regionId: databasesRegionId,
  })
  b3Id = b3.id

  const b4 = await store.createLeaf({
    brainId,
    kind: 'BELIEF',
    status: 'ACTIVE',
    title: 'TigerBeetle supports two-phase commits.',
    statement: 'TigerBeetle provides two-phase commit semantics.',
    aliases: [],
    tags: [],
    confidence: makeConf(0.7),
    regionId: databasesRegionId,
  })
  b4Id = b4.id

  await store.createLeaf({
    brainId,
    kind: 'BELIEF',
    status: 'ACTIVE',
    title: 'TigerBeetle achieves high throughput.',
    statement: 'TigerBeetle can process millions of transactions per second.',
    aliases: [],
    tags: [],
    confidence: makeConf(0.65),
    regionId: databasesRegionId,
  })

  const b6 = await store.createLeaf({
    brainId,
    kind: 'BELIEF',
    status: 'ACTIVE',
    title: 'TigerBeetle uses VSR consensus.',
    statement: 'TigerBeetle implements Viewstamped Replication for consensus.',
    aliases: [],
    tags: [],
    confidence: makeConf(0.3),
    regionId: databasesRegionId,
  })

  const b7 = await store.createLeaf({
    brainId,
    kind: 'BELIEF',
    status: 'ACTIVE',
    title: 'TigerBeetle stores accounts and transfers.',
    statement:
      "TigerBeetle's data model is built around accounts and transfers.",
    aliases: [],
    tags: [],
    confidence: makeConf(0.85),
    regionId: databasesRegionId,
  })

  // QUESTION
  await store.createLeaf({
    brainId,
    kind: 'QUESTION',
    status: 'ACTIVE',
    title: 'Can TigerBeetle survive region failure?',
    aliases: [],
    tags: [],
    regionId: databasesRegionId,
  })

  // Relationships: B2..B7 each RELATES_TO the object leaf
  // → object leaf degree = 6 (≥ threshold)
  for (const bId of [b2Id, b3Id, b4Id, b6.id, b7.id]) {
    await store.createRelationship({
      brainId,
      sourceLeafId: bId,
      targetLeafId: objectLeafId,
      type: 'RELATES_TO',
    })
  }
  // b2 already done; add one more to make degree 6
  await store.createRelationship({
    brainId,
    sourceLeafId: b1Id,
    targetLeafId: objectLeafId,
    type: 'SUPPORTS',
  })

  // B3 DEPENDS_ON B1
  await store.createRelationship({
    brainId,
    sourceLeafId: b3Id,
    targetLeafId: b1Id,
    type: 'DEPENDS_ON',
  })

  // B4 DEPENDS_ON B3
  await store.createRelationship({
    brainId,
    sourceLeafId: b4Id,
    targetLeafId: b3Id,
    type: 'DEPENDS_ON',
  })
}

const setupPromise = setup()

afterAll(async () => {
  await db.close()
})

describe('delphi-indexer', () => {
  // ── Test 1: ensureSeededRegions idempotent ─────────────────────────────────
  it('1. ensureSeededRegions is idempotent', async () => {
    await setupPromise

    // Call twice with overlapping + new regions
    await ensureSeededRegions(store, brainId, ['Databases', 'Algorithms'])
    await ensureSeededRegions(store, brainId, [
      'Databases',
      'Algorithms',
      'Networking',
    ])

    const regions = await store.listRegions(brainId)
    const seededTitles = regions
      .filter(r => r.kind === 'SEEDED')
      .map(r => r.title)

    expect(seededTitles).toContain('Databases')
    expect(seededTitles).toContain('Algorithms')
    expect(seededTitles).toContain('Networking')

    // No duplicates
    const unique = new Set(seededTitles)
    expect(unique.size).toBe(seededTitles.length)
  })

  // ── Test 2: detectHubRegions ───────────────────────────────────────────────
  it('2. detectHubRegions creates HUB region for TigerBeetle', async () => {
    await setupPromise

    const hubs = await detectHubRegions(store, brainId, { degreeThreshold: 6 })

    expect(hubs.length).toBeGreaterThanOrEqual(1)
    const tbHub = hubs.find(r => r.title === 'TigerBeetle')
    expect(tbHub).toBeDefined()
    expect(tbHub!.kind).toBe('HUB')
    expect(tbHub!.anchorLeafId).toBe(objectLeafId)

    // Anchor leaf should now be in hub region
    const updatedObj = await store.getLeaf(objectLeafId)
    expect(updatedObj!.regionId).toBe(tbHub!.id)

    // B2 was in Databases (SEEDED) and related to object → should be reassigned to hub
    const updatedB2 = await store.getLeaf(b2Id)
    expect(updatedB2!.regionId).toBe(tbHub!.id)
  })

  // ── Test 3: generateIndexes ────────────────────────────────────────────────
  it('3. generateIndexes with TemplateSummarizer produces correct indexes', async () => {
    await setupPromise

    const summarizer = new TemplateSummarizer()
    const indexes = await generateIndexes(store, brainId, summarizer)

    expect(indexes.length).toBeGreaterThanOrEqual(1)

    // After detectHubRegions (test 2), beliefs B1-B4,B6,B7 were moved to
    // TigerBeetle HUB region. Look specifically for that hub's index.
    const tbIndex = indexes.find(idx => idx.title === 'TigerBeetle')
    expect(tbIndex).toBeDefined()

    const idx = tbIndex!
    expect(idx.summaryTiny.length).toBeGreaterThan(0)
    expect(idx.summaryShort.length).toBeGreaterThan(0)
    expect(idx.summaryMedium.length).toBeGreaterThan(0)
    expect(idx.summaryLong.length).toBeGreaterThan(0)

    // Length ordering: tiny < short < long
    expect(idx.summaryTiny.length).toBeLessThan(idx.summaryShort.length)
    expect(idx.summaryShort.length).toBeLessThan(idx.summaryLong.length)

    // keyBeliefs ≤ 10
    expect(idx.keyBeliefs.length).toBeLessThanOrEqual(10)

    // B1 title should be in keyBeliefs (confidence 0.8 → in top 5 after 0.9, 0.85, 0.8...)
    expect(idx.keyBeliefs).toContain(
      'TigerBeetle provides deterministic execution.',
    )

    // Q1 is in the Databases SEEDED region (not moved to hub since it's not connected to objectLeaf)
    const dbIndex = indexes.find(i => i.title === 'Databases')
    expect(dbIndex).toBeDefined()
    expect(dbIndex!.keyQuestions).toContain(
      'Can TigerBeetle survive region failure?',
    )
  })

  // ── Test 4: onlyStale ──────────────────────────────────────────────────────
  it('4. generateIndexes with onlyStale regenerates only dirty regions', async () => {
    await setupPromise

    const summarizer = new TemplateSummarizer()

    // Generate all indexes first
    const firstPass = await generateIndexes(store, brainId, summarizer)
    expect(firstPass.length).toBeGreaterThanOrEqual(1)

    const generatedAts = new Map(
      firstPass.map(idx => [idx.regionId, idx.generatedAt]),
    )

    // Small delay to ensure timestamp difference
    await new Promise<void>(r => setTimeout(r, 10))

    // Mark the hub region dirty
    const allRegions = await store.listRegions(brainId)
    const hubRegion = allRegions.find(r => r.kind === 'HUB')
    expect(hubRegion).toBeDefined()
    await store.markRegionDirty(hubRegion!.id)

    // Regenerate only stale
    const secondPass = await generateIndexes(store, brainId, summarizer, {
      onlyStale: true,
    })

    // Only dirty region regenerated
    expect(secondPass.length).toBe(1)
    expect(secondPass[0]!.regionId).toBe(hubRegion!.id)

    // Non-dirty indexes unchanged
    const currentIndexes = await store.listIndexes(brainId)
    for (const idx of currentIndexes) {
      if (idx.regionId === hubRegion!.id) {
        continue
      }
      const orig = generatedAts.get(idx.regionId)
      if (orig !== undefined) {
        expect(idx.generatedAt).toBe(orig)
      }
    }
  })

  // ── Test 5: generateMaps ───────────────────────────────────────────────────
  it('5. generateMaps returns routes with correct dependency ordering', async () => {
    await setupPromise

    const map = await generateMaps(store, brainId)
    expect(map).toBeDefined()
    expect(map.routes.length).toBeGreaterThanOrEqual(1)

    // DEPENDENCY route: B1 appears before B3
    const depRoute = map.routes.find(r => r.purpose === 'DEPENDENCY')
    expect(depRoute).toBeDefined()
    const b1Pos = depRoute!.nodeLeafIds.indexOf(b1Id)
    const b3Pos = depRoute!.nodeLeafIds.indexOf(b3Id)
    expect(b1Pos).toBeGreaterThanOrEqual(0)
    expect(b3Pos).toBeGreaterThanOrEqual(0)
    expect(b1Pos).toBeLessThan(b3Pos)

    // LEARNING route: B1 before B3, B3 before B4
    const learnRoute = map.routes.find(r => r.purpose === 'LEARNING')
    expect(learnRoute).toBeDefined()
    const lb1 = learnRoute!.nodeLeafIds.indexOf(b1Id)
    const lb3 = learnRoute!.nodeLeafIds.indexOf(b3Id)
    const lb4 = learnRoute!.nodeLeafIds.indexOf(b4Id)
    expect(lb1).toBeGreaterThanOrEqual(0)
    expect(lb3).toBeGreaterThanOrEqual(0)
    expect(lb4).toBeGreaterThanOrEqual(0)
    expect(lb1).toBeLessThan(lb3)
    expect(lb3).toBeLessThan(lb4)

    // EXPLORATION route starting with object leaf
    const expRoute = map.routes.find(r => r.purpose === 'EXPLORATION')
    expect(expRoute).toBeDefined()
    expect(expRoute!.nodeLeafIds[0]).toBe(objectLeafId)
  })

  // ── Test 6: IndexScheduler ─────────────────────────────────────────────────
  it('6. IndexScheduler debounces, suspends, and resumes', async () => {
    await setupPromise

    let runCount = 0
    const scheduler = new IndexScheduler(
      async () => {
        runCount++
      },
      { debounceMs: 50 },
    )

    // Three rapid markDirty calls → should debounce to one run
    scheduler.markDirty()
    scheduler.markDirty()
    scheduler.markDirty()
    await scheduler.flushNow()
    expect(runCount).toBe(1)

    // suspend + markDirty → no run during suspension
    const countBefore = runCount
    scheduler.suspend()
    scheduler.markDirty()
    await new Promise<void>(r => setTimeout(r, 100))
    expect(runCount).toBe(countBefore)

    // resume → runs because pending flag was set
    await scheduler.resume()
    expect(runCount).toBe(countBefore + 1)
  })
})
