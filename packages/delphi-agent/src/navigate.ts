import type { BrainStore } from '@goatlab/delphi-knowledge'
import type { KnowledgeIndex } from '@goatlab/delphi-protocol'

export async function pickRegion(
  store: BrainStore,
  brainId: string,
  question: string,
): Promise<{
  region: { id: string; title: string } | null
  index: KnowledgeIndex | null
  path: string[]
}> {
  const indexes = await store.listIndexes(brainId)
  if (indexes.length === 0) {
    return { region: null, index: null, path: ['brain'] }
  }

  const tokens = question
    .toLowerCase()
    .split(/\W+/)
    .filter(t => t.length > 2)

  let bestIndex: KnowledgeIndex | null = null
  let bestScore = -1

  for (const idx of indexes) {
    const searchText = [
      idx.title,
      idx.summaryShort,
      ...idx.keyConcepts,
      ...idx.keyBeliefs,
    ]
      .join(' ')
      .toLowerCase()
    const score = tokens.filter(t => searchText.includes(t)).length
    if (
      score > bestScore ||
      (score === bestScore &&
        bestIndex !== null &&
        idx.keyBeliefs.length > bestIndex.keyBeliefs.length)
    ) {
      bestScore = score
      bestIndex = idx
    }
  }

  if (bestIndex !== null && bestScore > 0) {
    return {
      region: { id: bestIndex.regionId, title: bestIndex.title },
      index: bestIndex,
      path: ['brain', bestIndex.title],
    }
  }
  return { region: null, index: null, path: ['brain'] }
}
