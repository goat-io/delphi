import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'
import type { BrainStore } from '@goatlab/delphi-knowledge'
import type { Asset, Chunk } from '@goatlab/delphi-protocol'
import { chunkMarkdown } from './chunker.js'
import { parseFrontmatter } from './frontmatter.js'

export async function ingestFile(
  store: BrainStore,
  brainId: string,
  filePath: string,
): Promise<{ asset: Asset; chunks: Chunk[]; skipped: boolean }> {
  const absPath = resolve(filePath)
  const raw = await readFile(absPath, 'utf-8')

  // Compute checksum
  const checksum = createHash('sha256').update(raw, 'utf-8').digest('hex')

  // Check for duplicate
  const existing = await store.findAssetByChecksum(brainId, checksum)
  if (existing !== null) {
    return { asset: existing, chunks: [], skipped: true }
  }

  // Parse frontmatter
  const { meta, body } = parseFrontmatter(raw)

  // Determine title
  let title: string
  if (typeof meta.name === 'string' && meta.name.length > 0) {
    title = meta.name
  } else {
    // Look for first # heading
    const headingMatch = /^#\s+(.+)$/m.exec(body)
    if (headingMatch?.[1]) {
      title = headingMatch[1].trim()
    } else {
      // basename without extension
      title = basename(absPath, extname(absPath))
    }
  }

  // Determine type
  const ext = extname(absPath).toLowerCase()
  const type = ext === '.md' ? ('MARKDOWN' as const) : ('TEXT' as const)

  // Create asset
  const assetInput: Parameters<BrainStore['createAsset']>[0] = {
    brainId,
    type,
    title,
    uri: absPath,
    checksum,
  }
  if (Object.keys(meta).length > 0) {
    assetInput.metadata = meta
  }
  const asset = await store.createAsset(assetInput)

  // Chunk the body
  const rawChunks = chunkMarkdown(body)

  if (rawChunks.length === 0) {
    return { asset, chunks: [], skipped: false }
  }

  // Build chunk inputs
  const chunkInputs = rawChunks.map((rc, i) => {
    const base: Omit<Chunk, 'id'> = {
      assetId: asset.id,
      ordinal: i,
      text: rc.text,
    }
    if (rc.section !== undefined) {
      base.location = { section: rc.section }
    }
    return base
  })

  const chunks = await store.createChunks(chunkInputs)
  return { asset, chunks, skipped: false }
}

export async function ingestDirectory(
  store: BrainStore,
  brainId: string,
  dirPath: string,
): Promise<{ assets: Asset[]; chunks: Chunk[]; skipped: number }> {
  const absDir = resolve(dirPath)
  const entries = await readdir(absDir)
  const sorted = entries
    .filter(e => {
      const ext = extname(e).toLowerCase()
      return ext === '.md' || ext === '.txt'
    })
    .sort()

  const allAssets: Asset[] = []
  const allChunks: Chunk[] = []
  let skipped = 0

  for (const entry of sorted) {
    const filePath = resolve(absDir, entry)
    const result = await ingestFile(store, brainId, filePath)
    allAssets.push(result.asset)
    allChunks.push(...result.chunks)
    if (result.skipped) {
      skipped++
    }
  }

  return { assets: allAssets, chunks: allChunks, skipped }
}
