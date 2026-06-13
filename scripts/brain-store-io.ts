// pnpm tsx scripts/brain-store-io.ts

import { createWriteStream, existsSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { BrainStore } from '@goatlab/delphi-knowledge'
import type {
  Asset,
  EvidenceRef,
  Leaf,
  LeafEvent,
  Relationship,
} from '@goatlab/delphi-protocol'

export interface BrainIoCounts {
  leaves: number
  relationships: number
  evidence: number
  assets: number
  events: number
}

/**
 * Recursively sort keys in an object for deterministic JSON serialization.
 */
function sortKeys(val: unknown): unknown {
  if (Array.isArray(val)) {
    return val.map(sortKeys)
  }
  if (val !== null && typeof val === 'object') {
    const sorted: Record<string, unknown> = {}
    for (const k of Object.keys(val as Record<string, unknown>).sort()) {
      sorted[k] = sortKeys((val as Record<string, unknown>)[k])
    }
    return sorted
  }
  return val
}

/**
 * Serialize an object with keys in sorted order for deterministic output.
 */
function sortedJson(obj: unknown): string {
  return JSON.stringify(sortKeys(obj))
}

/**
 * Sort an array of objects by their `id` field for deterministic output.
 */
function sortById<T extends { id: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a.id.localeCompare(b.id))
}

/**
 * Write an array of records as deterministic JSONL using a streaming write.
 * Writes one line per record (sorted by id, sorted keys, LF endings, trailing newline).
 * Does NOT build a giant in-memory string — bounds peak memory for large brains.
 */
async function writeJsonlStreaming<T extends { id: string }>(
  filePath: string,
  records: T[],
): Promise<void> {
  const sorted = sortById(records)
  return new Promise<void>((resolveP, rejectP) => {
    const stream = createWriteStream(filePath, { encoding: 'utf8' })
    stream.once('error', rejectP)
    stream.once('finish', resolveP)
    for (const record of sorted) {
      stream.write(`${sortedJson(record)}\n`)
    }
    stream.end()
  })
}

/**
 * Read a JSONL file and parse each line as JSON.
 * Returns empty array if file doesn't exist.
 */
async function readJsonl<T>(filePath: string): Promise<T[]> {
  if (!existsSync(filePath)) {
    return []
  }
  const content = await readFile(filePath, 'utf8')
  return content
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => JSON.parse(line) as T)
}

/**
 * Export all canonical Brain rows to JSONL files in outDir.
 * Files created: leaves.jsonl, relationships.jsonl, evidence.jsonl, assets.jsonl, events.jsonl
 *
 * Each table is fetched and streamed to disk one at a time (sequential, not parallel)
 * so peak memory is bounded to ~1 table at a time — critical for large brains.
 * Rows within each file are sorted by id for deterministic output.
 */
export async function exportBrain(
  store: BrainStore,
  brainId: string,
  outDir = 'brain',
): Promise<BrainIoCounts> {
  await mkdir(outDir, { recursive: true })

  const counts: BrainIoCounts = {
    leaves: 0,
    relationships: 0,
    evidence: 0,
    assets: 0,
    events: 0,
  }

  // Process one table at a time to bound peak memory
  const leaves = await store.listLeaves(brainId)
  counts.leaves = leaves.length
  await writeJsonlStreaming(resolve(outDir, 'leaves.jsonl'), leaves)

  const relationships = await store.listRelationships(brainId)
  counts.relationships = relationships.length
  await writeJsonlStreaming(
    resolve(outDir, 'relationships.jsonl'),
    relationships,
  )

  const evidence = await store.listAllEvidence(brainId)
  counts.evidence = evidence.length
  await writeJsonlStreaming(resolve(outDir, 'evidence.jsonl'), evidence)

  const assets = await store.listAssets(brainId)
  counts.assets = assets.length
  await writeJsonlStreaming(resolve(outDir, 'assets.jsonl'), assets)

  const events = await store.listEvents(brainId)
  counts.events = events.length
  await writeJsonlStreaming(resolve(outDir, 'events.jsonl'), events)

  return counts
}

/**
 * Import canonical Brain rows from JSONL files in inDir.
 * Uses ON CONFLICT DO NOTHING for idempotency.
 * Missing dir → returns all zeros, no throw.
 */
export async function importBrain(
  store: BrainStore,
  brainId: string,
  inDir = 'brain',
): Promise<BrainIoCounts> {
  if (!existsSync(inDir)) {
    return { leaves: 0, relationships: 0, evidence: 0, assets: 0, events: 0 }
  }

  const [leaves, relationships, evidence, assets, events] = await Promise.all([
    readJsonl<Leaf>(resolve(inDir, 'leaves.jsonl')),
    readJsonl<Relationship>(resolve(inDir, 'relationships.jsonl')),
    readJsonl<EvidenceRef>(resolve(inDir, 'evidence.jsonl')),
    readJsonl<Asset>(resolve(inDir, 'assets.jsonl')),
    readJsonl<LeafEvent>(resolve(inDir, 'events.jsonl')),
  ])

  // Insert assets first (leaves reference nothing, but evidence references assets)
  for (const asset of assets) {
    await store.upsertAssetRaw({ ...asset, brainId })
  }
  for (const leaf of leaves) {
    await store.upsertLeafRaw({ ...leaf, brainId })
  }
  for (const rel of relationships) {
    await store.upsertRelationshipRaw({ ...rel, brainId })
  }
  for (const evd of evidence) {
    await store.upsertEvidenceRaw({ ...evd, brainId })
  }
  for (const evt of events) {
    await store.insertEventRaw({ ...evt, brainId })
  }

  return {
    leaves: leaves.length,
    relationships: relationships.length,
    evidence: evidence.length,
    assets: assets.length,
    events: events.length,
  }
}
