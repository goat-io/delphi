import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { answerQuestion, ExtractiveSynthesizer } from '@goatlab/delphi-agent'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { bootstrapBrain } from '../scripts/bootstrap-brain.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

let tmpDir: string
let brainId: string

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'delphi-selfbrain-'))
  const result = await bootstrapBrain({
    dataDir: join(tmpDir, 'brain'),
    brainDir: join(tmpDir, 'brain-export'),
    repoRoot: REPO_ROOT,
    quiet: true,
  })
  brainId = result.brainId
}, 120_000)

afterAll(() => {
  // tmpDir is ephemeral — no cleanup needed
})

describe('selfbrain bootstrap', () => {
  it('health.leaves > 30 (substantial RFC corpus)', async () => {
    const db = await createDb({ dataDir: join(tmpDir, 'brain') })
    await migrate(db)
    const store = new BrainStore(db)
    const health = await store.health(brainId)
    await db.close()
    expect(health.leaves).toBeGreaterThan(30)
  })

  it('all 5 seeded regions exist', async () => {
    const db = await createDb({ dataDir: join(tmpDir, 'brain') })
    await migrate(db)
    const store = new BrainStore(db)
    const regions = await store.listRegions(brainId)
    await db.close()
    const titles = regions.map(r => r.title)
    for (const expected of [
      'Spec',
      'Knowledge Plane',
      'Execution Plane',
      'Decisions',
      'Operations',
    ]) {
      expect(titles).toContain(expected)
    }
  })

  it('every region with leaves has an index', async () => {
    const db = await createDb({ dataDir: join(tmpDir, 'brain') })
    await migrate(db)
    const store = new BrainStore(db)
    const regions = await store.listRegions(brainId)
    const leaves = await store.listLeaves(brainId)
    for (const region of regions) {
      const regionLeaves = leaves.filter(l => l.regionId === region.id)
      if (regionLeaves.length > 0) {
        const idx = await store.getIndexByRegion(region.id)
        expect(
          idx,
          `Region "${region.title}" should have an index`,
        ).not.toBeNull()
      }
    }
    await db.close()
  })

  it('asking "What is a Leaf in Delphi?" returns evidence >= 1 and non-empty summary', async () => {
    const db = await createDb({ dataDir: join(tmpDir, 'brain') })
    await migrate(db)
    const store = new BrainStore(db)
    const synth = new ExtractiveSynthesizer()
    const result = await answerQuestion(
      store,
      brainId,
      'What is a Leaf in Delphi?',
      synth,
    )
    await db.close()
    expect(result.evidence.length).toBeGreaterThanOrEqual(1)
    expect(result.summary.length).toBeGreaterThan(0)
  })

  it('second bootstrap run: skippedAssets equals total assets and created === 0', async () => {
    // First get asset count from first run
    const db = await createDb({ dataDir: join(tmpDir, 'brain') })
    await migrate(db)
    const store = new BrainStore(db)
    const assets = await store.listAssets(brainId)
    const totalAssets = assets.length
    await db.close()

    // Second run
    const result2 = await bootstrapBrain({
      dataDir: join(tmpDir, 'brain'),
      brainDir: join(tmpDir, 'brain-export'),
      repoRoot: REPO_ROOT,
      quiet: true,
    })
    expect(result2.skippedAssets).toBe(totalAssets)
    expect(result2.created).toBe(0)
  }, 120_000)
})
