// scripts/governance-bridge.ts — Wire @goatlab/delphi-governance to our stack.
//
// Provides:
//   makeBrainClientAdapter   — BrainClient over BrainStore
//   makeConstitutionGuard    — classifies evolution work orders (The Human Boundary)
//   makePerspectiveReviewer  — rubric-backed heuristic perspectives for review
//   perspectivesForWorkClass — selects perspectives by work class (code vs rfc)
//   makeReviewDecider        — rejects on any single reject, escalates otherwise
//   runArbiter               — injectable arbiter runner for inside-boundary escalation
//   persistEvaluation        — creates EVALUATION leaf + EVALUATES edge

import { existsSync, readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import type {
  Action,
  BrainClient,
  Classification,
  Decision,
  GovernedItem,
  GuardContext,
  GuardVerdict,
  Outcome,
  Perspective,
} from '@goatlab/delphi-governance'
import {
  DefaultConstitutionGuard,
  DefaultReviewDecider,
  heuristicPerspectiveEvaluator,
  InMemoryBrainClient,
  PerspectiveReviewer,
} from '@goatlab/delphi-governance'
import { BrainStore } from '@goatlab/delphi-knowledge'
import type { Leaf } from '@goatlab/delphi-protocol'
import { classifyWorkOrder } from './constitution.js'
import type { RubricContent } from './rubrics.js'
import { getRubricByTitle } from './rubrics.js'

// ── CriterionScore ────────────────────────────────────────────────────────────

export interface CriterionScore {
  criterionId: string
  score: number // 0..1
  rationale: string
}

// ── EvaluationInput ───────────────────────────────────────────────────────────

export interface EvaluationInput {
  rubricId: string
  targetLeafId: string
  perspective: string
  scores: CriterionScore[]
  finalScore: number
  verdict: 'approve' | 'reject' | 'needs_human' | 'neutral'
  rationale?: string
}

// ── persistEvaluation ─────────────────────────────────────────────────────────

export async function persistEvaluation(
  store: BrainStore,
  brainId: string,
  input: EvaluationInput,
): Promise<Leaf> {
  const targetLeaf = await store.getLeaf(input.targetLeafId).catch(() => null)
  const targetSlice = (targetLeaf?.title ?? input.targetLeafId).slice(0, 40)
  const evalTitle = `Evaluation: ${input.perspective} on ${targetSlice}`

  const existing = await store.listLeaves(brainId)
  const found = existing.find(
    l => l.kind === 'EVALUATION' && l.title === evalTitle,
  )
  if (found) {
    return found
  }

  const regions = await store.listRegions(brainId)
  const objRegion = regions.find(r => r.title === 'Objectives')

  const verdictLine =
    input.verdict === 'approve'
      ? `APPROVED (score ${input.finalScore.toFixed(2)})`
      : input.verdict === 'reject'
        ? `REJECTED (score ${input.finalScore.toFixed(2)})`
        : `NEEDS_HUMAN (score ${input.finalScore.toFixed(2)})`

  const leaf = await store.createLeaf({
    brainId,
    kind: 'EVALUATION' as any,
    status: 'ACTIVE',
    title: evalTitle,
    statement:
      `${input.perspective} perspective: ${verdictLine}. ${input.rationale ?? ''}`.trim(),
    aliases: [],
    tags: ['evaluation', 'governance', input.perspective],
    regionId: objRegion?.id,
    content: {
      rubricId: input.rubricId,
      targetLeafId: input.targetLeafId,
      perspective: input.perspective,
      scores: input.scores,
      finalScore: input.finalScore,
      verdict: input.verdict,
      rationale: input.rationale,
    } as unknown as Record<string, unknown>,
  })

  if (targetLeaf) {
    await store.createRelationship({
      brainId,
      sourceLeafId: leaf.id,
      targetLeafId: input.targetLeafId,
      type: 'EVALUATES',
    })
  }

  return leaf
}

// ── BrainStore → BrainClient adapter ─────────────────────────────────────────

export function makeBrainClientAdapter(
  store: BrainStore,
  brainId: string,
): BrainClient {
  return {
    async listExecutableActions(): Promise<Action[]> {
      const leaves = await store.listLeaves(brainId, { kind: 'TASK' })
      return leaves
        .filter(l => l.status === 'ACTIVE')
        .map(l => ({
          name: l.id,
          kind: 'action' as const,
          description: l.title,
          type:
            ((l.content as Record<string, unknown>)?.trigger as string) ??
            'unknown',
          status: 'proposed' as const,
          tags: (l.tags as string[]) ?? [],
          classifications: [],
        }))
    },

    async getDecision(name: string): Promise<Decision | null> {
      const byId = await store.getLeaf(name).catch(() => null)
      if (byId && byId.kind === 'DECISION') {
        return leafToDecision(byId)
      }
      const leaves = await store.listLeaves(brainId, { kind: 'DECISION' })
      const found = leaves.find(l => l.title === name)
      return found ? leafToDecision(found) : null
    },

    async getClassification(name: string): Promise<Classification | null> {
      const leaves = await store.listLeaves(brainId)
      const found = leaves.find(
        l =>
          (l.tags ?? []).includes('classification') &&
          (l.title === name || l.id === name),
      )
      if (!found) {
        return null
      }
      const c = found.content as Record<string, unknown> | undefined
      const cls: Classification = {
        name: found.title,
        kind: 'classification',
        description: found.statement ?? found.title,
        severity: (c?.severity as string) ?? 'low',
      }
      if (c?.handlingRules) {
        cls.handlingRules = c.handlingRules as string[]
      }
      if (c?.regulatoryBasis) {
        cls.regulatoryBasis = c.regulatoryBasis as string[]
      }
      return cls
    },

    async recordOutcome(outcome: Outcome): Promise<void> {
      const existing = await store.getLeaf(outcome.itemName).catch(() => null)
      if (existing && existing.kind === 'TASK') {
        await store.updateLeaf(outcome.itemName, {
          content: {
            ...((existing.content as Record<string, unknown>) ?? {}),
            outcome: {
              status: outcome.status,
              runId: outcome.runId,
              recordedAt: outcome.recordedAt,
              error: outcome.error,
            },
          },
        })
      }

      const regions = await store.listRegions(brainId)
      const opsRegion = regions.find(r => r.title === 'Operations')
      await store.createLeaf({
        brainId,
        kind: 'BELIEF',
        status: 'ACTIVE',
        title: `Outcome: ${outcome.itemName} — ${outcome.status}`,
        statement: `Governance outcome recorded for ${outcome.itemName}: ${outcome.status} at ${outcome.recordedAt}`,
        aliases: [],
        tags: ['outcome', 'governance'],
        regionId: opsRegion?.id,
        content: outcome as unknown as Record<string, unknown>,
      })
    },
  }
}

function leafToDecision(leaf: Leaf): Decision {
  const c = leaf.content as Record<string, unknown> | undefined
  const d: Decision = {
    name: leaf.id,
    kind: 'decision',
    description: leaf.title,
    status: (leaf.status === 'ACTIVE'
      ? 'approved'
      : 'proposed') as Decision['status'],
    tags: (leaf.tags as string[]) ?? [],
  }
  if (leaf.statement) {
    d.context = leaf.statement
  }
  if (c?.choice) {
    d.choice = c.choice as string
  }
  if (c?.consequences) {
    d.consequences = c.consequences as string
  }
  return d
}

// ── ConstitutionGuard ─────────────────────────────────────────────────────────
//
// The Human Boundary (CONSTITUTION.md):
//   requiresHuman=true ONLY when classifyWorkOrder → humanImpact=true,
//   OR when the work touches a migrated (published) package (those edits
//   affect published consumers = humans → block outright).
//   Everything operating inside this repo is autonomous; borderline
//   review scores route to the ARBITER AGENT, never to a human.

export function makeConstitutionGuard(): DefaultConstitutionGuard {
  const PROTECTED_PACKAGES = [
    'delphi-core',
    'delphi-ai',
    'delphi-brain',
    'delphi-bun',
    'delphi-express',
    'delphi-governance',
    'delphi-langgraph',
    'delphi-sandbox',
    'delphi-trpc',
    'delphi-ui',
    'realtime-broker',
  ]

  return new DefaultConstitutionGuard({
    humanReviewSeverities: ['high'],
    blockSeverities: ['highest'],
    rule(
      item: GovernedItem,
      _ctx: GuardContext,
    ): Partial<GuardVerdict> | undefined {
      const tags = (item as Action).tags ?? []
      const trigger = (item as Action).type ?? ''
      const description = item.description ?? ''

      // 1. Protected (migrated/published) packages → BLOCK.
      //    Reason: editing a published package affects external consumers = humans.
      const touchesProtected = PROTECTED_PACKAGES.some(
        pkg => description.includes(pkg) || tags.includes(pkg),
      )
      if (touchesProtected) {
        return {
          allow: false,
          reasons: [
            `Work order touches a protected (migrated/published) package: ${PROTECTED_PACKAGES.find(p => description.includes(p) || tags.includes(p))}. Blocked — published-consumers = humans (The Human Boundary).`,
          ],
        }
      }

      // 2. Human-boundary classification via constitution.ts policy.
      //    Any action that would contact, interact with, or affect another human
      //    requires human approval.
      const classification = classifyWorkOrder(
        { description },
        `${trigger} ${description} ${tags.join(' ')}`,
      )
      if (classification.humanImpact) {
        return {
          allow: false,
          requiresHuman: true,
          reasons: [
            'Human Boundary: this work order crosses the human boundary.',
            ...classification.reasons,
          ],
        }
      }

      // 3. Spec / RFC work → allow, requiresReview (agent perspectives), NOT human.
      //    Inside-boundary escalation routes to arbiter agent.
      const isSpecWork =
        trigger === 'SPEC_GAP' ||
        description.includes('rfcs/') ||
        tags.includes('spec') ||
        tags.includes('rfc')
      if (isSpecWork) {
        return {
          allow: true,
          requiresHuman: false,
          reasons: [
            'Spec/RFC work inside this repo — Constitution allows; perspective review + arbiter escalation applies.',
          ],
        }
      }

      // 4. Code work (QUEUED_TASK) → allow, requiresReview (agent perspectives, NOT human).
      const isCodeWork = trigger === 'QUEUED_TASK'
      if (isCodeWork) {
        return {
          allow: true,
          requiresHuman: false,
          reasons: [
            'QUEUED_TASK is a code-touching engineering work order inside this repo — Constitution allows; change-scope + spec-coherence perspective review applies; arbiter handles borderline cases.',
          ],
        }
      }

      // 5. Docs/research/maintenance → allow, no review required.
      const isDocsWork =
        description.includes('docs/') ||
        description.includes('research/') ||
        trigger === 'EMPTY_REGION' ||
        trigger === 'OPEN_QUESTION' ||
        trigger === 'ORPHAN_BELIEFS' ||
        trigger === 'STALE_INDEXES' ||
        trigger === 'FLAGGED_LEAVES' ||
        trigger === 'GOAL_GAP'
      if (isDocsWork) {
        return {
          allow: true,
          requiresHuman: false,
          reasons: [
            'Docs/research/maintenance work — Constitution allows; no review required.',
          ],
        }
      }

      return undefined
    },
  })
}

// ── perspectivesForWorkClass ──────────────────────────────────────────────────
//
// Selects the appropriate perspectives based on work class.
//
//   code work (QUEUED_TASK non-rfc diffs) → change-scope + spec-coherence
//   rfc-touching work (SPEC_GAP / rfcs/ diffs) → all three incl. redundancy
//
// The redundancy perspective scans rfcs/ heading overlaps — it is only
// meaningful for RFC/spec drafts and must NOT score code diffs.

export type WorkClass = 'code' | 'rfc' | 'docs'

export function perspectivesForWorkClass(
  workClass: WorkClass,
): import('@goatlab/delphi-governance').Perspective[] {
  if (workClass === 'rfc') {
    return [
      { name: 'redundancy', weight: 2 },
      { name: 'spec-coherence', weight: 1 },
      { name: 'scope', weight: 2 },
    ]
  }
  // code and docs: scope (change-scope) + spec-coherence; no redundancy
  return [
    { name: 'spec-coherence', weight: 1 },
    { name: 'scope', weight: 2 },
  ]
}

// ── Arbiter runner ────────────────────────────────────────────────────────────
//
// Injectable runner for inside-boundary escalation.
// Production implementation spawns `claude -p` with model ARBITER_MODEL.
// Tests inject a stub via `runArbiterFn`.

export interface ArbiterInput {
  workOrder: string
  rubricScoresSummary: string
  diffSummary: string
}

export interface ArbiterVerdict {
  outcome: 'APPROVE' | 'REJECT'
  rationale: string
}

export type ArbiterRunner = (input: ArbiterInput) => Promise<ArbiterVerdict>

/** Default production arbiter: spawns claude -p with a stronger model. */
export async function runArbiter(input: ArbiterInput): Promise<ArbiterVerdict> {
  const { spawnSync } = await import('node:child_process')
  const model = process.env.ARBITER_MODEL ?? 'claude-opus-4-8'
  const prompt = [
    'You are an ARBITER agent for the Delphi autonomous evolution loop.',
    'The Human Boundary constitution is in effect:',
    '  - Human approval is required ONLY for actions that contact/interact with/affect another human.',
    '  - All work inside this repository is fully autonomous.',
    '  - Your ruling is binding. Issue APPROVE or REJECT with a 2-sentence rationale.',
    '',
    '## Work Order',
    input.workOrder,
    '',
    '## Perspective Rubric Scores',
    input.rubricScoresSummary,
    '',
    '## Diff Summary',
    input.diffSummary,
    '',
    'Respond with exactly one line: APPROVE: <rationale>  OR  REJECT: <rationale>',
  ].join('\n')

  const result = spawnSync('claude', ['-p', '--model', model, prompt], {
    encoding: 'utf8',
    timeout: 5 * 60 * 1000,
  })

  const stdout = (result.stdout ?? '').trim()
  if (result.status !== 0 || !stdout) {
    // Arbiter failure → conservative REJECT
    return {
      outcome: 'REJECT',
      rationale: `Arbiter failed or timed out (exit ${result.status ?? 'timeout'}). Conservative REJECT applied.`,
    }
  }

  const approveMatch = /^APPROVE\s*:\s*(.+)$/i.exec(stdout)
  if (approveMatch) {
    return { outcome: 'APPROVE', rationale: approveMatch[1]!.trim() }
  }
  const rejectMatch = /^REJECT\s*:\s*(.+)$/i.exec(stdout)
  if (rejectMatch) {
    return { outcome: 'REJECT', rationale: rejectMatch[1]!.trim() }
  }
  // Unrecognized response → conservative REJECT
  return {
    outcome: 'REJECT',
    rationale: `Arbiter response not parseable ("${stdout.slice(0, 80)}"). Conservative REJECT applied.`,
  }
}

/** Parse an arbiter verdict from a raw string (for unit testing). */
export function parseArbiterVerdict(raw: string): ArbiterVerdict {
  const trimmed = raw.trim()
  const approveMatch = /^APPROVE\s*:\s*(.+)$/i.exec(trimmed)
  if (approveMatch) {
    return { outcome: 'APPROVE', rationale: approveMatch[1]!.trim() }
  }
  const rejectMatch = /^REJECT\s*:\s*(.+)$/i.exec(trimmed)
  if (rejectMatch) {
    return { outcome: 'REJECT', rationale: rejectMatch[1]!.trim() }
  }
  return {
    outcome: 'REJECT',
    rationale: `Unparseable arbiter response: "${trimmed.slice(0, 80)}". Conservative REJECT applied.`,
  }
}

// ── PerspectiveReviewer ───────────────────────────────────────────────────────

export function makePerspectiveReviewer(
  repoRoot: string,
  store?: BrainStore,
  brainId?: string,
): PerspectiveReviewer {
  const BASE_EVALUATOR = heuristicPerspectiveEvaluator({
    signals: {
      'spec-coherence': [
        {
          keywords: ['rfc-9999', 'specification index'],
          assessment: 'concerns',
          concern:
            'New RFC must be referenced from RFC-9999 (the specification index).',
        },
      ],
      scope: [
        {
          keywords: [
            'packages/delphi-core',
            'packages/delphi-ai',
            'packages/delphi-governance',
            'packages/delphi-brain',
            'packages/delphi-langgraph',
            'packages/delphi-sandbox',
            'realtime-broker',
          ],
          assessment: 'reject',
          concern:
            'Diff touches a protected (migrated) package — out of scope for spec work.',
        },
      ],
    },
    defaultAssessment: 'approve',
  })

  async function loadRubric(title: string): Promise<RubricContent | null> {
    if (!store || !brainId) {
      return null
    }
    try {
      const leaf = await getRubricByTitle(store, brainId, title)
      if (!leaf) {
        return null
      }
      return leaf.content as unknown as RubricContent
    } catch {
      return null
    }
  }

  function weightedScore(
    scores: CriterionScore[],
    rubric: RubricContent,
  ): number {
    let total = 0
    let weightSum = 0
    for (const cs of scores) {
      const criterion = rubric.criteria.find(c => c.id === cs.criterionId)
      if (!criterion) {
        continue
      }
      total += cs.score * criterion.weight
      weightSum += criterion.weight
    }
    return weightSum > 0 ? total / weightSum : 0
  }

  function scoreToVerdict(
    finalScore: number,
    rubric: RubricContent,
  ): 'approve' | 'reject' | 'needs_human' {
    if (finalScore >= rubric.qualityGate) {
      return 'approve'
    }
    if (finalScore <= rubric.rejectGate) {
      return 'reject'
    }
    return 'needs_human'
  }

  const redundancyEvaluator = async (input: {
    decision: Decision
    perspective: Perspective
    context?: string
  }) => {
    if (input.perspective.name !== 'redundancy') {
      return BASE_EVALUATOR(input)
    }

    const rubric = await loadRubric('RFC Redundancy Rubric')
    const qualityGate = rubric?.qualityGate ?? 0.7
    const rejectGate = rubric?.rejectGate ?? 0.4

    const rfcsDir = resolve(repoRoot, 'rfcs')
    if (!existsSync(rfcsDir)) {
      const noOverlapScore: CriterionScore[] = rubric
        ? [
            {
              criterionId: 'topic-overlap',
              score: 1,
              rationale: 'rfcs/ dir not found — cannot check for redundancy',
            },
            {
              criterionId: 'novel-content',
              score: 1,
              rationale: 'rfcs/ dir not found — novel by default',
            },
          ]
        : []
      return {
        perspective: 'redundancy',
        assessment: 'approve' as const,
        confidence: 0.5,
        concerns: ['rfcs/ dir not found — cannot check for redundancy.'],
        criterionScores: noOverlapScore,
        finalScore: 1,
      }
    }

    let files: string[] = []
    try {
      files = (await readdir(rfcsDir))
        .filter(f => f.endsWith('.md'))
        .map(f => resolve(rfcsDir, f))
    } catch {
      return {
        perspective: 'redundancy',
        assessment: 'approve' as const,
        confidence: 0.5,
        concerns: [],
        criterionScores: [] as CriterionScore[],
        finalScore: 1,
      }
    }

    const decisionText = [
      input.decision.description,
      input.decision.context ?? '',
      input.decision.choice ?? '',
    ]
      .join(' ')
      .toLowerCase()

    const topicWords = [
      ...new Set(
        decisionText
          .split(/\W+/)
          .filter(w => w.length >= 5)
          .filter(w => !STOP_WORDS.has(w)),
      ),
    ].slice(0, 30)

    let matchCount = 0
    const matchedIn: string[] = []

    for (const f of files) {
      try {
        const content = readFileSync(f, 'utf8').toLowerCase()
        const headings = content
          .split('\n')
          .filter(l => l.startsWith('#'))
          .map(l => l.replace(/^#+\s*/, ''))

        const fileMatchCount = topicWords.filter(w =>
          headings.some(h => h.includes(w)),
        ).length

        if (fileMatchCount >= 3) {
          matchCount += fileMatchCount
          matchedIn.push(f.replace(repoRoot, '').replace(/^\//, ''))
        }
      } catch {
        // skip unreadable files
      }
    }

    const overlapScore =
      matchCount > 3
        ? Math.max(0, 1 - matchCount / (matchCount + 5))
        : matchCount > 0
          ? 0.6
          : 1.0

    const novelScore = 1 - overlapScore

    const criterionScores: CriterionScore[] = rubric
      ? [
          {
            criterionId: 'topic-overlap',
            score: overlapScore,
            rationale:
              matchCount > 3
                ? `${matchCount} heading matches in ${matchedIn.slice(0, 3).join(', ')}`
                : `${matchCount} matches — below threshold`,
          },
          {
            criterionId: 'novel-content',
            score: novelScore,
            rationale: `Novel content ratio derived from overlap (${((1 - overlapScore) * 100).toFixed(0)}% novel)`,
          },
        ]
      : []

    const finalScore = rubric
      ? weightedScore(criterionScores, rubric)
      : overlapScore

    const verdict = rubric
      ? scoreToVerdict(finalScore, rubric)
      : matchCount > 3
        ? 'reject'
        : 'approve'

    if (verdict === 'reject' || matchCount > 3) {
      return {
        perspective: 'redundancy',
        assessment: 'reject' as const,
        confidence: 0.85,
        concerns: [
          `Topic overlap detected with existing RFCs (${matchCount} heading matches in: ${matchedIn.slice(0, 3).join(', ')}). This RFC may duplicate existing coverage.`,
        ],
        rationale: `Matched ${matchCount} heading patterns across ${matchedIn.length} RFC files.`,
        criterionScores,
        finalScore,
        qualityGate,
        rejectGate,
      }
    }

    return {
      perspective: 'redundancy',
      assessment: (verdict === 'needs_human' ? 'concerns' : 'approve') as
        | 'approve'
        | 'concerns',
      confidence: 0.75,
      concerns: [],
      rationale: `No significant heading overlap found (${matchCount} matches, threshold >3).`,
      criterionScores,
      finalScore,
      qualityGate,
      rejectGate,
    }
  }

  const specCoherenceEvaluator = async (input: {
    decision: Decision
    perspective: Perspective
    context?: string
  }) => {
    if (input.perspective.name !== 'spec-coherence') {
      return BASE_EVALUATOR(input)
    }

    const rubric = await loadRubric('Spec Coherence Rubric')
    const baseResult = await BASE_EVALUATOR(input)

    if (!rubric) {
      return baseResult
    }

    const descLower = (input.decision.description ?? '').toLowerCase()
    const ctxLower = (input.decision.context ?? '').toLowerCase()
    const combined = `${descLower} ${ctxLower}`

    const indexReferenced =
      combined.includes('rfc-9999') || combined.includes('specification index')
        ? 1
        : 0.3

    const hasStatus = combined.includes('status')
    const hasPurpose = combined.includes('purpose')
    const hasCanonical = combined.includes('canonical')
    const styleScore =
      (hasStatus ? 0.33 : 0) +
      (hasPurpose ? 0.33 : 0) +
      (hasCanonical ? 0.34 : 0)

    const depsDeclared =
      combined.includes('depends on') || combined.includes('dependencies')
        ? 1
        : 0.3

    const criterionScores: CriterionScore[] = [
      {
        criterionId: 'index-referenced',
        score: indexReferenced,
        rationale:
          indexReferenced === 1
            ? 'RFC-9999 reference found'
            : 'No RFC-9999 reference found',
      },
      {
        criterionId: 'house-style',
        score: styleScore,
        rationale: `House style score: status=${hasStatus} purpose=${hasPurpose} canonical=${hasCanonical}`,
      },
      {
        criterionId: 'dependencies-declared',
        score: depsDeclared,
        rationale:
          depsDeclared === 1
            ? 'Dependencies section found'
            : 'No dependencies section found',
      },
    ]

    const finalScore = weightedScore(criterionScores, rubric)
    const verdict = scoreToVerdict(finalScore, rubric)

    return {
      ...baseResult,
      criterionScores,
      finalScore,
      qualityGate: rubric.qualityGate,
      rejectGate: rubric.rejectGate,
      verdict,
    }
  }

  const scopeEvaluator = async (input: {
    decision: Decision
    perspective: Perspective
    context?: string
  }) => {
    if (input.perspective.name !== 'scope') {
      return BASE_EVALUATOR(input)
    }

    const rubric = await loadRubric('Change Scope Rubric')
    const baseResult = await BASE_EVALUATOR(input)

    if (!rubric) {
      return baseResult
    }

    const PROTECTED_PACKAGES_PATHS = [
      'packages/delphi-core',
      'packages/delphi-ai',
      'packages/delphi-governance',
      'packages/delphi-brain',
      'packages/delphi-langgraph',
      'packages/delphi-sandbox',
      'realtime-broker',
    ]

    const descLower = (input.decision.description ?? '').toLowerCase()
    const ctxLower = (input.decision.context ?? '').toLowerCase()
    const combined = `${descLower} ${ctxLower}`

    const touchesProtected = PROTECTED_PACKAGES_PATHS.some(p =>
      combined.includes(p.toLowerCase()),
    )

    const allowedPathsScore = touchesProtected ? 0 : 1
    const noPublishedEditsScore = touchesProtected ? 0 : 1

    const criterionScores: CriterionScore[] = [
      {
        criterionId: 'allowed-paths',
        score: allowedPathsScore,
        rationale: touchesProtected
          ? 'Diff touches a protected (migrated) package path'
          : 'No protected package paths detected',
      },
      {
        criterionId: 'no-published-package-edits',
        score: noPublishedEditsScore,
        rationale: touchesProtected
          ? 'Published package edits detected'
          : 'No published package edits detected',
      },
    ]

    const finalScore = weightedScore(criterionScores, rubric)
    const verdict = scoreToVerdict(finalScore, rubric)

    return {
      ...baseResult,
      criterionScores,
      finalScore,
      qualityGate: rubric.qualityGate,
      rejectGate: rubric.rejectGate,
      verdict,
    }
  }

  const combinedEvaluator = async (input: {
    decision: Decision
    perspective: Perspective
    context?: string
  }) => {
    switch (input.perspective.name) {
      case 'redundancy':
        return redundancyEvaluator(input)
      case 'spec-coherence':
        return specCoherenceEvaluator(input)
      case 'scope':
        return scopeEvaluator(input)
      default:
        return BASE_EVALUATOR(input)
    }
  }

  return new PerspectiveReviewer({
    evaluator: combinedEvaluator,
  })
}

/** Common English stop-words to exclude from topic matching. */
const STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'against',
  'shall',
  'should',
  'their',
  'there',
  'these',
  'which',
  'while',
  'where',
  'would',
  'could',
  'under',
  'until',
  'being',
  'other',
  'every',
  'those',
  'state',
  'states',
  'system',
  'given',
  'means',
  'local',
  'using',
  'value',
  'false',
  'below',
  'above',
  'since',
  'brain',
  'brains',
  'delphi',
  'event',
  'events',
  'protocol',
  'knowledge',
  'index',
  'indexes',
  'model',
  'models',
  'types',
  'rules',
  'agent',
  'agents',
  'query',
  'queries',
  'search',
  'design',
  'intro',
  'overview',
  'summary',
  'example',
  'examples',
  'update',
  'updates',
  'access',
  'context',
  'change',
  'changes',
  'result',
  'results',
  'define',
  'defined',
  'create',
  'created',
  'stream',
  'streams',
  'client',
  'clients',
  'server',
  'support',
  'source',
  'target',
  'output',
  'object',
  'objects',
  'layer',
  'layers',
  'phase',
  'phases',
  'start',
  'scope',
  'delta',
])

// Note: thresholds here are fallbacks; rubric-loaded quality/reject gates
// take precedence in each perspective evaluator when a BrainStore is provided.
// Pass opts to override thresholds read from the "Review Decision Rubric" leaf.
export function makeReviewDecider(opts?: {
  approveThreshold?: number
  rejectThreshold?: number
}): DefaultReviewDecider {
  return new DefaultReviewDecider({
    approveThreshold: opts?.approveThreshold ?? 0.7,
    escalateOnReject: false,
    rejectThreshold: opts?.rejectThreshold ?? 0.3,
  })
}

export { classifyWorkOrder, HUMAN_BOUNDARY_ACTIONS } from './constitution.js'
export type { BrainClient, Decision, Perspective }
export { InMemoryBrainClient }
