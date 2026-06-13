// pnpm tsx scripts/brain-store-io.ts

import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
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
 * Write an array of records as deterministic JSONL (sorted by id, sorted keys, LF endings, trailing newline).
 */
async function writeJsonl<T extends { id: string }>(
  filePath: string,
  records: T[],
): Promise<void> {
  const sorted = sortById(records)
  const lines = sorted.map(r => sortedJson(r))
  const content = lines.length > 0 ? `${lines.join('\n')}\n` : ''
  await writeFile(filePath, content, { encoding: 'utf8' })
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
 */
export async function exportBrain(
  store: BrainStore,
  brainId: string,
  outDir = 'brain',
): Promise<BrainIoCounts> {
  await mkdir(outDir, { recursive: true })

  const [leaves, relationships, evidence, assets, events] = await Promise.all([
    store.listLeaves(brainId),
    store.listRelationships(brainId),
    store.listAllEvidence(brainId),
    store.listAssets(brainId),
    store.listEvents(brainId),
  ])

  await Promise.all([
    writeJsonl(resolve(outDir, 'leaves.jsonl'), leaves),
    writeJsonl(resolve(outDir, 'relationships.jsonl'), relationships),
    writeJsonl(resolve(outDir, 'evidence.jsonl'), evidence),
    writeJsonl(resolve(outDir, 'assets.jsonl'), assets),
    writeJsonl(resolve(outDir, 'events.jsonl'), events),
  ])

  return {
    leaves: leaves.length,
    relationships: relationships.length,
    evidence: evidence.length,
    assets: assets.length,
    events: events.length,
  }
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
