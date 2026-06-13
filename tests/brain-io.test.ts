import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import type { Db } from '@goatlab/delphi-knowledge'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { exportBrain, importBrain } from '../scripts/brain-store-io.js'

// Shared temp dir for JSONL files
const TEST_DIR = resolve(tmpdir(), `delphi-brain-io-${process.pid}`)

async function freshDb(): Promise<{ db: Db; store: BrainStore }> {
  const db = await createDb()
  await migrate(db)
  return { db, store: new BrainStore(db) }
}

beforeAll(async () => {
  await mkdir(TEST_DIR, { recursive: true })
})

afterAll(async () => {
  await rm(TEST_DIR, { recursive: true, force: true })
})

describe('brain-io', () => {
  it('1. export then import into fresh db reproduces leaf/rel/evidence counts', async () => {
    const { db, store } = await freshDb()
    const brain = await store.createBrain('io-test-1')
    const asset = await store.createAsset({
      brainId: brain.id,
      type: 'TEXT',
      title: 'Test Asset',
      uri: 'file://test.txt',
      checksum: 'abc123',
    })
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
      kind: 'OBJECT',
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
    await store.createEvidence({
      brainId: brain.id,
      leafId: leafA.id,
      assetId: asset.id,
      relation: 'SUPPORTS',
      strength: 0.8,
      extractionConfidence: 0.9,
    })

    const outDir = resolve(TEST_DIR, 'test1')
    const exportCounts = await exportBrain(store, brain.id, outDir)
    await db.close()

    expect(exportCounts.leaves).toBe(2)
    expect(exportCounts.relationships).toBe(1)
    expect(exportCounts.evidence).toBe(1)
    expect(exportCounts.assets).toBe(1)

    // Import into fresh db
    const { db: db2, store: store2 } = await freshDb()
    const brain2 = await store2.createBrain('io-test-1-fresh')
    const importCounts = await importBrain(store2, brain2.id, outDir)
    await db2.close()

    expect(importCounts.leaves).toBe(2)
    expect(importCounts.relationships).toBe(1)
    expect(importCounts.evidence).toBe(1)
    expect(importCounts.assets).toBe(1)
  })

  it('2. export is deterministic (export twice → identical file bytes)', async () => {
    const { readFile } = await import('node:fs/promises')

    const { db, store } = await freshDb()
    const brain = await store.createBrain('io-test-2')
    await store.createLeaf({
      brainId: brain.id,
      kind: 'BELIEF',
      status: 'ACTIVE',
      title: 'Deterministic Leaf',
      aliases: ['alias1'],
      tags: ['tag1'],
    })

    const outDir1 = resolve(TEST_DIR, 'test2a')
    const outDir2 = resolve(TEST_DIR, 'test2b')

    await exportBrain(store, brain.id, outDir1)
    await exportBrain(store, brain.id, outDir2)
    await db.close()

    const files = [
      'leaves.jsonl',
      'relationships.jsonl',
      'evidence.jsonl',
      'assets.jsonl',
      'events.jsonl',
    ]
    for (const f of files) {
      const a = await readFile(resolve(outDir1, f), 'utf8')
      const b = await readFile(resolve(outDir2, f), 'utf8')
      expect(a).toBe(b)
    }
  })

  it('3. importBrain is idempotent (import twice → same counts, no dup rows)', async () => {
    const { db, store } = await freshDb()
    const brain = await store.createBrain('io-test-3-src')
    await store.createLeaf({
      brainId: brain.id,
      kind: 'BELIEF',
      status: 'ACTIVE',
      title: 'Idempotent Leaf',
      aliases: [],
      tags: [],
    })

    const outDir = resolve(TEST_DIR, 'test3')
    await exportBrain(store, brain.id, outDir)
    await db.close()

    const { db: db2, store: store2 } = await freshDb()
    const brain2 = await store2.createBrain('io-test-3-dest')

    const c1 = await importBrain(store2, brain2.id, outDir)
    const c2 = await importBrain(store2, brain2.id, outDir)

    const leaves = await store2.listLeaves(brain2.id)
    await db2.close()

    // Both calls report same counts from the JSONL files
    expect(c1.leaves).toBe(c2.leaves)
    // No duplicate rows
    expect(leaves.length).toBe(1)
  })

  it('4. DECISION leaf written, exported, imported into fresh brain survives', async () => {
    const { db, store } = await freshDb()
    const brain = await store.createBrain('io-test-4-src')
    const decision = await store.createLeaf({
      brainId: brain.id,
      kind: 'DECISION',
      status: 'ACTIVE',
      title: 'Use PGlite for storage',
      statement: 'We decided to use PGlite as the embedded database.',
      aliases: ['pglite-decision'],
      tags: ['architecture', 'storage'],
      confidence: {
        value: 0.9,
        evidenceStrength: 0.85,
        sourceReliability: 0.9,
        sourceDiversity: 0.7,
        freshness: 1.0,
        consensus: 0.8,
        contradictionRisk: 0.1,
        explanation: 'Strong team consensus',
      },
    })

    const outDir = resolve(TEST_DIR, 'test4')
    await exportBrain(store, brain.id, outDir)
    await db.close()

    const { db: db2, store: store2 } = await freshDb()
    const brain2 = await store2.createBrain('io-test-4-dest')
    await importBrain(store2, brain2.id, outDir)

    const leaves = await store2.listLeaves(brain2.id)
    await db2.close()

    const imported = leaves.find(l => l.id === decision.id)
    expect(imported).toBeDefined()
    expect(imported!.kind).toBe('DECISION')
    expect(imported!.title).toBe('Use PGlite for storage')
    expect(imported!.aliases).toEqual(['pglite-decision'])
    expect(imported!.confidence?.value).toBeCloseTo(0.9)
  })

  it('5. missing dir → zero counts, no throw', async () => {
    const { db, store } = await freshDb()
    const brain = await store.createBrain('io-test-5')

    const counts = await importBrain(
      store,
      brain.id,
      '/nonexistent/path/that/does/not/exist',
    )
    await db.close()

    expect(counts.leaves).toBe(0)
    expect(counts.relationships).toBe(0)
    expect(counts.evidence).toBe(0)
    expect(counts.assets).toBe(0)
    expect(counts.events).toBe(0)
  })
})
