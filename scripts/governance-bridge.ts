// scripts/governance-bridge.ts — Wire @goatlab/delphi-governance to our stack.
//
// Provides:
//   makeBrainClientAdapter  — BrainClient over BrainStore
//   makeConstitutionGuard   — classifies evolution work orders
//   makePerspectiveReviewer — 3 heuristic perspectives for RFC review
//   makeReviewDecider       — rejects on any single reject, escalates otherwise

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

// ── BrainStore → BrainClient adapter ─────────────────────────────────────────

/**
 * Minimal BrainClient adapter over BrainStore.
 *
 * - listExecutableActions: reads TASK/DECISION leaves in ACTIVE status and
 *   converts them to Action objects (the governance loop doesn't use these
 *   directly in our stack — we drive via DebtItems — but the interface requires
 *   it).
 * - getDecision: looks up a DECISION leaf by id or title.
 * - getClassification: looks up a BELIEF leaf tagged "classification".
 * - recordOutcome: updates the originating TASK leaf with outcome content
 *   and creates a BELIEF leaf recording the outcome narrative.
 *
 * Semantics mirror InMemoryBrainClient (see src/BrainClient.ts).
 */
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
      // Try by id first, then by title
      const byId = await store.getLeaf(name).catch(() => null)
      if (byId && byId.kind === 'DECISION') {
        return leafToDecision(byId)
      }
      const leaves = await store.listLeaves(brainId, { kind: 'DECISION' })
      const found = leaves.find(l => l.title === name)
      return found ? leafToDecision(found) : null
    },

    async getClassification(name: string): Promise<Classification | null> {
      // Classification leaves are BELIEFs tagged "classification"
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
      // Update the originating TASK leaf with outcome data
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

      // Also record as a BELIEF leaf for traceability
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

// ── ConstitutionGuard for the evolution stack ─────────────────────────────────

/**
 * Classifies evolution work orders:
 * - rfcs/ touching work (SPEC_GAP trigger or target path in rfcs/) → require review
 * - migrated package touching → block
 * - docs/research work → allow
 */
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

      // Check if description references protected packages
      const touchesProtected = PROTECTED_PACKAGES.some(
        pkg => description.includes(pkg) || tags.includes(pkg),
      )
      if (touchesProtected) {
        return {
          allow: false,
          reasons: [
            `Work order touches a protected (migrated) package: ${PROTECTED_PACKAGES.find(p => description.includes(p) || tags.includes(p))}. Blocked by Constitution.`,
          ],
        }
      }

      // SPEC_GAP work or description referencing rfcs/ → require perspective review
      const isSpecWork =
        trigger === 'SPEC_GAP' ||
        description.includes('rfcs/') ||
        tags.includes('spec') ||
        tags.includes('rfc')
      if (isSpecWork) {
        return {
          requiresHuman: true,
          reasons: [
            'Work touches rfcs/ or is SPEC_GAP — perspective review required before execution.',
          ],
        }
      }

      // docs/ or research/ work → allow with no extra gate
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
          reasons: ['Docs/research/maintenance work — Constitution allows.'],
        }
      }

      return undefined // fall through to default severity logic
    },
  })
}

// ── PerspectiveReviewer for RFC review ────────────────────────────────────────

/**
 * Three heuristic perspectives for RFC review.
 * Uses heuristicPerspectiveEvaluator with custom signals plus a
 * "redundancy" perspective that greps rfcs/ for topic overlap.
 */
export function makePerspectiveReviewer(repoRoot: string): PerspectiveReviewer {
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

  /**
   * "redundancy" perspective: loads RFC headings from rfcs/ and checks whether
   * the proposed decision text overlaps with existing RFC headings/phrases.
   * REJECTs when >3 matching headings/phrases found.
   */
  const redundancyEvaluator = async (input: {
    decision: Decision
    perspective: Perspective
    context?: string
  }) => {
    if (input.perspective.name !== 'redundancy') {
      return BASE_EVALUATOR(input)
    }

    const rfcsDir = resolve(repoRoot, 'rfcs')
    if (!existsSync(rfcsDir)) {
      return {
        perspective: 'redundancy',
        assessment: 'approve' as const,
        confidence: 0.5,
        concerns: ['rfcs/ dir not found — cannot check for redundancy.'],
      }
    }

    // Gather headings from all RFC files
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
      }
    }

    const decisionText = [
      input.decision.description,
      input.decision.context ?? '',
      input.decision.choice ?? '',
    ]
      .join(' ')
      .toLowerCase()

    // Extract words of 5+ chars from decision text as topic signals
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

    if (matchCount > 3) {
      return {
        perspective: 'redundancy',
        assessment: 'reject' as const,
        confidence: 0.85,
        concerns: [
          `Topic overlap detected with existing RFCs (${matchCount} heading matches in: ${matchedIn.slice(0, 3).join(', ')}). This RFC may duplicate existing coverage.`,
        ],
        rationale: `Matched ${matchCount} heading patterns across ${matchedIn.length} RFC files.`,
      }
    }

    return {
      perspective: 'redundancy',
      assessment: 'approve' as const,
      confidence: 0.75,
      concerns: [],
      rationale: `No significant heading overlap found (${matchCount} matches, threshold >3).`,
    }
  }

  // Combined evaluator: route to redundancy checker or base heuristic
  const combinedEvaluator = async (input: {
    decision: Decision
    perspective: Perspective
    context?: string
  }) => {
    if (input.perspective.name === 'redundancy') {
      return redundancyEvaluator(input)
    }
    return BASE_EVALUATOR(input)
  }

  return new PerspectiveReviewer({
    evaluator: combinedEvaluator,
  })
}

/** Common English stop-words to exclude from topic matching. */
const STOP_WORDS = new Set([
  // English function words
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
  // Delphi domain-generic words (appear in nearly every RFC heading)
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

export function makeReviewDecider(): DefaultReviewDecider {
  return new DefaultReviewDecider({
    approveThreshold: 0.7,
    escalateOnReject: false,
    rejectThreshold: 0.3,
  })
}

export type { BrainClient, Decision, Perspective }
export { InMemoryBrainClient }
