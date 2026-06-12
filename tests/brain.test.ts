import type { Db } from '@goatlab/delphi-knowledge'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import { afterAll, describe, expect, it } from 'vitest'

let db: Db
let store: BrainStore

// Setup: we initialize once and share across tests (sequential execution)
async function setup() {
  db = await createDb() // PGlite in-memory
  await migrate(db)
  store = new BrainStore(db)
}

const setupPromise = setup()

afterAll(async () => {
  await db.close()
})

describe('delphi-brain', () => {
  it('1. createBrain + getBrain roundtrip', async () => {
    await setupPromise
    const brain = await store.createBrain('Test Brain', 'A test brain')
    expect(brain.id).toMatch(/^brain_/)
    expect(brain.name).toBe('Test Brain')
    expect(brain.description).toBe('A test brain')

    const fetched = await store.getBrain(brain.id)
    expect(fetched).not.toBeNull()
    expect(fetched!.id).toBe(brain.id)
    expect(fetched!.name).toBe('Test Brain')

    const missing = await store.getBrain('nonexistent')
    expect(missing).toBeNull()
  })

  it('2. createLeaf version=1 + LEAF_CREATED event; updateLeaf version=2 + LEAF_UPDATED event', async () => {
    await setupPromise
    const brain = await store.createBrain('Brain2')

    const leaf = await store.createLeaf({
      brainId: brain.id,
      kind: 'BELIEF',
      status: 'ACTIVE',
      title: 'Test Belief',
      aliases: [],
      tags: [],
    })

    expect(leaf.version).toBe(1)
    expect(leaf.id).toMatch(/^leaf_/)

    const events = await store.listEventsByLeaf(leaf.id)
    const created = events.find(e => e.type === 'LEAF_CREATED')
    expect(created).toBeDefined()
    expect(created!.payload.title).toBe('Test Belief')
    expect(created!.payload.kind).toBe('BELIEF')

    const updated = await store.updateLeaf(leaf.id, {
      summary: 'Updated summary',
    })
    expect(updated.version).toBe(2)
    expect(updated.summary).toBe('Updated summary')

    const events2 = await store.listEventsByLeaf(leaf.id)
    const updatedEvt = events2.find(e => e.type === 'LEAF_UPDATED')
    expect(updatedEvt).toBeDefined()
    expect(Array.isArray(updatedEvt!.payload.changed)).toBe(true)
    expect((updatedEvt!.payload.changed as string[]).includes('summary')).toBe(
      true,
    )
  })

  it('3. findLeafByTitleOrAlias — case-insensitive on title and alias', async () => {
    await setupPromise
    const brain = await store.createBrain('Brain3')

    await store.createLeaf({
      brainId: brain.id,
      kind: 'OBJECT',
      status: 'ACTIVE',
      title: 'TigerBeetle',
      aliases: ['tiger-beetle', 'TB'],
      tags: [],
    })

    // Case-insensitive title match
    const byTitle = await store.findLeafByTitleOrAlias(brain.id, 'tigerbeetle')
    expect(byTitle).not.toBeNull()
    expect(byTitle!.title).toBe('TigerBeetle')

    // Case-insensitive alias match
    const byAlias = await store.findLeafByTitleOrAlias(brain.id, 'tiger-beetle')
    expect(byAlias).not.toBeNull()
    expect(byAlias!.title).toBe('TigerBeetle')

    // Another alias case-insensitive
    const byAlias2 = await store.findLeafByTitleOrAlias(brain.id, 'tb')
    expect(byAlias2).not.toBeNull()

    // Not found
    const none = await store.findLeafByTitleOrAlias(brain.id, 'notexists')
    expect(none).toBeNull()
  })

  it('4. searchLeaves finds a leaf by a word in its statement', async () => {
    await setupPromise
    const brain = await store.createBrain('Brain4')

    await store.createLeaf({
      brainId: brain.id,
      kind: 'BELIEF',
      status: 'ACTIVE',
      title: 'TigerBeetle Execution Model',
      statement: 'TigerBeetle provides deterministic execution.',
      aliases: [],
      tags: [],
    })

    const results = await store.searchLeaves(brain.id, 'deterministic')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.statement).toContain('deterministic')
  })

  it('5. createRelationship idempotent (same triple → one row); leafDegree correct', async () => {
    await setupPromise
    const brain = await store.createBrain('Brain5')

    const leafA = await store.createLeaf({
      brainId: brain.id,
      kind: 'BELIEF',
      status: 'ACTIVE',
      title: 'Leaf A',
      aliases: [],
      tags: [],
    })
    const leafB = await store.createLeaf({
      brainId: brain.id,
      kind: 'BELIEF',
      status: 'ACTIVE',
      title: 'Leaf B',
      aliases: [],
      tags: [],
    })

    await store.createRelationship({
      brainId: brain.id,
      sourceLeafId: leafA.id,
      targetLeafId: leafB.id,
      type: 'SUPPORTS',
    })

    // Create same triple again — should be idempotent
    await store.createRelationship({
      brainId: brain.id,
      sourceLeafId: leafA.id,
      targetLeafId: leafB.id,
      type: 'SUPPORTS',
    })

    const rels = await store.listRelationships(brain.id)
    expect(rels.length).toBe(1)

    // leafDegree: leafA is source of 1 rel, leafB is target of 1 rel
    expect(await store.leafDegree(leafA.id)).toBe(1)
    expect(await store.leafDegree(leafB.id)).toBe(1)
  })

  it('6. createEvidence + evidenceStats (count, distinctAssets) + listEvidenceWithContext returns assetTitle', async () => {
    await setupPromise
    const brain = await store.createBrain('Brain6')

    const asset1 = await store.createAsset({
      brainId: brain.id,
      type: 'TEXT',
      title: 'Asset One',
      uri: 'file://asset1.txt',
      checksum: 'abc123',
    })

    const asset2 = await store.createAsset({
      brainId: brain.id,
      type: 'TEXT',
      title: 'Asset Two',
      uri: 'file://asset2.txt',
      checksum: 'def456',
    })

    const leaf = await store.createLeaf({
      brainId: brain.id,
      kind: 'BELIEF',
      status: 'ACTIVE',
      title: 'Belief with Evidence',
      aliases: [],
      tags: [],
    })

    await store.createEvidence({
      brainId: brain.id,
      leafId: leaf.id,
      assetId: asset1.id,
      relation: 'SUPPORTS',
      strength: 0.8,
      extractionConfidence: 0.9,
    })

    await store.createEvidence({
      brainId: brain.id,
      leafId: leaf.id,
      assetId: asset2.id,
      relation: 'SUPPORTS',
      strength: 0.7,
      extractionConfidence: 0.85,
      citation: 'page 42',
    })

    const stats = await store.evidenceStats(leaf.id)
    expect(stats.count).toBe(2)
    expect(stats.distinctAssets).toBe(2)
    expect(stats.avgStrength).toBeCloseTo(0.75)
    expect(stats.avgExtraction).toBeCloseTo(0.875)

    const withCtx = await store.listEvidenceWithContext(leaf.id)
    expect(withCtx.length).toBe(2)
    const titles = withCtx.map(r => r.assetTitle)
    expect(titles).toContain('Asset One')
    expect(titles).toContain('Asset Two')
  })

  it('7. createRegion idempotent; upsertIndex → markRegionDirty → stale=true changedLeafCount=1; upsertIndex again → stale=false', async () => {
    await setupPromise
    const brain = await store.createBrain('Brain7')

    const region1 = await store.createRegion(
      brain.id,
      'Execution Model',
      'SEEDED',
    )
    expect(region1.id).toMatch(/^region_/)

    // Idempotent: create same region again
    const region2 = await store.createRegion(
      brain.id,
      'Execution Model',
      'SEEDED',
    )
    expect(region2.id).toBe(region1.id)

    const regions = await store.listRegions(brain.id)
    expect(regions.length).toBe(1)

    // Upsert index
    const idx = await store.upsertIndex({
      brainId: brain.id,
      regionId: region1.id,
      title: 'Execution Model Index',
      summaryTiny: 'Tiny',
      summaryShort: 'Short',
      summaryMedium: 'Medium',
      summaryLong: 'Long',
      keyConcepts: ['determinism'],
      keyBeliefs: ['TigerBeetle is deterministic'],
      keyQuestions: [],
      representativeLeafIds: [],
      stale: false,
      changedLeafCount: 0,
    })
    expect(idx.stale).toBe(false)
    expect(idx.changedLeafCount).toBe(0)

    // Mark dirty
    await store.markRegionDirty(region1.id)

    const dirtyIdx = await store.getIndexByRegion(region1.id)
    expect(dirtyIdx).not.toBeNull()
    expect(dirtyIdx!.stale).toBe(true)
    expect(dirtyIdx!.changedLeafCount).toBe(1)

    // Upsert again → stale=false, changedLeafCount=0
    const freshIdx = await store.upsertIndex({
      brainId: brain.id,
      regionId: region1.id,
      title: 'Execution Model Index Updated',
      summaryTiny: 'Tiny2',
      summaryShort: 'Short2',
      summaryMedium: 'Medium2',
      summaryLong: 'Long2',
      keyConcepts: ['determinism', 'correctness'],
      keyBeliefs: [],
      keyQuestions: [],
      representativeLeafIds: [],
      stale: false,
      changedLeafCount: 0,
    })
    expect(freshIdx.stale).toBe(false)
    expect(freshIdx.changedLeafCount).toBe(0)
  })

  it('8. health returns correct counts including orphanBeliefs', async () => {
    await setupPromise
    const brain = await store.createBrain('Brain8')

    // Create a BELIEF without evidence (orphan)
    const orphan = await store.createLeaf({
      brainId: brain.id,
      kind: 'BELIEF',
      status: 'ACTIVE',
      title: 'Orphan Belief',
      aliases: [],
      tags: [],
    })

    // Create a BELIEF with evidence
    const asset = await store.createAsset({
      brainId: brain.id,
      type: 'TEXT',
      title: 'Health Asset',
      uri: 'file://health.txt',
      checksum: 'healthchk1',
    })
    const supported = await store.createLeaf({
      brainId: brain.id,
      kind: 'BELIEF',
      status: 'ACTIVE',
      title: 'Supported Belief',
      aliases: [],
      tags: [],
    })
    await store.createEvidence({
      brainId: brain.id,
      leafId: supported.id,
      assetId: asset.id,
      relation: 'SUPPORTS',
      strength: 0.9,
      extractionConfidence: 0.95,
    })

    // Create an open QUESTION
    await store.createLeaf({
      brainId: brain.id,
      kind: 'QUESTION',
      status: 'ACTIVE',
      title: 'Open Question',
      aliases: [],
      tags: [],
    })

    // Create a relationship
    await store.createRelationship({
      brainId: brain.id,
      sourceLeafId: orphan.id,
      targetLeafId: supported.id,
      type: 'DEPENDS_ON',
    })

    const h = await store.health(brain.id)

    expect(h.leaves).toBe(3) // orphan + supported + question
    expect(h.beliefs).toBe(2) // orphan + supported
    expect(h.evidence).toBe(1)
    expect(h.relationships).toBe(1)
    expect(h.orphanBeliefs).toBe(1) // only orphan has no evidence
    expect(h.openQuestions).toBe(1)
    expect(h.staleIndexes).toBe(0)
    // avgConfidence: no confidence set, so 0
    expect(h.avgConfidence).toBe(0)
  })
})
