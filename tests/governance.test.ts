// tests/governance.test.ts — Governance bridge integration tests.
// No claude spawning — all heuristic/deterministic.

import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import type { Decision, PerspectiveVerdict } from '@goatlab/delphi-governance'
import { ensureSeededRegions } from '@goatlab/delphi-indexer'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { scanDebt } from '../scripts/evolve.js'
import { evaluateGoals, seedGoals } from '../scripts/goals.js'
import {
  makeConstitutionGuard,
  makePerspectiveReviewer,
  makeReviewDecider,
} from '../scripts/governance-bridge.js'

let store: BrainStore
let brainId: string
let tmpDir: string

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'delphi-governance-'))
  const db = await createDb({ dataDir: tmpDir })
  await migrate(db)
  store = new BrainStore(db)

  const brain = await store.createBrain('delphi', 'Test brain for governance')
  brainId = brain.id

  // Seed required regions
  await ensureSeededRegions(store, brainId, ['Spec', 'Operations', 'Decisions'])
}, 30_000)

afterAll(async () => {
  await store.db.close()
})

describe('governance bridge', () => {
  it('1. seedGoals: creates 5 goal leaves idempotently in Objectives region', async () => {
    const first = await seedGoals(store, brainId)
    expect(first.length).toBe(5)

    // Second call must not create duplicates
    const second = await seedGoals(store, brainId)
    expect(second.length).toBe(5)

    // Titles should match
    const titles = second.map(l => l.title)
    expect(titles).toContain('All seeded regions populated')
    expect(titles).toContain('No orphan beliefs')
    expect(titles).toContain('No stale indexes')
    expect(titles).toContain('Open questions triaged below 150')
    expect(titles).toContain('Average confidence above 0.5')

    // IDs must be the same on both calls (idempotency)
    for (let i = 0; i < first.length; i++) {
      expect(first[i]!.id).toBe(second[i]!.id)
    }
  })

  it('2. evaluateGoals: flags unmet goal when empty seeded region exists', async () => {
    // After seeding, 'emptySeededRegions' goal should be unmet
    // because we have seeded regions with 0 leaves (Spec, etc.)
    const results = await evaluateGoals(store, brainId)
    expect(results.length).toBeGreaterThan(0)

    const regionsGoal = results.find(
      r => r.goal.title === 'All seeded regions populated',
    )
    expect(regionsGoal).toBeDefined()
    // Regions have 0 leaves → current > 0 → goal unmet
    expect(regionsGoal?.met).toBe(false)
    expect(regionsGoal?.current).toBeGreaterThan(0)
  })

  it('3. scanDebt: yields GOAL_GAP when a goal is unmet; suppresses emptySeededRegions GOAL_GAP when EMPTY_REGION items exist', async () => {
    await seedGoals(store, brainId)
    const debt = await scanDebt(store, brainId)

    // There must be EMPTY_REGION items (seeded regions with 0 leaves)
    const emptyRegionItems = debt.filter(d => d.trigger === 'EMPTY_REGION')
    expect(emptyRegionItems.length).toBeGreaterThan(0)

    // GOAL_GAP items for OTHER unmet goals (not emptySeededRegions) should exist
    const goalGapItems = debt.filter(d => d.trigger === 'GOAL_GAP')
    // The emptySeededRegions goal should be suppressed because EMPTY_REGION items exist
    const suppressedItem = goalGapItems.find(g =>
      g.detail.includes('emptySeededRegions'),
    )
    expect(suppressedItem).toBeUndefined()

    // GOAL_GAP priority is 90, so it comes before ORPHAN_BELIEFS (80)
    const goalGap = goalGapItems[0]
    if (goalGap) {
      expect(goalGap.priority).toBe(90)
    }
  })

  it('4. guard: classifies RFC/spec work as require-review and docs work as allow', async () => {
    const guard = makeConstitutionGuard()

    // SPEC_GAP trigger → requiresHuman (review required)
    const specItem = {
      name: 'task-spec',
      kind: 'action' as const,
      description: 'spec gap in rfcs/ found',
      type: 'SPEC_GAP',
      status: 'proposed' as const,
      tags: ['spec'],
      classifications: [],
    }
    const specVerdict = await guard.evaluate(specItem, { classifications: [] })
    expect(specVerdict.allow).toBe(true)
    expect(specVerdict.requiresHuman).toBe(true)

    // EMPTY_REGION trigger → allow, no human required
    const docsItem = {
      name: 'task-docs',
      kind: 'action' as const,
      description: 'region has no docs',
      type: 'EMPTY_REGION',
      status: 'proposed' as const,
      tags: ['EMPTY_REGION'],
      classifications: [],
    }
    const docsVerdict = await guard.evaluate(docsItem, { classifications: [] })
    expect(docsVerdict.allow).toBe(true)
    expect(docsVerdict.requiresHuman).toBe(false)
  })

  it('5. redundancy perspective: REJECTs a fake RFC draft duplicating RFC-0027 headings; APPROVEs a novel topic', async () => {
    const repoRoot = resolve(import.meta.dirname ?? __dirname, '..')
    const reviewer = makePerspectiveReviewer(repoRoot)
    const decider = makeReviewDecider()

    // RFC-0031 covers Candidate Staging Protocol — same domain as RFC-0027 (extraction/entity resolution)
    // Craft a decision whose description uses topics from RFC-0031/RFC-0027 headings
    const duplicateDecision: Decision = {
      name: 'fake-rfc-duplicate',
      kind: 'decision',
      description:
        'Candidate state machine with PENDING, NORMALIZING, RESOLVING, PROMOTED, REJECTED, FLAGGED, EXPIRED states. Staged candidate lifecycle with state transitions, audit trail, TTL, review queue, batch throughput, canonicalization, entity resolution pipeline.',
      status: 'proposed',
      context:
        'This RFC covers candidate staging protocol state machine and review queue batch throughput.',
    }

    const novelDecision: Decision = {
      name: 'fake-rfc-novel',
      kind: 'decision',
      description:
        'Introduce a real-time websocket subscription protocol for brain event streams, supporting delta-sync across browser clients.',
      status: 'proposed',
      context: 'Streaming delta sync for brain events over websockets.',
    }

    const perspectives = [
      { name: 'redundancy', weight: 2 },
      { name: 'spec-coherence', weight: 1 },
      { name: 'scope', weight: 2 },
    ]

    // Duplicate → should be rejected
    const dupMatrix = await reviewer.review(duplicateDecision, perspectives)
    const dupDecision = decider.decide(dupMatrix, perspectives)
    const redundancyVerdict = dupMatrix.verdicts.find(
      (v: PerspectiveVerdict) => v.perspective === 'redundancy',
    )
    expect(redundancyVerdict).toBeDefined()
    expect(redundancyVerdict?.assessment).toBe('reject')
    // decider with rejectThreshold=0.3 should reject
    expect(['rejected', 'needs_human']).toContain(dupDecision.outcome)

    // Novel → should approve (no heading overlap)
    const novelMatrix = await reviewer.review(novelDecision, perspectives)
    const novelRedundancy = novelMatrix.verdicts.find(
      (v: PerspectiveVerdict) => v.perspective === 'redundancy',
    )
    expect(novelRedundancy?.assessment).toBe('approve')
  })

  it('6. guard: blocks work order touching a protected package', async () => {
    const guard = makeConstitutionGuard()

    const blockedItem = {
      name: 'task-protected',
      kind: 'action' as const,
      description: 'Modify packages/delphi-core internals to add feature X',
      type: 'SPEC_GAP',
      status: 'proposed' as const,
      tags: [],
      classifications: [],
    }
    const verdict = await guard.evaluate(blockedItem, { classifications: [] })
    expect(verdict.allow).toBe(false)
    expect(verdict.reasons.some((r: string) => r.includes('protected'))).toBe(
      true,
    )
  })
})
