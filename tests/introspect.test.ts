import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureSeededRegions } from '@goatlab/delphi-indexer'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { evaluateGoals, seedGoals } from '../scripts/goals.js'
import { emitDefectTasks, scanLoopAnomalies } from '../scripts/introspect.js'

let store: BrainStore
let brainId: string

beforeAll(async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'delphi-introspect-'))
  const db = await createDb({ dataDir: tmpDir })
  await migrate(db)
  store = new BrainStore(db)

  const brain = await store.createBrain(
    'delphi-introspect',
    'Test brain for introspect',
  )
  brainId = brain.id

  // Seed basic regions so ensureSeededRegions calls in emitDefectTasks work
  await ensureSeededRegions(store, brainId, ['Operations'])
}, 30_000)

afterAll(async () => {
  await store.db.close()
})

describe('introspect harness', () => {
  it('1. DISPUTED task → anomaly + defect task emitted; re-run → deduped', async () => {
    const disputedTask = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'DISPUTED',
      title: 'Integrate payment gateway',
      aliases: [],
      tags: [],
      content: { blocked: 'test block reason' },
    })

    const anomalies = await scanLoopAnomalies(store, brainId)
    const match = anomalies.find(
      a =>
        a.kind === 'DISPUTED_TASK' &&
        a.signature === `disputed:${disputedTask.id}`,
    )
    expect(match).toBeDefined()
    expect(match?.signature).toBe(`disputed:${disputedTask.id}`)

    // First emission
    const result1 = await emitDefectTasks(store, brainId, anomalies)
    expect(result1.created).toBeGreaterThanOrEqual(1)
    const initialCreated = result1.created

    // Second emission — exact-match dedupe kicks in
    const result2 = await emitDefectTasks(store, brainId, anomalies)
    // All previously created defect tasks should now be deduped
    expect(result2.created).toBe(0)
    expect(result2.deduped).toBeGreaterThanOrEqual(initialCreated)
  })

  it('2. needs_human EVALUATION without follow-up DECISION → anomaly; with DECISION → no anomaly', async () => {
    const evalLeaf = await store.createLeaf({
      brainId,
      kind: 'EVALUATION',
      status: 'ACTIVE',
      title: 'Spec coherence evaluation for target_leaf_x',
      aliases: [],
      tags: [],
      content: {
        verdict: 'needs_human',
        targetLeafId: 'target_leaf_x',
        perspective: 'spec-coherence',
      },
    })

    // Without a DECISION → anomaly present
    const anomaliesBefore = await scanLoopAnomalies(store, brainId)
    const matchBefore = anomaliesBefore.find(
      a =>
        a.kind === 'NEEDS_HUMAN_UNRESOLVED' &&
        a.signature === `needs-human:target_leaf_x:spec-coherence`,
    )
    expect(matchBefore).toBeDefined()

    // Add a DECISION leaf resolving the target
    await store.createLeaf({
      brainId,
      kind: 'DECISION',
      status: 'ACTIVE',
      title: 'Decision resolving target_leaf_x',
      aliases: [],
      tags: [],
      content: { taskId: 'target_leaf_x' },
    })

    // With DECISION present → anomaly should be gone
    const anomaliesAfter = await scanLoopAnomalies(store, brainId)
    const matchAfter = anomaliesAfter.find(
      a =>
        a.kind === 'NEEDS_HUMAN_UNRESOLVED' &&
        a.signature === `needs-human:target_leaf_x:spec-coherence`,
    )
    expect(matchAfter).toBeUndefined()

    // Clean up to avoid interference with other tests
    await store.updateLeaf(evalLeaf.id, { status: 'ARCHIVED' })
  })

  it('3. Log parsing: RED gate → ROLLBACK; no-work marker → EMPTY_CYCLE', async () => {
    // Cycle 1: SKIPPED gate only (no no-work summary) → 1 EMPTY_CYCLE
    // Cycle 2: RED gate only → 1 ROLLBACK
    // Total log-sourced: exactly 2
    const fixtureLog = `# Evolution Log

## Cycle 1 — 2026-01-01T10:00:00.000Z

| Field | Value |
|-------|-------|
| Task | leaf_abc123 — [EMPTY_REGION] Some Region |
| Trigger | EMPTY_REGION |
| Agent summary | Agent ran but skipped all work. |
| Gate | SKIPPED |
| Commit | n/a |
| Closure | SKIPPED |

## Cycle 2 — 2026-01-01T11:00:00.000Z

| Field | Value |
|-------|-------|
| Task | leaf_def456 — [SPEC_GAP] Some Gap |
| Trigger | SPEC_GAP |
| Agent summary | Tried to draft RFC but could not proceed. |
| Gate | RED |
| Commit | n/a |
| Closure | OPEN |
`

    const tmpDir = await mkdtemp(join(tmpdir(), 'delphi-log-fixture-'))
    const tmpLogPath = join(tmpDir, 'evolution.log.md')
    await writeFile(tmpLogPath, fixtureLog, 'utf-8')

    const anomalies = await scanLoopAnomalies(store, brainId, {
      logPath: tmpLogPath,
    })

    // Filter to only log-sourced anomalies for this test
    const logAnomalies = anomalies.filter(a =>
      a.evidence.startsWith('evolution.log.md'),
    )

    // Expect at least one ROLLBACK (RED gate) and one EMPTY_CYCLE (SKIPPED gate)
    const rollback = logAnomalies.find(a => a.kind === 'ROLLBACK')
    const emptyCycle = logAnomalies.find(a => a.kind === 'EMPTY_CYCLE')

    expect(rollback).toBeDefined()
    expect(emptyCycle).toBeDefined()

    // Exactly 2: cycle 1 SKIPPED → EMPTY_CYCLE (sig: log:ts1:GATE_RED); cycle 2 RED → ROLLBACK (sig: log:ts2:GATE_RED)
    expect(logAnomalies.length).toBe(2)
  })

  it('4. Cap test: seeding >5 anomalies emits at most 5 ACTIVE auto-detected tasks', async () => {
    // Create a fresh brain to avoid interference from test 1's auto-detected tasks
    const tmpDir2 = await mkdtemp(join(tmpdir(), 'delphi-cap-'))
    const db2 = await createDb({ dataDir: tmpDir2 })
    await migrate(db2)
    const store2 = new BrainStore(db2)
    const brain2 = await store2.createBrain('delphi-cap', 'Cap test brain')
    const brainId2 = brain2.id
    await ensureSeededRegions(store2, brainId2, ['Operations'])

    // Create 6 distinct DISPUTED TASK leaves
    for (let i = 0; i < 6; i++) {
      await store2.createLeaf({
        brainId: brainId2,
        kind: 'TASK',
        status: 'DISPUTED',
        title: `Cap test disputed task ${i}`,
        aliases: [],
        tags: [],
        content: { blocked: `block reason ${i}` },
      })
    }

    const anomalies = await scanLoopAnomalies(store2, brainId2)
    expect(anomalies.length).toBeGreaterThanOrEqual(6)

    const result = await emitDefectTasks(store2, brainId2, anomalies)
    expect(result.created).toBeLessThanOrEqual(5)

    await store2.db.close()
  })

  it('5. No circular loopAnomalies goal — anomaly count is a health metric, not a competing goal', async () => {
    // The "No unattended loop anomalies" goal was removed: it was circular
    // (satisfied only by closing maintenance tasks that ranked below it, so it
    // got picked repeatedly while its own resolution never ran). seedGoals must
    // NOT emit it, while introspection still DETECTS anomalies (see tests 1-4).
    const tmpDir3 = await mkdtemp(join(tmpdir(), 'delphi-goals-'))
    const db3 = await createDb({ dataDir: tmpDir3 })
    await migrate(db3)
    const store3 = new BrainStore(db3)
    const brain3 = await store3.createBrain('delphi-goals', 'Goals test brain')
    const brainId3 = brain3.id

    await seedGoals(store3, brainId3)
    const results = await evaluateGoals(store3, brainId3)

    const loopGoal = results.find(r => {
      const c = r.goal.content as { metric?: string } | undefined
      return c?.metric === 'loopAnomalies'
    })
    expect(loopGoal).toBeUndefined()
    // Forward goals remain
    expect(
      results.some(r => r.goal.title === 'Open questions triaged below 150'),
    ).toBe(true)

    await store3.db.close()
  })
})
