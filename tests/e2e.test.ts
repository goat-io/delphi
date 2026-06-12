import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { answerQuestion, ExtractiveSynthesizer } from '@goatlab/delphi-agent'
import { extractAsset, HeuristicExtractor } from '@goatlab/delphi-extraction'
import {
  assignUnassignedLeaves,
  ensureSeededRegions,
  generateIndexes,
  generateMaps,
  TemplateSummarizer,
} from '@goatlab/delphi-indexer'
import { ingestDirectory } from '@goatlab/delphi-ingestion'
import type { Db } from '@goatlab/delphi-knowledge'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const EXAMPLES_DIR = resolve(__dirname, '../examples/tigerbeetle')

let db: Db
let store: BrainStore
let brainId: string
let defaultRegionId: string

// State accumulated across assertions
let asset1Id: string
let _asset1Chunks: import('@goatlab/delphi-protocol').Chunk[]

beforeAll(async () => {
  db = await createDb()
  await migrate(db)
  store = new BrainStore(db)

  const brain = await store.createBrain('E2E Test Brain')
  brainId = brain.id

  const [region] = await ensureSeededRegions(store, brainId, ['Databases'])
  defaultRegionId = region!.id
}, 60_000)

afterAll(async () => {
  await db.close()
})

describe('delphi e2e', () => {
  // 1. Ingest 4 documents
  it('1. ingest: assets === 4, chunks > 4', async () => {
    const result = await ingestDirectory(store, brainId, EXAMPLES_DIR)
    expect(result.assets.length).toBe(4)
    expect(result.chunks.length).toBeGreaterThanOrEqual(4)

    // Store asset1 for later use
    const firstAsset = result.assets[0]
    expect(firstAsset).toBeDefined()
    asset1Id = firstAsset!.id
    _asset1Chunks = result.chunks.filter(c => c.assetId === asset1Id)
  })

  // 2. Extract knowledge
  it('2. extraction: created > 5 leaves, merged >= 1', async () => {
    const allAssets = await store.listAssets(brainId)
    const allChunks: Map<string, import('@goatlab/delphi-protocol').Chunk[]> =
      new Map()

    // Get all chunks for each asset
    for (const asset of allAssets) {
      const chunks = await store.listChunksByAsset(asset.id)
      allChunks.set(asset.id, chunks)
    }

    const extractor = new HeuristicExtractor()
    let totalCreated = 0
    let totalMerged = 0

    for (const asset of allAssets) {
      const chunks = allChunks.get(asset.id) ?? []
      if (chunks.length === 0) {
        continue
      }
      const result = await extractAsset(
        store,
        brainId,
        extractor,
        asset,
        chunks,
        {
          defaultRegionId,
        },
      )
      totalCreated += result.created
      totalMerged += result.merged
    }

    expect(totalCreated).toBeGreaterThan(5)
    expect(totalMerged).toBeGreaterThanOrEqual(1)
  })

  // 3. Merged belief has better evidence than single-evidence belief
  it('3. merged belief has evidenceStats count >= 3, distinctAssets >= 3, higher confidence than single-evidence belief', async () => {
    const leaves = await store.listLeaves(brainId, { kind: 'BELIEF' })

    let mergedLeaf: import('@goatlab/delphi-protocol').Leaf | null = null
    let maxCount = 0

    for (const leaf of leaves) {
      const stats = await store.evidenceStats(leaf.id)
      if (stats.count > maxCount) {
        maxCount = stats.count
        mergedLeaf = leaf
      }
    }

    // Find a merged belief with >= 3 evidence pieces
    expect(mergedLeaf).not.toBeNull()
    const mergedStats = await store.evidenceStats(mergedLeaf!.id)
    expect(mergedStats.count).toBeGreaterThanOrEqual(3)
    expect(mergedStats.distinctAssets).toBeGreaterThanOrEqual(3)

    // Find a single-evidence belief
    const singleLeaf = leaves.find(l => l.id !== mergedLeaf!.id)
    if (singleLeaf) {
      const singleStats = await store.evidenceStats(singleLeaf.id)
      if (
        singleStats.count === 1 &&
        mergedLeaf!.confidence !== undefined &&
        singleLeaf.confidence !== undefined
      ) {
        expect(mergedLeaf!.confidence.value).toBeGreaterThan(
          singleLeaf.confidence.value,
        )
      }
    }
  })

  // 4. Re-ingest: skipped === 4, re-extract same asset → created === 0
  it('4. re-ingest: skipped === 4, 0 new assets; re-extract same asset1 chunks → created === 0', async () => {
    const reIngest = await ingestDirectory(store, brainId, EXAMPLES_DIR)
    expect(reIngest.skipped).toBe(4)
    expect(reIngest.chunks.length).toBe(0) // no new chunks

    // Re-extract asset1 chunks
    const asset1 = await store.getAsset(asset1Id)
    expect(asset1).not.toBeNull()
    const chunks = await store.listChunksByAsset(asset1Id)

    const extractor = new HeuristicExtractor()
    const reExtract = await extractAsset(
      store,
      brainId,
      extractor,
      asset1!,
      chunks,
      {
        defaultRegionId,
      },
    )
    expect(reExtract.created).toBe(0)
  })

  // 5. Indexes: every region with leaves has an index; 4 tiers non-empty; tiny shorter than long
  it('5. indexes: every region with leaves has an index; 4 tiers non-empty; tiny shorter than long', async () => {
    // Assign unassigned leaves
    await assignUnassignedLeaves(store, brainId, defaultRegionId)

    const summarizer = new TemplateSummarizer()
    const indexes = await generateIndexes(store, brainId, summarizer)

    expect(indexes.length).toBeGreaterThanOrEqual(1)

    // Every region with leaves should have an index
    const regions = await store.listRegions(brainId)
    const allLeaves = await store.listLeaves(brainId)

    for (const region of regions) {
      const regionLeaves = allLeaves.filter(l => l.regionId === region.id)
      if (regionLeaves.length > 0) {
        const idx = await store.getIndexByRegion(region.id)
        expect(idx).not.toBeNull()
      }
    }

    // Check 4 tiers non-empty and tiny < long
    for (const idx of indexes) {
      expect(idx.summaryTiny.length).toBeGreaterThan(0)
      expect(idx.summaryShort.length).toBeGreaterThan(0)
      expect(idx.summaryMedium.length).toBeGreaterThan(0)
      expect(idx.summaryLong.length).toBeGreaterThan(0)
      expect(idx.summaryTiny.length).toBeLessThan(idx.summaryLong.length)
    }
  })

  // 6. Map exists (routes depend on DEPENDS_ON/OBJECT-degree relationships)
  it('6. map exists and is saved', async () => {
    const map = await generateMaps(store, brainId)
    expect(map).toBeDefined()
    expect(map.id).toBeTruthy()
    expect(map.title).toBeTruthy()
    expect(Array.isArray(map.routes)).toBe(true)
  })

  // 7. Answer question
  it('7. answer has summary, confidence in (0,1], evidence >= 1, navigationPath >= 2', async () => {
    const synth = new ExtractiveSynthesizer()
    const result = await answerQuestion(
      store,
      brainId,
      'What makes TigerBeetle suitable for financial transactions?',
      synth,
    )

    expect(result.summary).toBeTruthy()
    expect(result.confidence).toBeGreaterThan(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
    expect(result.evidence.length).toBeGreaterThanOrEqual(1)
    expect(result.navigationPath.length).toBeGreaterThanOrEqual(2)
  })

  // 8. CONTRADICTS relationship exists (from extraction of opposite beliefs)
  it('8. >= 1 CONTRADICTS relationship', async () => {
    const rels = await store.listRelationships(brainId)
    const contradicts = rels.filter(r => r.type === 'CONTRADICTS')
    // The extraction of both "TigerBeetle is a general purpose database" and
    // "TigerBeetle is not a general purpose database" should create a CONTRADICTS relationship
    expect(contradicts.length).toBeGreaterThanOrEqual(1)
  })

  // 9. Health check
  it('9. health: leaves > 0, staleIndexes === 0, openQuestions >= 1', async () => {
    const health = await store.health(brainId)
    expect(health.leaves).toBeGreaterThan(0)
    expect(health.staleIndexes).toBe(0)
    expect(health.openQuestions).toBeGreaterThanOrEqual(1)
  })

  // 10. Every BELIEF has >= 1 evidence row
  it('10. every BELIEF has >= 1 evidence row', async () => {
    const beliefs = await store.listLeaves(brainId, { kind: 'BELIEF' })
    for (const belief of beliefs) {
      const stats = await store.evidenceStats(belief.id)
      expect(stats.count).toBeGreaterThanOrEqual(1)
    }
  })
})
