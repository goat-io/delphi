// scripts/candidate-gate.ts — Evaluate candidate resolution quality against a RUBRIC leaf.
//
// Reads from "Candidate Resolution Rubric" and persists an EVALUATION leaf.
// Constants are runtime fallbacks — no live brain required at import time.

import type { BrainStore } from '@goatlab/delphi-knowledge'
import type { EvaluationInput } from './governance-bridge.js'
import { persistEvaluation } from './governance-bridge.js'
import type { RubricContent } from './rubrics.js'
import { getRubricByTitle } from './rubrics.js'

export const CANDIDATE_RUBRIC_TITLE = 'Candidate Resolution Rubric'

// Runtime fallbacks used when rubric leaf is absent
const FALLBACK_QUALITY_GATE = 0.7
const FALLBACK_REJECT_GATE = 0.4
const FALLBACK_FLAGGED_RATIO_MAX = 0.3

export interface CandidateGateInput {
  /** Leaf that the evaluation targets — typically the asset or task leaf. */
  targetLeafId: string
  candidates: number
  created: number
  merged: number
  linked: number
  flagged: number
}

export interface CandidateGateResult {
  verdict: 'approve' | 'reject' | 'needs_human'
  finalScore: number
  evaluationLeafId: string
}

export async function runCandidateGate(
  store: BrainStore,
  brainId: string,
  input: CandidateGateInput,
): Promise<CandidateGateResult> {
  const rubricLeaf = await getRubricByTitle(
    store,
    brainId,
    CANDIDATE_RUBRIC_TITLE,
  )
  const rubric = rubricLeaf
    ? (rubricLeaf.content as unknown as RubricContent)
    : undefined

  const qualityGate = rubric?.qualityGate ?? FALLBACK_QUALITY_GATE
  const rejectGate = rubric?.rejectGate ?? FALLBACK_REJECT_GATE

  const { candidates, created, merged, linked, flagged } = input

  // ── criterion scores ──────────────────────────────────────────────────────

  // flagged-ratio-acceptable: 0 when no candidates; else 1 when ratio ≤ max, linear falloff above
  const flaggedRatio = candidates > 0 ? flagged / candidates : 0
  const flaggedScore =
    candidates === 0
      ? 0
      : flaggedRatio <= FALLBACK_FLAGGED_RATIO_MAX
        ? 1
        : Math.max(0, 1 - flaggedRatio)

  // candidate-yield: 1 if any candidates were extracted
  const yieldScore = candidates > 0 ? 1 : 0

  // resolution-completeness: all candidates reached a terminal state
  const resolved = created + merged + linked + flagged
  const completenessScore = candidates > 0 && resolved === candidates ? 1 : 0

  // ── weighted aggregate (weights from rubric or equal split) ───────────────
  const w = rubric?.criteria ?? []
  const wFlagged =
    w.find(c => c.id === 'flagged-ratio-acceptable')?.weight ?? 0.5
  const wYield = w.find(c => c.id === 'candidate-yield')?.weight ?? 0.3
  const wComplete =
    w.find(c => c.id === 'resolution-completeness')?.weight ?? 0.2

  const finalScore =
    wFlagged * flaggedScore +
    wYield * yieldScore +
    wComplete * completenessScore

  const verdict: EvaluationInput['verdict'] =
    finalScore >= qualityGate
      ? 'approve'
      : finalScore < rejectGate
        ? 'reject'
        : 'needs_human'

  const evalInput: EvaluationInput = {
    rubricId: rubricLeaf?.id ?? CANDIDATE_RUBRIC_TITLE,
    targetLeafId: input.targetLeafId,
    perspective: 'candidate-resolution',
    scores: [
      {
        criterionId: 'flagged-ratio-acceptable',
        score: flaggedScore,
        rationale: `flagged ${flagged}/${candidates} (ratio ${flaggedRatio.toFixed(2)})`,
      },
      {
        criterionId: 'candidate-yield',
        score: yieldScore,
        rationale: `${candidates} candidate(s) extracted`,
      },
      {
        criterionId: 'resolution-completeness',
        score: completenessScore,
        rationale: `${resolved}/${candidates} candidates resolved`,
      },
    ],
    finalScore,
    verdict,
    rationale: `candidates=${candidates} created=${created} merged=${merged} linked=${linked} flagged=${flagged}`,
  }

  const evalLeaf = await persistEvaluation(store, brainId, evalInput)

  return { verdict, finalScore, evaluationLeafId: evalLeaf.id }
}
