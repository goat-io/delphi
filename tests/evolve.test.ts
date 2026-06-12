import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureSeededRegions } from '@goatlab/delphi-indexer'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { DebtItem } from '../scripts/evolve.js'
import { closeTask, createTaskFromDebt, scanDebt } from '../scripts/evolve.js'

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
})
