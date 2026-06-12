// pnpm evolve [--list | --close <taskId> --evidence "<ref>"]

import { ensureSeededRegions } from '@goatlab/delphi-indexer'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import type { Leaf } from '@goatlab/delphi-protocol'
import { nowIso } from '@goatlab/delphi-protocol'

// ── Types ─────────────────────────────────────────────────────────────────────

export type DebtTrigger =
  | 'EMPTY_REGION'
  | 'ORPHAN_BELIEFS'
  | 'FLAGGED_LEAVES'
  | 'STALE_INDEXES'
  | 'OPEN_QUESTION'

export interface DebtItem {
  trigger: DebtTrigger
  target: string
  targetTitle: string
  detail: string
  priority: number
}

// ── Closure criteria ──────────────────────────────────────────────────────────

function closureFor(trigger: DebtTrigger): string {
  switch (trigger) {
    case 'EMPTY_REGION':
      return 'region has ≥5 leaves and an index after re-bootstrap'
    case 'ORPHAN_BELIEFS':
      return 'orphanBeliefs === 0'
    case 'FLAGGED_LEAVES':
      return 'no leaves remain in PROPOSED'
    case 'STALE_INDEXES':
      return 'staleIndexes === 0'
    case 'OPEN_QUESTION':
      return 'question answered with ≥1 evidence-backed belief'
  }
}

// ── scanDebt ─────────────────────────────────────────────────────────────────

export async function scanDebt(
  store: BrainStore,
  brainId: string,
): Promise<DebtItem[]> {
  const items: DebtItem[] = []

  const [regions, leaves, healthData] = await Promise.all([
    store.listRegions(brainId),
    store.listLeaves(brainId),
    store.health(brainId),
  ])

  // EMPTY_REGION (priority 100): SEEDED regions with 0 leaves
  for (const region of regions) {
    if (region.kind !== 'SEEDED') {
      continue
    }
    const count = leaves.filter(l => l.regionId === region.id).length
    if (count === 0) {
      items.push({
        trigger: 'EMPTY_REGION',
        target: region.id,
        targetTitle: region.title,
        detail: `seeded region '${region.title}' has no knowledge — navigation debt`,
        priority: 100,
      })
    }
  }

  // ORPHAN_BELIEFS (priority 80)
  if (healthData.orphanBeliefs > 0) {
    items.push({
      trigger: 'ORPHAN_BELIEFS',
      target: 'brain',
      targetTitle: 'Brain',
      detail: `${healthData.orphanBeliefs} belief(s) have no evidence — knowledge debt`,
      priority: 80,
    })
  }

  // FLAGGED_LEAVES (priority 60): PROPOSED leaves excluding TASK/DECISION
  const proposedLeaves = leaves.filter(
    l => l.status === 'PROPOSED' && l.kind !== 'TASK' && l.kind !== 'DECISION',
  )
  if (proposedLeaves.length > 0) {
    items.push({
      trigger: 'FLAGGED_LEAVES',
      target: 'brain',
      targetTitle: 'Brain',
      detail: `${proposedLeaves.length} leaf/leaves in PROPOSED status need review`,
      priority: 60,
    })
  }

  // STALE_INDEXES (priority 40)
  if (healthData.staleIndexes > 0) {
    items.push({
      trigger: 'STALE_INDEXES',
      target: 'brain',
      targetTitle: 'Brain',
      detail: `${healthData.staleIndexes} index(es) are stale — navigation debt`,
      priority: 40,
    })
  }

  // OPEN_QUESTION (priority 20): up to 3 QUESTION leaves with ACTIVE status
  const activeQuestions = leaves
    .filter(l => l.kind === 'QUESTION' && l.status === 'ACTIVE')
    .slice(0, 3)

  for (const q of activeQuestions) {
    items.push({
      trigger: 'OPEN_QUESTION',
      target: q.id,
      targetTitle: q.title,
      detail: `open question: "${q.title}"`,
      priority: 20,
    })
  }

  // Sort by priority descending
  items.sort((a, b) => b.priority - a.priority)

  return items
}

// ── createTaskFromDebt ────────────────────────────────────────────────────────

export async function createTaskFromDebt(
  store: BrainStore,
  brainId: string,
  item: DebtItem,
): Promise<Leaf> {
  // Dedupe: look for existing ACTIVE TASK with same trigger + target
  const existingTasks = await store.listLeaves(brainId, { kind: 'TASK' })
  const existing = existingTasks.find(
    t =>
      t.status === 'ACTIVE' &&
      (t.content as Record<string, unknown> | undefined)?.trigger ===
        item.trigger &&
      (t.content as Record<string, unknown> | undefined)?.target ===
        item.target,
  )
  if (existing) {
    console.log(`existing task: ${existing.id}`)
    return existing
  }

  // Ensure Operations region exists
  const [opsRegion] = await ensureSeededRegions(store, brainId, ['Operations'])
  const regionId = opsRegion?.id

  const title = `[${item.trigger}] ${item.targetTitle}`.slice(0, 120)

  return store.createLeaf({
    brainId,
    kind: 'TASK',
    status: 'ACTIVE',
    title,
    statement: item.detail,
    aliases: [],
    tags: [],
    regionId,
    content: {
      trigger: item.trigger,
      target: item.target,
      priority: item.priority,
      origin: 'evolve-harness',
      closureCriteria: closureFor(item.trigger),
    },
  })
}

// ── closeTask ─────────────────────────────────────────────────────────────────

export async function closeTask(
  store: BrainStore,
  brainId: string,
  taskId: string,
  evidenceRef: string,
): Promise<{ task: Leaf; decision: Leaf }> {
  const existing = await store.getLeaf(taskId)
  if (!existing) {
    throw new Error(`Leaf ${taskId} not found`)
  }
  if (existing.kind !== 'TASK') {
    throw new Error(`Leaf ${taskId} is kind ${existing.kind}, expected TASK`)
  }

  // Archive the task
  const task = await store.updateLeaf(taskId, {
    status: 'ARCHIVED',
    content: {
      ...(existing.content ?? {}),
      closedAt: nowIso(),
      evidence: evidenceRef,
    },
  })

  // Ensure Decisions region exists
  const [decisionsRegion] = await ensureSeededRegions(store, brainId, [
    'Decisions',
  ])
  const decisionRegionId = decisionsRegion?.id

  const decisionTitle = `Resolved: ${task.title}`.slice(0, 120)

  const decision = await store.createLeaf({
    brainId,
    kind: 'DECISION',
    status: 'ACTIVE',
    title: decisionTitle,
    statement: `Task closed with evidence: ${evidenceRef}`,
    aliases: [],
    tags: [],
    regionId: decisionRegionId,
    content: {
      taskId,
      evidence: evidenceRef,
    },
  })

  // DERIVED_FROM: decision ← task
  await store.createRelationship({
    brainId,
    sourceLeafId: decision.id,
    targetLeafId: task.id,
    type: 'DERIVED_FROM',
  })

  return { task, decision }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const argv = process.argv.slice(2)

  const dataDir = process.env.DELPHI_DATA_DIR ?? '.delphi/brain'

  const db = await createDb({ dataDir })
  await migrate(db)
  const store = new BrainStore(db)

  try {
    const brain = await store.getBrainByName('delphi')
    if (!brain) {
      console.error('Brain "delphi" not found. run pnpm brain:bootstrap first.')
      process.exit(1)
    }
    const brainId = brain.id

    if (argv[0] === '--list') {
      // List all ACTIVE TASK leaves
      const tasks = await store.listLeaves(brainId, { kind: 'TASK' })
      const active = tasks.filter(t => t.status === 'ACTIVE')
      if (active.length === 0) {
        console.log('No active tasks.')
      } else {
        for (const t of active) {
          const criteria =
            (t.content as Record<string, unknown> | undefined)
              ?.closureCriteria ?? '(none)'
          console.log(`${t.id}  ${t.title}`)
          console.log(`  closure: ${criteria}`)
        }
      }
      return
    }

    if (argv[0] === '--close') {
      const taskId = argv[1]
      const evIdx = argv.indexOf('--evidence')
      const evidenceRef = evIdx !== -1 ? argv[evIdx + 1] : undefined
      if (!taskId || !evidenceRef) {
        console.error('Usage: pnpm evolve --close <taskId> --evidence "<ref>"')
        process.exit(1)
      }
      const { task, decision } = await closeTask(
        store,
        brainId,
        taskId,
        evidenceRef,
      )
      console.log(`Task archived:    ${task.id}`)
      console.log(`Decision created: ${decision.id}`)
      return
    }

    // Default: scan debt → print table → createTaskFromDebt for top item
    const debtItems = await scanDebt(store, brainId)
    if (debtItems.length === 0) {
      console.log('No debt detected. Brain is healthy.')
      return
    }

    console.log(
      `\n${'#'.padEnd(3)} ${'TRIGGER'.padEnd(20)} ${'PRI'.padEnd(5)} DETAIL`,
    )
    console.log('-'.repeat(80))
    debtItems.forEach((d, i) => {
      console.log(
        `${String(i + 1).padEnd(3)} ${d.trigger.padEnd(20)} ${String(d.priority).padEnd(5)} ${d.detail}`,
      )
    })

    const top = debtItems[0]
    if (!top) {
      return
    }

    const task = await createTaskFromDebt(store, brainId, top)
    const criteria =
      (task.content as Record<string, unknown> | undefined)?.closureCriteria ??
      '(none)'

    console.log('\n── Work Order ───────────────────────────────────────────')
    console.log(`Task ID:          ${task.id}`)
    console.log(`Title:            ${task.title}`)
    console.log(`Closure criteria: ${criteria}`)
    console.log(
      `\nAssign to an agent; close with: pnpm evolve --close ${task.id} --evidence '<ref>'`,
    )
  } finally {
    await db.close()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => {
    console.error(e)
    process.exit(1)
  })
}
