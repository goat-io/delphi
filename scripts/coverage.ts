// scripts/coverage.ts — Region coverage assessment for the Delphi evolution stack.
// Imported by goals.ts (for the underCoveredRegions metric) and evolve.ts (for
// COVERAGE_GAP debt detection). Keep imports to @goatlab/delphi-knowledge only
// to avoid circular dependency chains.

import { BrainStore } from '@goatlab/delphi-knowledge'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RegionCoverage {
  regionId: string
  regionTitle: string
  score: number
  gaps: string[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const COVERAGE_TARGET = 0.75

// ── assessCoverage ────────────────────────────────────────────────────────────

/**
 * For each region with ≥1 leaf, compute a 0..1 coverage score from five
 * sub-criteria (each 0..1, averaged):
 *
 * 1. index-depth     — region has an index with non-trivial summaryLong (>120) and
 *                      summaryMedium (>60). 1 if both, 0.5 if only one, 0 if no index.
 * 2. belief-substance — min(1, beliefCount / 8) where beliefCount = BELIEF leaves.
 * 3. confidence      — avg confidence.value of region BELIEF leaves (0 if none).
 * 4. questions-answered — 1 if 0 ACTIVE QUESTION leaves in region, else max(0, 1 − openQ/5).
 * 5. evidence-density — min(1, evidenceCount / (beliefCount * 1.5)) — best-effort cheap query.
 *
 * gaps: human-readable strings for each sub-criterion below 0.6.
 */
export async function assessCoverage(
  store: BrainStore,
  brainId: string,
): Promise<RegionCoverage[]> {
  const [regions, allLeaves, indexes, allEvidence] = await Promise.all([
    store.listRegions(brainId),
    store.listLeaves(brainId),
    store.listIndexes(brainId),
    store.listAllEvidence(brainId),
  ])

  const indexByRegion = new Map(indexes.map(idx => [idx.regionId, idx]))
  const evidenceByLeaf = new Map<string, number>()
  for (const ev of allEvidence) {
    evidenceByLeaf.set(ev.leafId, (evidenceByLeaf.get(ev.leafId) ?? 0) + 1)
  }

  const results: RegionCoverage[] = []

  for (const region of regions) {
    const regionLeaves = allLeaves.filter(l => l.regionId === region.id)

    // Skip regions with no leaves — they're already an EMPTY_REGION debt item.
    if (regionLeaves.length === 0) {
      continue
    }

    const beliefLeaves = regionLeaves.filter(l => l.kind === 'BELIEF')
    const beliefCount = beliefLeaves.length

    // 1. index-depth
    const idx = indexByRegion.get(region.id)
    let indexDepth: number
    if (!idx) {
      indexDepth = 0
    } else {
      const hasLong = (idx.summaryLong?.length ?? 0) > 120
      const hasMedium = (idx.summaryMedium?.length ?? 0) > 60
      if (hasLong && hasMedium) {
        indexDepth = 1
      } else if (hasLong || hasMedium) {
        indexDepth = 0.5
      } else {
        indexDepth = 0.25
      }
    }

    // 2. belief-substance
    const beliefSubstance = Math.min(1, beliefCount / 8)

    // 3. confidence — avg confidence.value of BELIEF leaves
    let confidence = 0
    if (beliefCount > 0) {
      const values = beliefLeaves
        .map(l => {
          const c = l.confidence as { value?: number } | undefined
          return typeof c?.value === 'number' ? c.value : null
        })
        .filter((v): v is number => v !== null)
      if (values.length > 0) {
        confidence = values.reduce((s, v) => s + v, 0) / values.length
      }
    }

    // 4. questions-answered
    const openQuestions = regionLeaves.filter(
      l => l.kind === 'QUESTION' && l.status === 'ACTIVE',
    ).length
    const questionsAnswered =
      openQuestions === 0 ? 1 : Math.max(0, 1 - openQuestions / 5)

    // 5. evidence-density — cheap: count evidence rows for belief leaves
    const totalEvidence = beliefLeaves.reduce(
      (s, l) => s + (evidenceByLeaf.get(l.id) ?? 0),
      0,
    )
    const evidenceDensity =
      beliefCount === 0 ? 0 : Math.min(1, totalEvidence / (beliefCount * 1.5))

    // Aggregate
    const score =
      (indexDepth +
        beliefSubstance +
        confidence +
        questionsAnswered +
        evidenceDensity) /
      5

    // Gaps: sub-criteria below 0.6
    const gaps: string[] = []
    if (indexDepth < 0.6) {
      gaps.push(idx ? 'shallow index' : 'no index')
    }
    if (beliefSubstance < 0.6) {
      gaps.push(`few beliefs (${beliefCount}/8)`)
    }
    if (confidence < 0.6) {
      gaps.push(`low confidence (${confidence.toFixed(2)})`)
    }
    if (questionsAnswered < 0.6) {
      gaps.push(
        `${openQuestions} unanswered question${openQuestions === 1 ? '' : 's'}`,
      )
    }
    if (evidenceDensity < 0.6) {
      gaps.push(
        `sparse evidence (${totalEvidence} rows for ${beliefCount} beliefs)`,
      )
    }

    results.push({
      regionId: region.id,
      regionTitle: region.title,
      score,
      gaps,
    })
  }

  return results
}
