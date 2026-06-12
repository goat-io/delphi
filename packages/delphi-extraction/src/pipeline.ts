import type { BrainStore } from '@goatlab/delphi-knowledge'
import type { Asset, Chunk } from '@goatlab/delphi-protocol'
import { canonicalize } from './canonicalize.js'
import type { Extractor } from './extractor.js'
import { resolveCandidate } from './resolve.js'

export async function extractAsset(
  store: BrainStore,
  brainId: string,
  extractor: Extractor,
  asset: Asset,
  chunks: Chunk[],
  opts: { defaultRegionId: string },
): Promise<{
  candidates: number
  created: number
  merged: number
  linked: number
  flagged: number
}> {
  let candidates = 0
  let created = 0
  let merged = 0
  let linked = 0
  let flagged = 0

  for (const chunk of chunks) {
    const rawCandidates = await extractor.extract(chunk, asset.id, asset.title)

    for (const raw of rawCandidates) {
      const c = canonicalize(raw)
      candidates++

      const resolution = await resolveCandidate(store, brainId, c, opts)

      switch (resolution.outcome) {
        case 'CREATED':
          created++
          break
        case 'MERGED':
          merged++
          break
        case 'LINKED':
          linked++
          break
        case 'FLAGGED':
          flagged++
          break
      }
    }
  }

  return { candidates, created, merged, linked, flagged }
}
