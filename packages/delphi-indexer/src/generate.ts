import type { BrainStore } from '@goatlab/delphi-knowledge'
import type { KnowledgeIndex, Leaf } from '@goatlab/delphi-protocol'
import type { RegionDigest, Summarizer } from './summarizer.js'

/**
 * Sort beliefs by confidence.value descending (missing confidence = 0).
 */
function sortedTopBeliefs(beliefs: Leaf[]): Leaf[] {
  return [...beliefs].sort(
    (a, b) => (b.confidence?.value ?? 0) - (a.confidence?.value ?? 0),
  )
}

export async function generateIndexes(
  store: BrainStore,
  brainId: string,
  summarizer: Summarizer,
  opts?: { onlyStale?: boolean },
): Promise<KnowledgeIndex[]> {
  const regions = await store.listRegions(brainId)
  const allLeaves = await store.listLeaves(brainId)

  const results: KnowledgeIndex[] = []

  for (const region of regions) {
    const leaves = allLeaves.filter(l => l.regionId === region.id)
    if (leaves.length === 0) {
      continue
    }

    if (opts?.onlyStale) {
      const existing = await store.getIndexByRegion(region.id)
      if (existing !== null && !existing.stale) {
        // Not stale, skip
        continue
      }
      // No existing index → always generate (falls through)
    }

    const beliefs = leaves.filter(
      l => l.kind === 'BELIEF' && l.status !== 'ARCHIVED',
    )
    const objects = leaves.filter(
      l => l.kind === 'OBJECT' && l.status !== 'ARCHIVED',
    )
    const questions = leaves.filter(
      l => l.kind === 'QUESTION' && l.status !== 'ARCHIVED',
    )
    const topBeliefs = sortedTopBeliefs(beliefs)

    const digest: RegionDigest = {
      region,
      leaves,
      beliefs,
      objects,
      questions,
      topBeliefs,
    }

    const summaries = await summarizer.summarize(digest)

    const keyConcepts = objects.slice(0, 10).map(o => o.title)
    const keyBeliefs = topBeliefs.slice(0, 10).map(b => b.title)
    const keyQuestions = questions.slice(0, 10).map(q => q.title)

    // representativeLeafIds = topBeliefs ids ++ first 3 object ids, dedupe, max 10
    const repIds: string[] = []
    const seen = new Set<string>()
    for (const b of topBeliefs) {
      if (!seen.has(b.id)) {
        repIds.push(b.id)
        seen.add(b.id)
      }
    }
    for (const o of objects.slice(0, 3)) {
      if (!seen.has(o.id)) {
        repIds.push(o.id)
        seen.add(o.id)
      }
    }

    const idx = await store.upsertIndex({
      brainId,
      regionId: region.id,
      title: region.title,
      summaryTiny: summaries.tiny,
      summaryShort: summaries.short,
      summaryMedium: summaries.medium,
      summaryLong: summaries.long,
      keyConcepts,
      keyBeliefs,
      keyQuestions,
      representativeLeafIds: repIds.slice(0, 10),
      stale: false,
      changedLeafCount: 0,
    })

    results.push(idx)
  }

  return results
}
