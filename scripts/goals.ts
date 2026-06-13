// scripts/goals.ts — Goal seeding + evaluation for the Delphi evolution stack.
// Part of the governance bridge: GOAL_GAP debt triggers are backed by these goals.

import { ensureSeededRegions } from '@goatlab/delphi-indexer'
import { BrainStore } from '@goatlab/delphi-knowledge'
import type { Leaf } from '@goatlab/delphi-protocol'
import { assessCoverage, COVERAGE_TARGET } from './coverage.js'

// ── Goal shape (stored as OBJECT leaves with tag "goal") ─────────────────────

export interface GoalContent {
  metric: string
  target: number
  comparator: '==' | '<=' | '>='
}

export interface GoalResult {
  goal: Leaf
  current: number
  target: number
  comparator: string
  met: boolean
}

// Standing goals
const STANDING_GOALS: Array<{
  title: string
  content: GoalContent
}> = [
  {
    title: 'All seeded regions populated',
    content: { metric: 'emptySeededRegions', target: 0, comparator: '==' },
  },
  {
    title: 'No orphan beliefs',
    content: { metric: 'orphanBeliefs', target: 0, comparator: '==' },
  },
  {
    title: 'No stale indexes',
    content: { metric: 'staleIndexes', target: 0, comparator: '==' },
  },
  {
    title: 'Open questions triaged below 150',
    content: { metric: 'openQuestions', target: 150, comparator: '<=' },
  },
  {
    title: 'Average confidence above 0.5',
    content: { metric: 'avgConfidence', target: 0.5, comparator: '>=' },
  },
  {
    title: 'All regions meet coverage target',
    content: { metric: 'underCoveredRegions', target: 0, comparator: '==' },
  },
  // NOTE: "No unattended loop anomalies" was removed — it was a circular goal.
  // Its metric counts the maintenance tasks, but satisfying it requires CLOSING
  // those tasks, which sit below it in priority; the goal therefore got picked
  // repeatedly while the tasks that resolve it never ran. Loop-anomaly count is
  // a health metric (brain health / introspection), not a prioritized goal.
]

// ── seedGoals ────────────────────────────────────────────────────────────────

/**
 * Idempotent: creates (or reuses) an "Objectives" SEEDED region and seeds the
 * standing goals as OBJECT leaves tagged ["goal"]. Deduplicates by title.
 * Returns the goal leaf array (existing + newly created).
 */
export async function seedGoals(
  store: BrainStore,
  brainId: string,
): Promise<Leaf[]> {
  const [objRegion] = await ensureSeededRegions(store, brainId, ['Objectives'])
  const regionId = objRegion?.id

  const existing = await store.listLeaves(brainId)
  const goalLeaves: Leaf[] = []

  for (const g of STANDING_GOALS) {
    // Dedupe by title (case-sensitive)
    const found = existing.find(l => l.title === g.title && l.kind === 'OBJECT')
    if (found) {
      goalLeaves.push(found)
      continue
    }

    const leaf = await store.createLeaf({
      brainId,
      kind: 'OBJECT',
      status: 'ACTIVE',
      title: g.title,
      aliases: [],
      tags: ['goal'],
      regionId,
      content: g.content as unknown as Record<string, unknown>,
    })
    goalLeaves.push(leaf)
  }

  return goalLeaves
}

// ── evaluateGoals ─────────────────────────────────────────────────────────────

/**
 * Compute each goal metric against the live brain state and return results.
 * Uses store.health() for most metrics; counts empty SEEDED regions manually.
 */
export async function evaluateGoals(
  store: BrainStore,
  brainId: string,
): Promise<GoalResult[]> {
  const [goals, regions, leaves, health, coverageResults] = await Promise.all([
    store
      .listLeaves(brainId)
      .then(ls =>
        ls.filter(l => l.kind === 'OBJECT' && (l.tags ?? []).includes('goal')),
      ),
    store.listRegions(brainId),
    store.listLeaves(brainId),
    store.health(brainId),
    assessCoverage(store, brainId),
  ])

  // Compute emptySeededRegions
  const seededRegions = regions.filter(r => r.kind === 'SEEDED')
  const emptySeededRegions = seededRegions.filter(r => {
    const count = leaves.filter(l => l.regionId === r.id).length
    return count === 0
  }).length

  // Compute underCoveredRegions
  const underCoveredRegions = coverageResults.filter(
    r => r.score < COVERAGE_TARGET,
  ).length

  function currentFor(metric: string): number {
    switch (metric) {
      case 'emptySeededRegions':
        return emptySeededRegions
      case 'orphanBeliefs':
        return health.orphanBeliefs
      case 'staleIndexes':
        return health.staleIndexes
      case 'openQuestions':
        return health.openQuestions
      case 'avgConfidence':
        return health.avgConfidence ?? 0
      case 'underCoveredRegions':
        return underCoveredRegions
      default:
        return 0
    }
  }

  function metCheck(
    current: number,
    target: number,
    comparator: string,
  ): boolean {
    switch (comparator) {
      case '==':
        return current === target
      case '<=':
        return current <= target
      case '>=':
        return current >= target
      default:
        return false
    }
  }

  const results: GoalResult[] = []
  for (const goal of goals) {
    const c = goal.content as GoalContent | undefined
    if (!c) {
      continue
    }
    const current = currentFor(c.metric)
    results.push({
      goal,
      current,
      target: c.target,
      comparator: c.comparator,
      met: metCheck(current, c.target, c.comparator),
    })
  }

  return results
}
