import {
  extractAsset,
  HeuristicExtractor,
  resolveCandidate,
} from '@goatlab/delphi-extraction'
import type { Db } from '@goatlab/delphi-knowledge'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import type { Chunk } from '@goatlab/delphi-protocol'
import { CandidateSchema, newId } from '@goatlab/delphi-protocol'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let db: Db
let store: BrainStore
let brainId: string
let defaultRegionId: string

beforeAll(async () => {
  db = await createDb()
  await migrate(db)
  store = new BrainStore(db)
  const brain = await store.createBrain('Extraction Test Brain')
  brainId = brain.id
  const region = await store.createRegion(brainId, 'Databases', 'SEEDED')
  defaultRegionId = region.id
})

afterAll(async () => {
  await db.close()
})

describe('delphi-extraction', () => {
  it('1. HeuristicExtractor extracts >= 1 BELIEF and >= 1 QUESTION from TigerBeetle chunk', async () => {
    const extractor = new HeuristicExtractor()
    expect(extractor.name).toBe('heuristic')

    const fakeAssetId = newId('asset')
    const fakeChunkId = newId('chunk')
    const chunk: Chunk = {
      id: fakeChunkId,
      assetId: fakeAssetId,
      ordinal: 0,
      text: 'TigerBeetle is a financial transactions database. It provides deterministic execution. Why does it matter?',
    }

    const candidates = await extractor.extract(
      chunk,
      fakeAssetId,
      'TigerBeetle',
    )
    const beliefs = candidates.filter(c => c.kind === 'BELIEF')
    const questions = candidates.filter(c => c.kind === 'QUESTION')

    expect(beliefs.length).toBeGreaterThanOrEqual(1)
    expect(questions.length).toBeGreaterThanOrEqual(1)

    // All candidates must have valid structure
    for (const c of candidates) {
      expect(() => CandidateSchema.parse(c)).not.toThrow()
    }
  })

  it('2. Full pipeline: first run creates leaves (created >= 2); second run merges (merged >= 1, created === 0)', async () => {
    // Create a fake asset and chunks in the store
    const asset = await store.createAsset({
      brainId,
      type: 'MARKDOWN',
      title: 'TigerBeetle Guide',
      uri: 'file:///tb.md',
      checksum: `cksum-${newId('x')}`,
    })

    const chunks = await store.createChunks([
      {
        assetId: asset.id,
        ordinal: 0,
        text: 'TigerBeetle is a financial transactions database. It provides deterministic execution. TigerBeetle uses a log-structured storage model.',
        location: { section: 'Overview' },
      },
      {
        assetId: asset.id,
        ordinal: 1,
        text: 'The system requires strict safety guarantees. It stores all data durably. Why is durability important?',
        location: { section: 'Safety' },
      },
    ])

    const extractor = new HeuristicExtractor()
    const opts = { defaultRegionId }

    const run1 = await extractAsset(
      store,
      brainId,
      extractor,
      asset,
      chunks,
      opts,
    )
    expect(run1.created).toBeGreaterThanOrEqual(2)

    // Second run on same chunks → merges happen, no new creates
    const run2 = await extractAsset(
      store,
      brainId,
      extractor,
      asset,
      chunks,
      opts,
    )
    expect(run2.merged).toBeGreaterThanOrEqual(1)
    expect(run2.created).toBe(0)

    // Verify evidence accumulated on at least one leaf
    const leaves = await store.listLeaves(brainId)
    let foundGrown = false
    for (const leaf of leaves) {
      const stats = await store.evidenceStats(leaf.id)
      if (stats.count >= 2) {
        foundGrown = true
        break
      }
    }
    expect(foundGrown).toBe(true)
  })

  it("3. Negation: second candidate outcome CREATED with rationale 'contradicts'; CONTRADICTS relationship exists; both contradictionRisk === 0.5", async () => {
    const asset = await store.createAsset({
      brainId,
      type: 'TEXT',
      title: 'Negation Test Asset',
      uri: 'file:///neg.txt',
      checksum: `cksum-neg-${newId('x')}`,
    })

    const chunk = await store.createChunks([
      {
        assetId: asset.id,
        ordinal: 0,
        text: 'TigerBeetle is suitable for general workloads.',
      },
    ])

    const c1 = CandidateSchema.parse({
      id: newId('cand'),
      kind: 'BELIEF',
      title: 'TigerBeetle is suitable for general workloads.',
      statement: 'TigerBeetle is suitable for general workloads.',
      aliases: [],
      extractionConfidence: 0.8,
      assetId: asset.id,
      chunkId: chunk[0]!.id,
      sourceText: 'TigerBeetle is suitable for general workloads.',
    })

    const c2 = CandidateSchema.parse({
      id: newId('cand'),
      kind: 'BELIEF',
      title: 'TigerBeetle is not suitable for general workloads.',
      statement: 'TigerBeetle is not suitable for general workloads.',
      aliases: [],
      extractionConfidence: 0.8,
      assetId: asset.id,
      chunkId: chunk[0]!.id,
      sourceText: 'TigerBeetle is not suitable for general workloads.',
    })

    const opts = { defaultRegionId }

    const r1 = await resolveCandidate(store, brainId, c1, opts)
    expect(r1.outcome).toBe('CREATED')

    const r2 = await resolveCandidate(store, brainId, c2, opts)
    expect(r2.outcome).toBe('CREATED')
    expect(r2.rationale).toMatch(/contradicts/i)

    // Both leaves should have contradictionRisk === 0.5
    const leaf1 = await store.getLeaf(r1.leafId!)
    const leaf2 = await store.getLeaf(r2.leafId!)
    expect(leaf1!.confidence!.contradictionRisk).toBe(0.5)
    expect(leaf2!.confidence!.contradictionRisk).toBe(0.5)

    // CONTRADICTS relationship should exist
    const rels1 = await store.listRelationshipsForLeaf(r2.leafId!)
    const contradicts = rels1.filter(r => r.type === 'CONTRADICTS')
    expect(contradicts.length).toBeGreaterThanOrEqual(1)
  })

  it('4. computeConfidence sanity: after two merges from distinct assets, confidence.value > after one', async () => {
    const asset1 = await store.createAsset({
      brainId,
      type: 'TEXT',
      title: 'Confidence Asset 1',
      uri: 'file:///conf1.txt',
      checksum: `cksum-conf1-${newId('x')}`,
    })
    const asset2 = await store.createAsset({
      brainId,
      type: 'TEXT',
      title: 'Confidence Asset 2',
      uri: 'file:///conf2.txt',
      checksum: `cksum-conf2-${newId('x')}`,
    })

    const chunk1 = await store.createChunks([
      {
        assetId: asset1.id,
        ordinal: 0,
        text: 'Confidence grows with more evidence.',
      },
    ])
    const chunk2 = await store.createChunks([
      {
        assetId: asset2.id,
        ordinal: 0,
        text: 'Confidence grows with more evidence.',
      },
    ])

    const makeCandidate = (assetId: string, chunkId: string) =>
      CandidateSchema.parse({
        id: newId('cand'),
        kind: 'BELIEF',
        title: 'Confidence grows with more evidence.',
        statement: 'Confidence grows with more evidence.',
        aliases: [],
        extractionConfidence: 0.8,
        assetId,
        chunkId,
        sourceText: 'Confidence grows with more evidence.',
      })

    const cand1 = makeCandidate(asset1.id, chunk1[0]!.id)
    const cand2 = makeCandidate(asset2.id, chunk2[0]!.id)

    const opts = { defaultRegionId }

    const r1 = await resolveCandidate(store, brainId, cand1, opts)
    expect(r1.outcome).toBe('CREATED')

    const leaf1After1 = await store.getLeaf(r1.leafId!)
    const conf1 = leaf1After1!.confidence!.value

    const r2 = await resolveCandidate(store, brainId, cand2, opts)
    expect(r2.outcome).toBe('MERGED')

    const leaf1After2 = await store.getLeaf(r1.leafId!)
    const conf2 = leaf1After2!.confidence!.value

    expect(conf2).toBeGreaterThan(conf1)
  })
})
