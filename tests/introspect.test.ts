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

  it('3. Log parsing: single RED or SKIPPED cycle → no anomaly; two RED cycles same taskId → exactly one GATE_RED_TWICE', async () => {
    // Single-occurrence anomalies (ROLLBACK, EMPTY_CYCLE, DISPUTED_TASK per cycle) are no
    // longer emitted — their unique-timestamp signatures never deduped and fed a churn loop.
    // The ONLY log signal is GATE_RED_TWICE: taskId-keyed, deduped, genuine "stuck" indicator.
    //
    // Cycle 1: SKIPPED gate → NO anomaly (single occurrence)
    // Cycle 2: RED gate for leaf_def456 → NO anomaly alone (single occurrence)
    // Cycle 3: RED gate again for leaf_def456 → triggers GATE_RED_TWICE for leaf_def456
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

## Cycle 3 — 2026-01-01T12:00:00.000Z

| Field | Value |
|-------|-------|
| Task | leaf_def456 — [SPEC_GAP] Some Gap |
| Trigger | SPEC_GAP |
| Agent summary | Tried again, still failing. |
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

    // The SKIPPED cycle and the first RED cycle must produce NO anomaly (single occurrences)
    const rollback = logAnomalies.find(a => a.kind === 'ROLLBACK')
    const emptyCycle = logAnomalies.find(a => a.kind === 'EMPTY_CYCLE')
    expect(rollback).toBeUndefined()
    expect(emptyCycle).toBeUndefined()

    // Two RED cycles for the same taskId → exactly one GATE_RED_TWICE
    const gateRedTwice = logAnomalies.find(
      a =>
        a.kind === 'GATE_RED_TWICE' &&
        a.signature === 'log:leaf_def456:GATE_RED_TWICE',
    )
    expect(gateRedTwice).toBeDefined()

    // No other log-sourced anomalies
    expect(logAnomalies.length).toBe(1)
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

  it('6. UNVERIFIED_CLOSURE: task with unverified=true → anomaly detected + defect task emitted; re-run → deduped', async () => {
    const unverifiedTask = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: '[SPEC_GAP] Candidate primitive coverage',
      aliases: [],
      tags: [],
      content: { unverified: true },
    })

    const anomalies = await scanLoopAnomalies(store, brainId)
    const match = anomalies.find(
      a =>
        a.kind === 'UNVERIFIED_CLOSURE' &&
        a.signature === `unverified:${unverifiedTask.id}`,
    )
    expect(match).toBeDefined()
    expect(match?.evidence).toBe(`brain:leaf:${unverifiedTask.id}`)

    // First emission
    const emit1 = await emitDefectTasks(store, brainId, anomalies)
    expect(emit1.created).toBeGreaterThanOrEqual(1)

    // Second emission — exact-match dedup (content.target === anomaly.signature)
    const anomalies2 = await scanLoopAnomalies(store, brainId)
    const emit2 = await emitDefectTasks(store, brainId, anomalies2)
    expect(emit2.created).toBe(0)
    expect(emit2.deduped).toBeGreaterThanOrEqual(1)

    // Clean up
    await store.updateLeaf(unverifiedTask.id, {
      status: 'ARCHIVED',
      content: {},
    })
  })

  it('6b. UNVERIFIED_CLOSURE regression: auto-detected tasks with unverified=true do NOT recurse', async () => {
    const autoDetectedUnverified = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: '[loop-defect] UNVERIFIED_CLOSURE: some prior defect',
      aliases: [],
      tags: ['auto-detected', 'loop-defect'],
      content: { unverified: true },
    })

    const anomalies = await scanLoopAnomalies(store, brainId)
    const selfRef = anomalies.find(
      a =>
        a.kind === 'UNVERIFIED_CLOSURE' &&
        a.signature === `unverified:${autoDetectedUnverified.id}`,
    )
    // auto-detected tasks must NOT appear as UNVERIFIED_CLOSURE sources
    expect(selfRef).toBeUndefined()

    await store.updateLeaf(autoDetectedUnverified.id, { status: 'ARCHIVED' })
  })

  it('7. arbiter EVALUATION resolves NEEDS_HUMAN_UNRESOLVED without a DECISION leaf', async () => {
    // Regression: when arbiter handles a needs_human verdict it persists an EVALUATION
    // with perspective='arbiter'. The anomaly scanner must recognise this as resolution
    // evidence — no separate DECISION leaf should be required.

    const arbiterTarget = 'arbiter_resolution_target_leaf'

    // Create the needs_human EVALUATION (what triggered the anomaly)
    const evalLeaf = await store.createLeaf({
      brainId,
      kind: 'EVALUATION',
      status: 'ACTIVE',
      title: 'spec-coherence evaluation for arbiter_resolution_target_leaf',
      aliases: [],
      tags: ['evaluation', 'governance', 'spec-coherence'],
      content: {
        verdict: 'needs_human',
        targetLeafId: arbiterTarget,
        perspective: 'spec-coherence',
        finalScore: 0.5,
      },
    })

    // Without arbiter → anomaly must be present
    const anomaliesBefore = await scanLoopAnomalies(store, brainId)
    const matchBefore = anomaliesBefore.find(
      a =>
        a.kind === 'NEEDS_HUMAN_UNRESOLVED' &&
        a.signature === `needs-human:${arbiterTarget}:spec-coherence`,
    )
    expect(matchBefore).toBeDefined()

    // Arbiter approves — persists EVALUATION (perspective='arbiter') not a DECISION
    const arbiterEval = await store.createLeaf({
      brainId,
      kind: 'EVALUATION',
      status: 'ACTIVE',
      title: 'Evaluation: arbiter on arbiter_resolution_target_leaf',
      aliases: [],
      tags: ['evaluation', 'governance', 'arbiter'],
      content: {
        verdict: 'approve',
        targetLeafId: arbiterTarget,
        perspective: 'arbiter',
        finalScore: 1,
      },
    })

    // With arbiter EVALUATION present → anomaly must be gone
    const anomaliesAfter = await scanLoopAnomalies(store, brainId)
    const matchAfter = anomaliesAfter.find(
      a =>
        a.kind === 'NEEDS_HUMAN_UNRESOLVED' &&
        a.signature === `needs-human:${arbiterTarget}:spec-coherence`,
    )
    expect(matchAfter).toBeUndefined()

    // Clean up
    await store.updateLeaf(evalLeaf.id, { status: 'ARCHIVED' })
    await store.updateLeaf(arbiterEval.id, { status: 'ARCHIVED' })
  })

  it('8. DISPUTED task with terminalReject=true → NOT in scanLoopAnomalies output', async () => {
    // A dispute caused by a correct arbiter/review REJECT is terminal.
    // Re-attempting cannot help, so introspect must skip it entirely.
    const terminalTask = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'DISPUTED',
      title: 'Terminal rejected RFC',
      aliases: [],
      tags: [],
      content: {
        blocked: 'Perspective review rejected: redundancy score 0.15',
        terminalReject: true,
      },
    })

    const anomalies = await scanLoopAnomalies(store, brainId)
    const found = anomalies.find(
      a => a.signature === `disputed:${terminalTask.id}`,
    )
    expect(found).toBeUndefined()

    // Clean up
    await store.updateLeaf(terminalTask.id, { status: 'ARCHIVED' })
  })

  it('9. DISPUTED task WITHOUT terminalReject (infra failure) → still detected as DISPUTED_TASK anomaly', async () => {
    // An infra-failure dispute ("gate red after fix attempt") is fixable —
    // the maintenance loop should see it and re-attempt.
    const infraTask = await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'DISPUTED',
      title: 'Gate failure task',
      aliases: [],
      tags: [],
      content: { blocked: 'gate red after fix attempt' },
    })

    const anomalies = await scanLoopAnomalies(store, brainId)
    const found = anomalies.find(
      a => a.signature === `disputed:${infraTask.id}`,
    )
    expect(found).toBeDefined()
    expect(found?.kind).toBe('DISPUTED_TASK')

    // Clean up
    await store.updateLeaf(infraTask.id, { status: 'ARCHIVED' })
  })

  it('10. Log: terminal-reject cycle → skipped entirely; single RED cycle → no anomaly; two RED cycles same taskId → GATE_RED_TWICE', async () => {
    // Terminal-reject cycles are still skipped (correct refusals must not pollute anomalies).
    // Single-occurrence RED cycles no longer emit ROLLBACK (churn fix).
    // Two RED cycles for the same non-terminal taskId → exactly one GATE_RED_TWICE.
    //
    // Cycle A: DISPUTED + terminal-reject → skipped by terminal-reject guard (no anomaly)
    // Cycle B: single RED for leaf_infra002 → no anomaly alone
    // Cycle C: second RED for leaf_infra002 → GATE_RED_TWICE for leaf_infra002
    const fixtureLog = `# Evolution Log

## Cycle 10 — 2026-02-01T10:00:00.000Z

| Field | Value |
|-------|-------|
| Task | leaf_terminal001 — [SPEC_GAP] Some RFC |
| Trigger | SPEC_GAP |
| Agent summary | Drafted RFC but arbiter rejected it. |
| Gate | DISPUTED |
| Commit | n/a |
| Closure | DISPUTED |
| Dispute | terminal-reject |

## Cycle 11 — 2026-02-01T11:00:00.000Z

| Field | Value |
|-------|-------|
| Task | leaf_infra002 — [QUEUED_TASK] Fix types |
| Trigger | QUEUED_TASK |
| Agent summary | Applied fix but typecheck failed. |
| Gate | RED |
| Commit | n/a |
| Closure | OPEN |

## Cycle 12 — 2026-02-01T12:00:00.000Z

| Field | Value |
|-------|-------|
| Task | leaf_infra002 — [QUEUED_TASK] Fix types |
| Trigger | QUEUED_TASK |
| Agent summary | Second attempt, still failing. |
| Gate | RED |
| Commit | n/a |
| Closure | OPEN |
`

    const tmpDir = await mkdtemp(join(tmpdir(), 'delphi-terminal-log-'))
    const tmpLogPath = join(tmpDir, 'evolution.log.md')
    await writeFile(tmpLogPath, fixtureLog, 'utf-8')

    const anomalies = await scanLoopAnomalies(store, brainId, {
      logPath: tmpLogPath,
    })

    const logAnomalies = anomalies.filter(a =>
      a.evidence.startsWith('evolution.log.md'),
    )

    // terminal-reject cycle (Cycle 10) must produce zero anomalies
    const terminalAnomalies = logAnomalies.filter(a =>
      a.evidence.includes('2026-02-01T10:00:00.000Z'),
    )
    expect(terminalAnomalies.length).toBe(0)

    // Single RED (Cycle 11) must NOT produce a ROLLBACK
    const rollback = logAnomalies.find(a => a.kind === 'ROLLBACK')
    expect(rollback).toBeUndefined()

    // Two RED cycles for leaf_infra002 → exactly one GATE_RED_TWICE
    const gateRedTwice = logAnomalies.find(
      a =>
        a.kind === 'GATE_RED_TWICE' &&
        a.signature === 'log:leaf_infra002:GATE_RED_TWICE',
    )
    expect(gateRedTwice).toBeDefined()

    // Exactly one log anomaly total
    expect(logAnomalies.length).toBe(1)
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
