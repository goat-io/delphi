import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureSeededRegions } from '@goatlab/delphi-indexer'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { DebtItem } from '../scripts/evolve.js'
import {
  buildWorkPrompt,
  closeTask,
  createTaskFromDebt,
  scanDebt,
} from '../scripts/evolve.js'

let store: BrainStore
let brainId: string

beforeAll(async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'delphi-evolve-'))
  const db = await createDb({ dataDir: tmpDir })
  await migrate(db)
  store = new BrainStore(db)

  const brain = await store.createBrain('delphi', 'Test brain for evolve')
  brainId = brain.id

  // Seed regions: Spec, Operations, Empty Zone
  await ensureSeededRegions(store, brainId, [
    'Spec',
    'Operations',
    'Empty Zone',
  ])

  // Get region ids
  const specRegion = await store.getRegionByTitle(brainId, 'Spec')
  const specRegionId = specRegion?.id
  const opsRegion = await store.getRegionByTitle(brainId, 'Operations')
  const opsRegionId = opsRegion?.id

  // Seed at least 1 leaf into Operations so it is not empty (only "Empty Zone" should be empty)
  await store.createLeaf({
    brainId,
    kind: 'TASK',
    status: 'ACTIVE',
    title: 'Seed task for Operations',
    aliases: [],
    tags: [],
    regionId: opsRegionId,
  })

  // 2 BELIEF leaves in Spec (no evidence → orphan beliefs)
  await store.createLeaf({
    brainId,
    kind: 'BELIEF',
    status: 'ACTIVE',
    title: 'Belief One',
    aliases: [],
    tags: [],
    regionId: specRegionId,
  })

  await store.createLeaf({
    brainId,
    kind: 'BELIEF',
    status: 'ACTIVE',
    title: 'Belief Two',
    aliases: [],
    tags: [],
    regionId: specRegionId,
  })

  // 1 ACTIVE QUESTION in Spec
  await store.createLeaf({
    brainId,
    kind: 'QUESTION',
    status: 'ACTIVE',
    title: 'What is the meaning of Delphi?',
    aliases: [],
    tags: [],
    regionId: specRegionId,
  })
}, 30_000)

afterAll(async () => {
  await store.db.close()
})

describe('evolve harness', () => {
  it('1. scanDebt: EMPTY_REGION first (priority 100), includes ORPHAN_BELIEFS, includes OPEN_QUESTION', async () => {
    const debt = await scanDebt(store, brainId)

    expect(debt.length).toBeGreaterThan(0)

    // First item must be EMPTY_REGION for "Empty Zone"
    const first = debt[0] as DebtItem
    expect(first.trigger).toBe('EMPTY_REGION')
    expect(first.targetTitle).toBe('Empty Zone')
    expect(first.priority).toBe(100)

    // Must include ORPHAN_BELIEFS
    const orphan = debt.find(d => d.trigger === 'ORPHAN_BELIEFS')
    expect(orphan).toBeDefined()
    expect(orphan?.priority).toBe(80)

    // Must include OPEN_QUESTION
    const question = debt.find(d => d.trigger === 'OPEN_QUESTION')
    expect(question).toBeDefined()
    expect(question?.priority).toBe(20)

    // Sorted descending by priority
    for (let i = 1; i < debt.length; i++) {
      expect((debt[i - 1] as DebtItem).priority).toBeGreaterThanOrEqual(
        (debt[i] as DebtItem).priority,
      )
    }
  })

  let createdTaskId: string

  it('2. createTaskFromDebt: creates TASK leaf; duplicate call returns same id', async () => {
    const debt = await scanDebt(store, brainId)
    const top = debt[0] as DebtItem
    expect(top.trigger).toBe('EMPTY_REGION')

    const task = await createTaskFromDebt(store, brainId, top)

    expect(task.kind).toBe('TASK')
    expect(task.status).toBe('ACTIVE')
    expect(task.content).toBeDefined()
    expect((task.content as Record<string, unknown>).trigger).toBe(
      'EMPTY_REGION',
    )

    const closureCriteria = (task.content as Record<string, unknown>)
      .closureCriteria
    expect(typeof closureCriteria).toBe('string')
    expect((closureCriteria as string).length).toBeGreaterThan(0)

    createdTaskId = task.id

    // Duplicate call → same leaf id (dedupe)
    const task2 = await createTaskFromDebt(store, brainId, top)
    expect(task2.id).toBe(createdTaskId)
  })

  it('3. closeTask: task ARCHIVED, content.evidence set; DECISION created; DERIVED_FROM relationship exists', async () => {
    const { task, decision } = await closeTask(
      store,
      brainId,
      createdTaskId,
      'commit abc123',
    )

    // Task is archived
    expect(task.status).toBe('ARCHIVED')
    expect((task.content as Record<string, unknown>).evidence).toBe(
      'commit abc123',
    )
    expect((task.content as Record<string, unknown>).closedAt).toBeDefined()

    // Decision leaf created
    expect(decision.kind).toBe('DECISION')
    expect(decision.status).toBe('ACTIVE')
    expect(decision.title).toContain('Resolved:')
    expect((decision.content as Record<string, unknown>).taskId).toBe(
      createdTaskId,
    )

    // DERIVED_FROM relationship: decision → task
    const rels = await store.listRelationshipsForLeaf(decision.id)
    const derived = rels.find(
      r =>
        r.type === 'DERIVED_FROM' &&
        r.sourceLeafId === decision.id &&
        r.targetLeafId === task.id,
    )
    expect(derived).toBeDefined()
  })

  it('4. After close, scanDebt + createTaskFromDebt for EMPTY_REGION creates NEW task (old ARCHIVED no longer dedupes)', async () => {
    const debt = await scanDebt(store, brainId)
    const emptyRegionItem = debt.find(d => d.trigger === 'EMPTY_REGION')
    expect(emptyRegionItem).toBeDefined()

    const newTask = await createTaskFromDebt(
      store,
      brainId,
      emptyRegionItem as DebtItem,
    )

    // Must be a new task
    expect(newTask.id).not.toBe(createdTaskId)
    expect(newTask.kind).toBe('TASK')
    expect(newTask.status).toBe('ACTIVE')
  })

  it('5. noise filter: noisy QUESTION leaves excluded, real question included in OPEN_QUESTION debt', async () => {
    const specRegion = await store.getRegionByTitle(brainId, 'Spec')
    const specRegionId = specRegion?.id

    // Noise: starts with "-", short, < 4 words
    await store.createLeaf({
      brainId,
      kind: 'QUESTION',
      status: 'ACTIVE',
      title: '- What supports it?',
      aliases: [],
      tags: [],
      regionId: specRegionId,
    })

    // Real question: ends with "?", >25 chars, ≥4 words, no noise prefix
    await store.createLeaf({
      brainId,
      kind: 'QUESTION',
      status: 'ACTIVE',
      title:
        'How does confidence propagate across federated brains in practice?',
      aliases: [],
      tags: [],
      regionId: specRegionId,
    })

    const debt = await scanDebt(store, brainId)
    const openQuestionItems = debt.filter(d => d.trigger === 'OPEN_QUESTION')

    const titles = openQuestionItems.map(d => d.targetTitle)
    expect(titles).toContain(
      'How does confidence propagate across federated brains in practice?',
    )
    expect(titles).not.toContain('- What supports it?')
  })

  it('6. SPEC_GAP: BELIEF with "Candidate for a future RFC" statement surfaces as SPEC_GAP item (priority 30)', async () => {
    const specRegion = await store.getRegionByTitle(brainId, 'Spec')
    const specRegionId = specRegion?.id

    await store.createLeaf({
      brainId,
      kind: 'BELIEF',
      status: 'ACTIVE',
      title: 'Markdown import/export bridge',
      statement: 'A markdown import/export bridge. Candidate for a future RFC.',
      aliases: [],
      tags: [],
      regionId: specRegionId,
    })

    const debt = await scanDebt(store, brainId)
    const specGapItem = debt.find(d => d.trigger === 'SPEC_GAP')

    expect(specGapItem).toBeDefined()
    expect(specGapItem?.priority).toBe(30)
    expect(specGapItem?.target).toBeTruthy()
  })

  it('6b. SPEC_GAP precision: "future work" phrase does NOT trigger SPEC_GAP; "--- something" title is skipped', async () => {
    const specRegion = await store.getRegionByTitle(brainId, 'Spec')
    const specRegionId = specRegion?.id

    // Leaf that would previously be a false positive (generic "future work" phrase)
    await store.createLeaf({
      brainId,
      kind: 'BELIEF',
      status: 'ACTIVE',
      title: 'A Task is a unit of future work',
      statement: 'A Task is a unit of future work — core domain concept.',
      aliases: [],
      tags: [],
      regionId: specRegionId,
    })

    // Leaf with frontmatter-noise title ("--- something") and the exact phrase
    await store.createLeaf({
      brainId,
      kind: 'BELIEF',
      status: 'ACTIVE',
      title: '--- frontmatter noise leaf',
      statement: 'Candidate for a future RFC but title is noisy frontmatter.',
      aliases: [],
      tags: [],
      regionId: specRegionId,
    })

    const debt = await scanDebt(store, brainId)

    // The "--- something" titled leaf must NOT appear in SPEC_GAP items
    const specGapItems = debt.filter(d => d.trigger === 'SPEC_GAP')
    const noisyItem = specGapItems.find(d => d.targetTitle.startsWith('---'))
    expect(noisyItem).toBeUndefined()
  })

  it('6c. SPEC_GAP regression: source leaf with specGapResolved=true is NOT emitted as a SPEC_GAP debt item', async () => {
    const specRegion = await store.getRegionByTitle(brainId, 'Spec')
    const specRegionId = specRegion?.id

    // A leaf that would normally trigger SPEC_GAP but has been neutralised by a prior
    // arbiter/perspective rejection (content.specGapResolved = true).
    await store.createLeaf({
      brainId,
      kind: 'BELIEF',
      status: 'ACTIVE',
      title: 'Already-covered spec gap candidate',
      statement:
        'Candidate for a future RFC — but the arbiter already ruled this is covered by RFC-0027.',
      aliases: [],
      tags: [],
      regionId: specRegionId,
      content: {
        specGapResolved: true,
        specGapResolvedReason:
          'Arbiter escalation rejected: already covered by RFC-0027 and RFC-0031',
      },
    })

    const debt = await scanDebt(store, brainId)
    const specGapItems = debt.filter(d => d.trigger === 'SPEC_GAP')

    // The neutralised leaf must NOT appear in SPEC_GAP items
    const neutralised = specGapItems.find(d =>
      d.targetTitle.includes('Already-covered spec gap candidate'),
    )
    expect(neutralised).toBeUndefined()
  })

  it('7a. QUEUED_TASK: ACTIVE TASK with trigger HUMAN_REQUEST and closureCriteria (no dispatchedAt) surfaces in scanDebt with its priority', async () => {
    const opsRegion = await store.getRegionByTitle(brainId, 'Operations')
    const opsRegionId = opsRegion?.id

    const queuedTask = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: 'Rubric-back the test threshold values',
      statement: 'Move thresholds from source constants into a RUBRIC leaf.',
      aliases: [],
      tags: ['rubric-unification'],
      regionId: opsRegionId,
      content: {
        trigger: 'HUMAN_REQUEST',
        priority: 95,
        closureCriteria:
          'the named gate reads from a RUBRIC leaf and persists EVALUATION leaves',
      },
    })

    const debt = await scanDebt(store, brainId)
    const queuedItems = debt.filter(d => d.trigger === 'QUEUED_TASK')

    // Must include our task
    const found = queuedItems.find(d => d.target === queuedTask.id)
    expect(found).toBeDefined()
    expect(found?.priority).toBe(95)
    expect(found?.targetTitle).toBe('Rubric-back the test threshold values')

    // Clean up: mark dispatched so other tests don't pick it up
    await store.updateLeaf(queuedTask.id, {
      content: {
        trigger: 'HUMAN_REQUEST',
        priority: 95,
        closureCriteria:
          'the named gate reads from a RUBRIC leaf and persists EVALUATION leaves',
        dispatchedAt: new Date().toISOString(),
      },
    })
  })

  it('7b. QUEUED_TASK: createTaskFromDebt stamps dispatchedAt on the existing leaf, preventing re-pick on second scan', async () => {
    const opsRegion = await store.getRegionByTitle(brainId, 'Operations')
    const opsRegionId = opsRegion?.id

    const queuedTask2 = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: 'Rubric-back the dispatch test leaf',
      statement: 'A task to test dispatchedAt stamping.',
      aliases: [],
      tags: ['rubric-unification'],
      regionId: opsRegionId,
      content: {
        trigger: 'HUMAN_REQUEST',
        priority: 95,
        closureCriteria: 'implementation done and tests pass',
      },
    })

    const debtBefore = await scanDebt(store, brainId)
    const itemBefore = debtBefore.find(
      d => d.trigger === 'QUEUED_TASK' && d.target === queuedTask2.id,
    )
    expect(itemBefore).toBeDefined()

    // Dispatch it
    await createTaskFromDebt(store, brainId, itemBefore as DebtItem)

    // Re-scan — should NOT appear again (dispatchedAt set)
    const debtAfter = await scanDebt(store, brainId)
    const itemAfter = debtAfter.find(
      d => d.trigger === 'QUEUED_TASK' && d.target === queuedTask2.id,
    )
    expect(itemAfter).toBeUndefined()
  })

  it('7c. buildWorkPrompt QUEUED_TASK: contains closureCriteria, WORK COMPLETE rule, and no-migrated-packages rule', async () => {
    const queuedItem: DebtItem = {
      trigger: 'QUEUED_TASK',
      target: 'leaf_queued_test_001',
      targetTitle: 'Rubric-back resolution thresholds',
      detail:
        'Extraction merge/link/flag thresholds move from constants in resolve.ts to a versioned RUBRIC leaf.',
      priority: 95,
    }

    const fakeQueuedTask = {
      id: 'leaf_queued_test_001',
      kind: 'TASK' as const,
      status: 'ACTIVE' as const,
      title: 'Rubric-back resolution thresholds',
      statement:
        'Extraction merge/link/flag thresholds move from constants in resolve.ts to a versioned RUBRIC leaf.',
      brainId,
      aliases: [],
      tags: ['rubric-unification'],
      version: 1,
      content: {
        trigger: 'HUMAN_REQUEST',
        priority: 95,
        closureCriteria:
          'the named gate reads from a RUBRIC leaf and persists EVALUATION leaves',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const prompt = buildWorkPrompt(
      queuedItem,
      fakeQueuedTask as Parameters<typeof buildWorkPrompt>[1],
    )

    // Must contain closureCriteria verbatim
    expect(prompt).toContain(
      'the named gate reads from a RUBRIC leaf and persists EVALUATION leaves',
    )
    // Must contain WORK COMPLETE instruction
    expect(prompt).toContain('WORK COMPLETE')
    // Must contain no-migrated-packages rule
    expect(prompt).toContain('Never touch packages/delphi-')
    // Must reference getRubricByTitle or seedRubrics (rubric usage guidance)
    expect(prompt).toContain('getRubricByTitle')
    // Must reference persistEvaluation
    expect(prompt).toContain('persistEvaluation')
  })

  it('8. QUEUED_TASK stale-dispatch reclaim: old dispatchedAt + ACTIVE → resurfaces; recent dispatchedAt → does not', async () => {
    const opsRegion = await store.getRegionByTitle(brainId, 'Operations')
    const opsRegionId = opsRegion?.id

    // Task with STALE dispatchedAt (2 hours ago) and no closing DECISION → must resurface
    const oldDispatchedAt = new Date(
      Date.now() - 2 * 60 * 60 * 1000,
    ).toISOString()
    const staleTask = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: 'Stale-dispatched task that lost its cycle',
      statement: 'This task was dispatched but the cycle OOMed.',
      aliases: [],
      tags: [],
      regionId: opsRegionId,
      content: {
        trigger: 'HUMAN_REQUEST',
        priority: 70,
        closureCriteria: 'implementation done and tests pass',
        dispatchedAt: oldDispatchedAt,
      },
    })

    // Task with RECENT dispatchedAt (5 seconds ago) → must NOT resurface
    const recentDispatchedAt = new Date(Date.now() - 5000).toISOString()
    const freshTask = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: 'Recently-dispatched task still in flight',
      statement: 'This task was dispatched moments ago.',
      aliases: [],
      tags: [],
      regionId: opsRegionId,
      content: {
        trigger: 'HUMAN_REQUEST',
        priority: 70,
        closureCriteria: 'implementation done and tests pass',
        dispatchedAt: recentDispatchedAt,
      },
    })

    const debt = await scanDebt(store, brainId)
    const queuedItems = debt.filter(d => d.trigger === 'QUEUED_TASK')
    const ids = queuedItems.map(d => d.target)

    // Stale task must resurface
    expect(ids).toContain(staleTask.id)
    // Recent task must NOT resurface
    expect(ids).not.toContain(freshTask.id)
  })

  it('9. GOAL_GAP reconciliation: a met-goal GOAL_GAP task is archived by scanDebt, not re-dispatched', async () => {
    const opsRegion = await store.getRegionByTitle(brainId, 'Operations')
    const opsRegionId = opsRegion?.id

    // Create an OBJECT leaf tagged 'goal' with a metric that is trivially met
    // (openQuestions <= 999 — the test brain has far fewer than 999 questions).
    const goalLeaf = await store.createLeaf({
      brainId,
      kind: 'OBJECT',
      status: 'ACTIVE',
      title: 'Reconciliation test goal: open questions trivially low',
      aliases: [],
      tags: ['goal'],
      regionId: opsRegionId,
      content: { metric: 'openQuestions', target: 999, comparator: '<=' },
    })

    // Create a GOAL_GAP task pointing at this (already-met) goal
    const staleGoalGapTask = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title:
        '[GOAL_GAP] Reconciliation test goal: open questions trivially low',
      aliases: [],
      tags: [],
      regionId: opsRegionId,
      content: {
        trigger: 'GOAL_GAP',
        target: goalLeaf.id,
        priority: 90,
        origin: 'evolve-harness',
        closureCriteria: 'goal metric meets target on re-evaluation',
      },
    })

    // scanDebt must retire the stale task and must NOT emit a new GOAL_GAP item for it
    const debt = await scanDebt(store, brainId)

    // Task must now be ARCHIVED
    const refreshed = await store.getLeaf(staleGoalGapTask.id)
    expect(refreshed?.status).toBe('ARCHIVED')
    expect((refreshed?.content as Record<string, unknown>).evidence).toBe(
      'goal-met-auto-reconcile',
    )
    expect(
      (refreshed?.content as Record<string, unknown>).closedAt,
    ).toBeDefined()

    // scanDebt must NOT surface a new GOAL_GAP item for this already-met goal
    const goalGapItems = debt.filter(d => d.trigger === 'GOAL_GAP')
    const reDispatched = goalGapItems.find(d => d.target === goalLeaf.id)
    expect(reDispatched).toBeUndefined()
  })

  it('10. Introspection reconciliation: auto-detected task whose anomaly is gone is archived by scanDebt', async () => {
    const opsRegion = await store.getRegionByTitle(brainId, 'Operations')
    const opsRegionId = opsRegion?.id

    // Create a fake auto-detected introspection task pointing at a non-existent anomaly.
    // In a fresh test brain with no evolution.log.md anomalies, this signature will
    // never appear in scanLoopAnomalies → task should be retired automatically.
    const staleIntrospTask = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: '[loop-defect] UNVERIFIED_CLOSURE: unverified:leaf_nonexistent',
      statement: 'Anomaly that no longer reproduces.',
      aliases: [],
      tags: ['loop-defect', 'auto-detected'],
      regionId: opsRegionId,
      content: {
        trigger: 'HUMAN_REQUEST',
        queued: true,
        target: 'unverified:leaf_nonexistent_stale_test',
        priority: 45,
        origin: 'introspection',
        anomalyKind: 'UNVERIFIED_CLOSURE',
        evidence: 'brain:leaf:leaf_nonexistent_stale_test',
        closureCriteria:
          'anomaly class no longer reproduced in a subsequent run + regression coverage',
      },
    })

    await scanDebt(store, brainId)

    // Task must now be ARCHIVED
    const refreshed = await store.getLeaf(staleIntrospTask.id)
    expect(refreshed?.status).toBe('ARCHIVED')
    expect((refreshed?.content as Record<string, unknown>).evidence).toBe(
      'anomaly-no-longer-reproduces',
    )
    expect(
      (refreshed?.content as Record<string, unknown>).closedAt,
    ).toBeDefined()
  })

  it('7. buildWorkPrompt: EMPTY_REGION contains closure criteria and WORK COMPLETE rule; SPEC_GAP contains RFC-9999', async () => {
    const emptyItem: DebtItem = {
      trigger: 'EMPTY_REGION',
      target: 'region-test-id',
      targetTitle: 'Test Region',
      detail: "seeded region 'Test Region' has no knowledge — navigation debt",
      priority: 100,
    }

    const fakeTask = {
      id: 'task-test-001',
      kind: 'TASK' as const,
      status: 'ACTIVE' as const,
      title: '[EMPTY_REGION] Test Region',
      brainId,
      aliases: [],
      tags: [],
      version: 1,
      content: {
        trigger: 'EMPTY_REGION',
        target: 'region-test-id',
        priority: 100,
        origin: 'evolve-harness',
        closureCriteria: 'region has ≥5 leaves and an index after re-bootstrap',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const promptEmpty = buildWorkPrompt(
      emptyItem,
      fakeTask as Parameters<typeof buildWorkPrompt>[1],
    )
    expect(promptEmpty).toContain('region has ≥5 leaves')
    expect(promptEmpty).toContain('WORK COMPLETE')
    expect(promptEmpty).toContain('Do NOT git commit')

    const specGapItem: DebtItem = {
      trigger: 'SPEC_GAP',
      target: 'leaf-spec-gap-001',
      targetTitle: 'Markdown import/export bridge',
      detail:
        'spec gap: "A markdown import/export bridge is future work, recorded here."',
      priority: 30,
    }

    const specGapTask = {
      ...fakeTask,
      id: 'task-spec-gap-001',
      title: '[SPEC_GAP] Markdown import/export bridge',
      content: {
        trigger: 'SPEC_GAP',
        target: 'leaf-spec-gap-001',
        priority: 30,
        origin: 'evolve-harness',
        closureCriteria:
          'a new RFC draft exists in rfcs/ addressing the gap and RFC-9999 references it',
      },
    }

    const promptSpecGap = buildWorkPrompt(
      specGapItem,
      specGapTask as Parameters<typeof buildWorkPrompt>[1],
    )
    expect(promptSpecGap).toContain('RFC-9999')
    // False-positive escape hatch must be present
    expect(promptSpecGap).toContain('FIRST check whether rfcs/')
    expect(promptSpecGap).toContain('coverage.md')
  })
})
