// scripts/rubrics.ts — Seed and retrieve RUBRIC leaves for governance perspectives.
// Per RFC-0005: rubrics are first-class leaves with criteria, weights, and quality gates.

import { ensureSeededRegions } from '@goatlab/delphi-indexer'
import { BrainStore } from '@goatlab/delphi-knowledge'
import type { Leaf } from '@goatlab/delphi-protocol'

// ── Rubric content shape ──────────────────────────────────────────────────────

export interface CriterionDef {
  id: string
  name: string
  description: string
  weight: number
  scoringRange: { min: number; max: number }
}

export interface RubricContent {
  criteria: CriterionDef[]
  scoringMethod: 'WEIGHTED' | 'PASS_FAIL' | 'CONSENSUS' | 'PAIRWISE'
  qualityGate: number
  rejectGate: number
  derivedFrom?: string[]
}

// ── Standing rubrics ──────────────────────────────────────────────────────────

const STANDING_RUBRICS: Array<{ title: string; content: RubricContent }> = [
  {
    title: 'RFC Redundancy Rubric',
    content: {
      criteria: [
        {
          id: 'topic-overlap',
          name: 'Topic overlap',
          description: 'Heading/phrase overlap with existing RFCs',
          weight: 0.6,
          scoringRange: { min: 0, max: 1 },
        },
        {
          id: 'novel-content',
          name: 'Novel content ratio',
          description: 'Ratio of headings NOT found elsewhere',
          weight: 0.4,
          scoringRange: { min: 0, max: 1 },
        },
      ],
      scoringMethod: 'WEIGHTED',
      qualityGate: 0.7,
      rejectGate: 0.4,
      derivedFrom: ['RFC-0005', 'RFC-0027 review incident (RFC-0031 reverted)'],
    },
  },
  {
    title: 'Spec Coherence Rubric',
    content: {
      criteria: [
        {
          id: 'index-referenced',
          name: 'Index referenced',
          description: 'New RFC appears in RFC-9999',
          weight: 0.5,
          scoringRange: { min: 0, max: 1 },
        },
        {
          id: 'house-style',
          name: 'House style',
          description: 'Status/Purpose/Canonical Rules sections present',
          weight: 0.3,
          scoringRange: { min: 0, max: 1 },
        },
        {
          id: 'dependencies-declared',
          name: 'Dependencies declared',
          description: 'Dependencies section present and non-empty',
          weight: 0.2,
          scoringRange: { min: 0, max: 1 },
        },
      ],
      scoringMethod: 'WEIGHTED',
      qualityGate: 0.7,
      rejectGate: 0.4,
    },
  },
  {
    title: 'Change Scope Rubric',
    content: {
      criteria: [
        {
          id: 'allowed-paths',
          name: 'Allowed paths',
          description: 'Diff touches only permitted dirs',
          weight: 0.7,
          scoringRange: { min: 0, max: 1 },
        },
        {
          id: 'no-published-package-edits',
          name: 'No published package edits',
          description: 'No edits to published packages',
          weight: 0.3,
          scoringRange: { min: 0, max: 1 },
        },
      ],
      scoringMethod: 'WEIGHTED',
      qualityGate: 0.7,
      rejectGate: 0.4,
    },
  },
  {
    title: 'Verification Gate Rubric',
    content: {
      criteria: [
        {
          id: 'typecheck',
          name: 'TypeScript typecheck',
          description: 'pnpm typecheck exits 0 (no type errors)',
          weight: 0.34,
          scoringRange: { min: 0, max: 1 },
        },
        {
          id: 'lint',
          name: 'Biome lint',
          description: 'pnpm lint:check exits 0 (no lint violations)',
          weight: 0.33,
          scoringRange: { min: 0, max: 1 },
        },
        {
          id: 'tests',
          name: 'Vitest tests',
          description: 'pnpm test exits 0 (all tests pass)',
          weight: 0.33,
          scoringRange: { min: 0, max: 1 },
        },
      ],
      scoringMethod: 'PASS_FAIL',
      qualityGate: 1.0,
      rejectGate: 0.5,
      derivedFrom: ['RFC-0005'],
    },
  },
  {
    title: 'Answer Quality Rubric',
    content: {
      criteria: [
        {
          id: 'cites-sources',
          name: 'Cites correct sources',
          description:
            'Answer evidence list is non-empty and references source assets',
          weight: 0.25,
          scoringRange: { min: 0, max: 1 },
        },
        {
          id: 'key-claims-present',
          name: 'Key claims present',
          description:
            'Answer summary contains the key claims expected from the domain knowledge',
          weight: 0.25,
          scoringRange: { min: 0, max: 1 },
        },
        {
          id: 'confidence-shown',
          name: 'Confidence shown and plausible',
          description: 'Answer confidence value is set and in range (0, 1]',
          weight: 0.25,
          scoringRange: { min: 0, max: 1 },
        },
        {
          id: 'contradictions-surface',
          name: 'Contradictions surface',
          description:
            'Known contradictions are reported when present in the knowledge base',
          weight: 0.25,
          scoringRange: { min: 0, max: 1 },
        },
      ],
      scoringMethod: 'WEIGHTED',
      qualityGate: 0.8,
      rejectGate: 0.4,
      derivedFrom: ['DELPHI-MVP-0001 §Answer-Quality-Benchmark', 'RFC-0005'],
    },
  },
  {
    title: 'Cycle Atomicity Rubric',
    content: {
      criteria: [
        {
          id: 'log-committed-in-cycle',
          name: 'Log committed in cycle',
          description:
            'evolution.log.md entry is committed before the cycle exits, preventing cross-cycle diff contamination',
          weight: 0.6,
          scoringRange: { min: 0, max: 1 },
        },
        {
          id: 'no-stale-diff',
          name: 'No stale diff bleed',
          description:
            "The cycle commit contains only this cycle's work — no uncommitted residue from prior cycles",
          weight: 0.4,
          scoringRange: { min: 0, max: 1 },
        },
      ],
      scoringMethod: 'PASS_FAIL',
      qualityGate: 1.0,
      rejectGate: 0.5,
      derivedFrom: ['Run6 incident: DISPUTED cycle left log uncommitted'],
    },
  },
  {
    title: 'Task Closure Rubric',
    content: {
      criteria: [
        {
          id: 'files-committed',
          name: 'Files committed',
          description:
            'At least one file change was committed as part of this cycle',
          weight: 0.5,
          scoringRange: { min: 0, max: 1 },
        },
        {
          id: 'work-complete',
          name: 'WORK COMPLETE present',
          description:
            'Agent produced a WORK COMPLETE summary line confirming task done',
          weight: 0.5,
          scoringRange: { min: 0, max: 1 },
        },
      ],
      scoringMethod: 'PASS_FAIL',
      qualityGate: 1.0,
      rejectGate: 0.5,
      derivedFrom: [
        'DISPUTED_TASK: log:2026-06-12T19:47:58.290Z — verify-closure must read RUBRIC + persist EVALUATION',
      ],
    },
  },
  {
    title: 'Review Decision Rubric',
    content: {
      criteria: [
        {
          id: 'weighted-approval',
          name: 'Weighted perspective approval',
          description:
            'Aggregate weighted score across all perspective verdicts must meet the quality gate',
          weight: 1.0,
          scoringRange: { min: 0, max: 1 },
        },
      ],
      scoringMethod: 'WEIGHTED',
      qualityGate: 0.7,
      rejectGate: 0.3,
      derivedFrom: [
        'DISPUTED_TASK: leaf_cc25cc4fe36e436a8de6f04c — review gate must read RUBRIC thresholds + persist EVALUATION',
      ],
    },
  },
  {
    title: 'Candidate Resolution Rubric',
    content: {
      criteria: [
        {
          id: 'flagged-ratio-acceptable',
          name: 'Flagged ratio acceptable',
          description:
            'Fraction of candidates flagged for low confidence must be ≤ 0.3; score scales linearly above that',
          weight: 0.5,
          scoringRange: { min: 0, max: 1 },
        },
        {
          id: 'candidate-yield',
          name: 'Candidate yield',
          description:
            'At least one candidate was extracted from the asset chunks',
          weight: 0.3,
          scoringRange: { min: 0, max: 1 },
        },
        {
          id: 'resolution-completeness',
          name: 'Resolution completeness',
          description:
            'All extracted candidates reached a terminal resolution (created + merged + linked + flagged = candidates)',
          weight: 0.2,
          scoringRange: { min: 0, max: 1 },
        },
      ],
      scoringMethod: 'WEIGHTED',
      qualityGate: 0.7,
      rejectGate: 0.4,
      derivedFrom: [
        'RFC-0027 §Extraction-and-Entity-Resolution',
        'UNVERIFIED_CLOSURE: leaf_4bd155626a5f4592b99aaf00 — candidate gate must read RUBRIC + persist EVALUATION',
      ],
    },
  },
]

// ── seedRubrics ───────────────────────────────────────────────────────────────

export async function seedRubrics(
  store: BrainStore,
  brainId: string,
): Promise<Leaf[]> {
  const [objRegion] = await ensureSeededRegions(store, brainId, ['Objectives'])
  const regionId = objRegion?.id

  const existing = await store.listLeaves(brainId)
  const rubricLeaves: Leaf[] = []

  for (const r of STANDING_RUBRICS) {
    const found = existing.find(l => l.title === r.title && l.kind === 'RUBRIC')
    if (found) {
      rubricLeaves.push(found)
      continue
    }

    const leaf = await store.createLeaf({
      brainId,
      kind: 'RUBRIC',
      status: 'ACTIVE',
      title: r.title,
      statement: `Rubric for governance evaluation: ${r.title}`,
      aliases: [],
      tags: ['rubric', 'governance'],
      regionId,
      content: r.content as unknown as Record<string, unknown>,
    })
    rubricLeaves.push(leaf)
  }

  return rubricLeaves
}

// ── getRubricByTitle ──────────────────────────────────────────────────────────

export async function getRubricByTitle(
  store: BrainStore,
  brainId: string,
  title: string,
): Promise<Leaf | null> {
  const leaves = await store.listLeaves(brainId)
  return leaves.find(l => l.kind === 'RUBRIC' && l.title === title) ?? null
}
