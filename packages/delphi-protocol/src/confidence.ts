import type { Confidence } from './schemas'

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

export function computeConfidence(input: {
  avgExtractionConfidence: number
  avgStrength: number
  distinctAssets: number
  evidenceCount: number
  hasContradiction: boolean
}): Confidence {
  const {
    avgExtractionConfidence,
    avgStrength,
    distinctAssets,
    evidenceCount,
    hasContradiction,
  } = input

  const evidenceStrength = clamp01(avgExtractionConfidence * avgStrength)
  const sourceReliability = 0.6
  const sourceDiversity = Math.min(1, distinctAssets / 5)
  const freshness = 1
  const consensus = Math.min(1, evidenceCount / 5)
  const contradictionRisk = hasContradiction ? 0.5 : 0

  const value = clamp01(
    0.3 * evidenceStrength +
      0.2 * sourceReliability +
      0.15 * sourceDiversity +
      0.15 * freshness +
      0.2 * consensus -
      0.2 * contradictionRisk,
  )

  return {
    value,
    evidenceStrength,
    sourceReliability,
    sourceDiversity,
    freshness,
    consensus,
    contradictionRisk,
    explanation: `evidence=${evidenceCount} assets=${distinctAssets}`,
  }
}
