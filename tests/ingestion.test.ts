import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ingestDirectory, ingestFile } from '@goatlab/delphi-ingestion'
import type { Db } from '@goatlab/delphi-knowledge'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let db: Db
let store: BrainStore
let brainId: string
let tmpDir: string

beforeAll(async () => {
  db = await createDb()
  await migrate(db)
  store = new BrainStore(db)
  const brain = await store.createBrain('Ingestion Test Brain')
  brainId = brain.id

  tmpDir = await mkdtemp(join(tmpdir(), 'delphi-ingest-test-'))

  const sampleMd = `---
name: "Sample Doc"
author: "Test Author"
---

# Introduction

This is the first paragraph of the introduction section. It provides an overview.

This is the second paragraph, still in introduction.

# Details

Here is a details section with important information about the subject matter.

${'A'.repeat(850)}

This is a short paragraph after the long one.
`

  await writeFile(join(tmpDir, 'sample.md'), sampleMd, 'utf-8')
})

afterAll(async () => {
  await db.close()
  if (tmpDir) {
    await rm(tmpDir, { recursive: true, force: true })
  }
})

describe('delphi-ingestion', () => {
  it('1. ingestFile: asset title from frontmatter name, chunks >= 2, sections populated, ordinals sequential', async () => {
    const filePath = join(tmpDir, 'sample.md')
    const result = await ingestFile(store, brainId, filePath)

    expect(result.skipped).toBe(false)
    expect(result.asset.title).toBe('Sample Doc')
    expect(result.asset.brainId).toBe(brainId)
    expect(result.chunks.length).toBeGreaterThanOrEqual(2)

    // Sections should be populated for chunks that have headings
    const sectioned = result.chunks.filter(c => c.location?.section != null)
    expect(sectioned.length).toBeGreaterThan(0)

    // Ordinals should be sequential starting from 0
    const ordinals = result.chunks.map(c => c.ordinal)
    ordinals.forEach((o, i) => {
      expect(o).toBe(i)
    })
  })

  it('2. re-ingest same file → skipped: true, 0 new chunks', async () => {
    const filePath = join(tmpDir, 'sample.md')
    const result2 = await ingestFile(store, brainId, filePath)

    expect(result2.skipped).toBe(true)
    expect(result2.chunks).toHaveLength(0)
    expect(result2.asset.title).toBe('Sample Doc')
  })

  it('3. ingestDirectory aggregates .md files and skips already-ingested', async () => {
    // Write a second file
    const file2 = join(tmpDir, 'second.md')
    await writeFile(
      file2,
      `# Second Doc\n\nThis is the second document with some content.\n`,
      'utf-8',
    )

    const dirResult = await ingestDirectory(store, brainId, tmpDir)

    // Should have at least 1 new asset (second.md) and skipped >= 1 (sample.md)
    expect(dirResult.assets.length).toBeGreaterThanOrEqual(1)
    expect(dirResult.skipped).toBeGreaterThanOrEqual(1)
    expect(dirResult.chunks.length).toBeGreaterThanOrEqual(1)
  })
})
