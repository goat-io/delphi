import type { BrainStore } from '@goatlab/delphi-knowledge'
import type { Candidate, Resolution } from '@goatlab/delphi-protocol'
import { computeConfidence } from '@goatlab/delphi-protocol'

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'that',
  'this',
  'with',
  'are',
  'was',
  'not',
  'its',
  'has',
  'have',
  'can',
  'will',
])

const NEGATION_TOKENS = new Set(['not', 'cannot', 'never', 'no'])

export function tokenSet(s: string): Set<string> {
  const tokens = s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOPWORDS.has(w))
  return new Set(tokens)
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) {
    return 1
  }
  let intersection = 0
  for (const t of a) {
    if (b.has(t)) {
      intersection++
    }
  }
  const union = a.size + b.size - intersection
  if (union === 0) {
    return 0
  }
  return intersection / union
}

export function detectNegationPair(a: string, b: string): boolean {
  const aTokens = tokenSet(a)
  const bTokens = tokenSet(b)

  // Remove negation tokens to get the base sets
  const aBase = new Set([...aTokens].filter(t => !NEGATION_TOKENS.has(t)))
  const bBase = new Set([...bTokens].filter(t => !NEGATION_TOKENS.has(t)))

  if (aBase.size === 0 || bBase.size === 0) {
    return false
  }

  // Base sets must be equal
  if (aBase.size !== bBase.size) {
    return false
  }
  for (const t of aBase) {
    if (!bBase.has(t)) {
      return false
    }
  }

  // Check originals directly for negation tokens (word-boundary match on lowercased text)
  const negPattern = /\b(not|cannot|never|no)\b/i
  const aHasNeg = negPattern.test(a)
  const bHasNeg = negPattern.test(b)

  return aHasNeg !== bHasNeg
}

export async function resolveCandidate(
  store: BrainStore,
  brainId: string,
  c: Candidate,
  opts: {
    defaultRegionId: string
    mergeThreshold?: number
    linkThreshold?: number
  },
): Promise<Resolution> {
  const mergeThreshold = opts.mergeThreshold ?? 0.6
  const linkThreshold = opts.linkThreshold ?? 0.35

  // 1. FLAGGED: low extraction confidence
  if (c.extractionConfidence < 0.5) {
    const conf = computeConfidence({
      avgExtractionConfidence: c.extractionConfidence,
      avgStrength: 0.8,
      distinctAssets: 1,
      evidenceCount: 1,
      hasContradiction: false,
    })
    const leaf = await store.createLeaf({
      brainId,
      kind: c.kind,
      status: 'PROPOSED',
      title: c.title,
      statement: c.statement,
      aliases: c.aliases,
      tags: [],
      confidence: conf,
      regionId: opts.defaultRegionId,
    })
    await store.createEvidence({
      brainId,
      leafId: leaf.id,
      assetId: c.assetId,
      chunkId: c.chunkId,
      citation: c.sourceText.slice(0, 200),
      relation: 'SUPPORTS',
      strength: 0.8,
      extractionConfidence: c.extractionConfidence,
    })
    await store.markRegionDirty(opts.defaultRegionId)
    return {
      outcome: 'FLAGGED',
      candidateId: c.id,
      leafId: leaf.id,
    }
  }

  // 2. Exact match by title or alias
  const exactLeaf = await store.findLeafByTitleOrAlias(brainId, c.title)
  if (exactLeaf !== null) {
    await mergeIntoLeaf(store, brainId, exactLeaf.id, c, opts.defaultRegionId)
    return {
      outcome: 'MERGED',
      candidateId: c.id,
      leafId: exactLeaf.id,
      matchedLeafId: exactLeaf.id,
      similarity: 1,
    }
  }

  // 3. Search for similar leaves
  const searchQuery = (c.statement ?? c.title).slice(0, 200)
  const searchResults = await store.searchLeaves(brainId, searchQuery, 5)
  const sameKind = searchResults.filter(l => l.kind === c.kind)

  const candidateTokens = tokenSet(`${c.title} ${c.statement ?? ''}`)

  let bestLeaf = null
  let bestSimilarity = 0

  for (const leaf of sameKind) {
    const leafTokens = tokenSet(`${leaf.title} ${leaf.statement ?? ''}`)
    const sim = jaccard(candidateTokens, leafTokens)
    if (sim > bestSimilarity) {
      bestSimilarity = sim
      bestLeaf = leaf
    }
  }

  if (bestLeaf !== null) {
    // Check for negation pair
    if (
      bestLeaf.kind === 'BELIEF' &&
      c.kind === 'BELIEF' &&
      detectNegationPair(
        c.statement ?? c.title,
        bestLeaf.statement ?? bestLeaf.title,
      )
    ) {
      // Create new leaf for the contradicting candidate
      const conf = computeConfidence({
        avgExtractionConfidence: c.extractionConfidence,
        avgStrength: 0.8,
        distinctAssets: 1,
        evidenceCount: 1,
        hasContradiction: true,
      })
      const newLeaf = await store.createLeaf({
        brainId,
        kind: c.kind,
        status: 'ACTIVE',
        title: c.title,
        statement: c.statement,
        aliases: c.aliases,
        tags: [],
        confidence: conf,
        regionId: opts.defaultRegionId,
      })
      await store.createEvidence({
        brainId,
        leafId: newLeaf.id,
        assetId: c.assetId,
        chunkId: c.chunkId,
        citation: c.sourceText.slice(0, 200),
        relation: 'SUPPORTS',
        strength: 0.8,
        extractionConfidence: c.extractionConfidence,
      })

      // Create CONTRADICTS relationship
      await store.createRelationship({
        brainId,
        sourceLeafId: newLeaf.id,
        targetLeafId: bestLeaf.id,
        type: 'CONTRADICTS',
      })

      // Update existing leaf's confidence with hasContradiction = true
      const existingStats = await store.evidenceStats(bestLeaf.id)
      const existingRels = await store.listRelationshipsForLeaf(bestLeaf.id)
      const existingHasContradiction = existingRels.some(
        r => r.type === 'CONTRADICTS',
      )
      const existingConf = computeConfidence({
        avgExtractionConfidence: existingStats.avgExtraction,
        avgStrength: existingStats.avgStrength,
        distinctAssets: existingStats.distinctAssets,
        evidenceCount: existingStats.count,
        hasContradiction: existingHasContradiction,
      })
      await store.updateLeaf(bestLeaf.id, { confidence: existingConf })

      await store.markRegionDirty(opts.defaultRegionId)

      return {
        outcome: 'CREATED',
        candidateId: c.id,
        leafId: newLeaf.id,
        matchedLeafId: bestLeaf.id,
        similarity: bestSimilarity,
        rationale: `contradicts ${bestLeaf.id}`,
      }
    }

    if (bestSimilarity >= mergeThreshold) {
      await mergeIntoLeaf(store, brainId, bestLeaf.id, c, opts.defaultRegionId)
      return {
        outcome: 'MERGED',
        candidateId: c.id,
        leafId: bestLeaf.id,
        matchedLeafId: bestLeaf.id,
        similarity: bestSimilarity,
      }
    }

    if (bestSimilarity >= linkThreshold) {
      // Create new leaf + RELATES_TO relationship
      const newLeaf = await createNewLeaf(
        store,
        brainId,
        c,
        opts.defaultRegionId,
        false,
      )
      await store.createRelationship({
        brainId,
        sourceLeafId: newLeaf.id,
        targetLeafId: bestLeaf.id,
        type: 'RELATES_TO',
      })
      await store.markRegionDirty(opts.defaultRegionId)
      return {
        outcome: 'LINKED',
        candidateId: c.id,
        leafId: newLeaf.id,
        matchedLeafId: bestLeaf.id,
        similarity: bestSimilarity,
      }
    }
  }

  // 4. Create new leaf
  const newLeaf = await createNewLeaf(
    store,
    brainId,
    c,
    opts.defaultRegionId,
    false,
  )
  await store.markRegionDirty(opts.defaultRegionId)
  return {
    outcome: 'CREATED',
    candidateId: c.id,
    leafId: newLeaf.id,
  }
}

async function createNewLeaf(
  store: BrainStore,
  brainId: string,
  c: Candidate,
  defaultRegionId: string,
  flagged: boolean,
) {
  const conf = computeConfidence({
    avgExtractionConfidence: c.extractionConfidence,
    avgStrength: 0.8,
    distinctAssets: 1,
    evidenceCount: 1,
    hasContradiction: false,
  })

  const leaf = await store.createLeaf({
    brainId,
    kind: c.kind,
    status: flagged ? 'PROPOSED' : 'ACTIVE',
    title: c.title,
    statement: c.statement,
    aliases: c.aliases,
    tags: [],
    confidence: conf,
    regionId: defaultRegionId,
  })

  await store.createEvidence({
    brainId,
    leafId: leaf.id,
    assetId: c.assetId,
    chunkId: c.chunkId,
    citation: c.sourceText.slice(0, 200),
    relation: 'SUPPORTS',
    strength: 0.8,
    extractionConfidence: c.extractionConfidence,
  })

  return leaf
}

async function mergeIntoLeaf(
  store: BrainStore,
  brainId: string,
  leafId: string,
  c: Candidate,
  defaultRegionId: string,
) {
  const leaf = await store.getLeaf(leafId)
  if (!leaf) {
    return
  }

  // Add evidence
  await store.createEvidence({
    brainId,
    leafId,
    assetId: c.assetId,
    chunkId: c.chunkId,
    citation: c.sourceText.slice(0, 200),
    relation: 'SUPPORTS',
    strength: 0.8,
    extractionConfidence: c.extractionConfidence,
  })

  // Add title to aliases if different
  const patchAliases: string[] | undefined =
    leaf.title.toLowerCase() !== c.title.toLowerCase()
      ? [...leaf.aliases, c.title]
      : undefined

  // Recompute confidence
  const stats = await store.evidenceStats(leafId)
  const rels = await store.listRelationshipsForLeaf(leafId)
  const hasContradiction = rels.some(r => r.type === 'CONTRADICTS')
  const conf = computeConfidence({
    avgExtractionConfidence: stats.avgExtraction,
    avgStrength: stats.avgStrength,
    distinctAssets: stats.distinctAssets,
    evidenceCount: stats.count,
    hasContradiction,
  })

  const patch: Parameters<BrainStore['updateLeaf']>[1] = { confidence: conf }
  if (patchAliases !== undefined) {
    patch.aliases = patchAliases
  }
  await store.updateLeaf(leafId, patch)

  // Mark region dirty if leaf has a region
  const regionId = leaf.regionId ?? defaultRegionId
  await store.markRegionDirty(regionId)
}
