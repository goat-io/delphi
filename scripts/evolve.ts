// pnpm evolve [--list | --close <taskId> --evidence "<ref>"]

import { isNoiseQuestion } from '@goatlab/delphi-extraction'
import { ensureSeededRegions } from '@goatlab/delphi-indexer'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import type { Leaf } from '@goatlab/delphi-protocol'
import { nowIso } from '@goatlab/delphi-protocol'
import { assessCoverage, COVERAGE_TARGET } from './coverage.js'
import { evaluateGoals, seedGoals } from './goals.js'
import { persistEvaluation } from './governance-bridge.js'
import { emitDefectTasks, scanLoopAnomalies } from './introspect.js'
import { getRubricByTitle } from './rubrics.js'

// ── Types ─────────────────────────────────────────────────────────────────────

export type DebtTrigger =
  | 'EMPTY_REGION'
  | 'ORPHAN_BELIEFS'
  | 'FLAGGED_LEAVES'
  | 'STALE_INDEXES'
  | 'SPEC_GAP'
  | 'OPEN_QUESTION'
  | 'GOAL_GAP'
  | 'COVERAGE_GAP'
  | 'QUEUED_TASK'

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
    case 'SPEC_GAP':
      return 'a new RFC draft exists in rfcs/ addressing the gap and RFC-9999 references it'
    case 'OPEN_QUESTION':
      return 'question answered with ≥1 evidence-backed belief'
    case 'GOAL_GAP':
      return 'goal metric meets target on re-evaluation'
    case 'COVERAGE_GAP':
      return 'region coverage score increased toward the target (more evidence-backed beliefs and/or answered questions)'
    case 'QUEUED_TASK':
      return 'the named gate reads from a RUBRIC leaf and persists EVALUATION leaves'
  }
}

// ── scanDebt ─────────────────────────────────────────────────────────────────

export async function scanDebt(
  store: BrainStore,
  brainId: string,
): Promise<DebtItem[]> {
  const items: DebtItem[] = []

  // Fetch brain state upfront — needed for both reconciliation and debt checks.
  const [regions, leaves, healthData] = await Promise.all([
    store.listRegions(brainId),
    store.listLeaves(brainId),
    store.health(brainId),
  ])

  // ── Reconciliation pass: retire stale tasks before emitting new debt ──────────
  // Run BEFORE emitDefectTasks so that archived auto-detected tasks release
  // their class-level dedup slot and stale GOAL_GAP tasks are not re-dispatched.

  const anomalies = await scanLoopAnomalies(store, brainId)
  const currentAnomalySignatures = new Set(anomalies.map(a => a.signature))

  // Read the reconciliation rubric (null if not yet seeded — never hard-require it).
  const reconcileRubric = await getRubricByTitle(
    store,
    brainId,
    'Stale Task Reconciliation Rubric',
  )

  // 1. Retire ACTIVE auto-detected introspection tasks whose anomaly is gone.
  const activeAutoDetected = leaves.filter(
    l =>
      l.kind === 'TASK' &&
      l.status === 'ACTIVE' &&
      (l.tags ?? []).includes('auto-detected'),
  )
  for (const task of activeAutoDetected) {
    const c = (task.content ?? {}) as Record<string, unknown>
    const sig = typeof c.target === 'string' ? c.target : null
    if (sig === null || currentAnomalySignatures.has(sig)) {
      continue
    }
    await store.updateLeaf(task.id, {
      status: 'ARCHIVED',
      content: {
        ...c,
        closedAt: nowIso(),
        evidence: 'anomaly-no-longer-reproduces',
      },
    })
    console.log(
      `[scanDebt] retired introspection task ${task.id} — anomaly resolved: ${sig}`,
    )
    if (reconcileRubric) {
      await persistEvaluation(store, brainId, {
        rubricId: reconcileRubric.id,
        targetLeafId: task.id,
        perspective: 'stale-task-reconciliation',
        scores: [
          {
            criterionId: 'anomaly-resolved',
            score: 1,
            rationale: `anomaly signature "${sig}" no longer present in current scan`,
          },
          {
            criterionId: 'goal-met',
            score: 0,
            rationale: 'N/A — introspection task, not a goal-gap task',
          },
        ],
        finalScore: 1,
        verdict: 'approve',
        rationale: `Anomaly ${sig} resolved; introspection task retired automatically.`,
      })
    }
  }

  // ── Introspection: detect anomalies and auto-emit defect tasks ────────────────
  // Anti-recursion guard: introspection tasks themselves failing must not spawn
  // infinite meta-tasks. The cap (5 active auto-detected tasks) in emitDefectTasks
  // enforces this. We also do not call scanDebt from within introspect.ts.
  if (anomalies.length > 0) {
    const { created, deduped } = await emitDefectTasks(
      store,
      brainId,
      anomalies,
    )
    if (created > 0 || deduped > 0) {
      console.log(
        `[scanDebt] introspection: ${anomalies.length} anomalies → created=${created} deduped=${deduped}`,
      )
    }
  }

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

  // SPEC_GAP (priority 30): leaves mentioning spec gaps
  // Exact phrases only — broad terms like "future work" cause false positives.
  const specGapQueries = ['no RFC yet', 'Candidate for a future RFC']
  const specGapLeafMap = new Map<string, Leaf>()
  for (const query of specGapQueries) {
    const hits = await store.searchLeaves(brainId, query, 5)
    for (const leaf of hits) {
      // Skip frontmatter-extraction noise (titles starting with "---")
      const title = (leaf.title as string) ?? ''
      if (title.startsWith('---')) {
        continue
      }
      // Skip leaves neutralized by a prior arbiter/perspective rejection
      const lc = (leaf.content ?? {}) as Record<string, unknown>
      if (lc.specGapResolved === true) {
        continue
      }
      if (!specGapLeafMap.has(leaf.id)) {
        specGapLeafMap.set(leaf.id, leaf)
      }
      if (specGapLeafMap.size >= 3) {
        break
      }
    }
    if (specGapLeafMap.size >= 3) {
      break
    }
  }
  for (const leaf of specGapLeafMap.values()) {
    const gapText = ((leaf.statement ?? leaf.title) as string).slice(0, 120)
    items.push({
      trigger: 'SPEC_GAP',
      target: leaf.id,
      targetTitle: (leaf.title as string).slice(0, 80),
      detail: `spec gap: "${gapText}"`,
      priority: 30,
    })
  }

  // OPEN_QUESTION (priority 20): up to 3 QUESTION leaves with ACTIVE status, noise-filtered
  const activeQuestions = leaves
    .filter(l => {
      if (l.kind !== 'QUESTION' || l.status !== 'ACTIVE') {
        return false
      }
      const t = l.title
      if (!t.endsWith('?')) {
        return false
      }
      if (t.length <= 25) {
        return false
      }
      if (isNoiseQuestion(t)) {
        return false
      }
      return true
    })
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

  // GOAL_GAP (priority 90): unmet goals — but suppress "All seeded regions populated"
  // when EMPTY_REGION items already exist (they already represent that work).
  const hasEmptyRegionItems = items.some(d => d.trigger === 'EMPTY_REGION')

  // Seed goals idempotently so they exist even on first run
  await seedGoals(store, brainId)
  const goalResults = await evaluateGoals(store, brainId)

  // 2. Retire ACTIVE GOAL_GAP tasks whose goal is now met.
  // Uses the `leaves` snapshot (fetched above) — GOAL_GAP tasks are created with
  // content.trigger='GOAL_GAP', distinct from auto-detected tasks already handled.
  const activeGoalGapTasks = leaves.filter(
    l =>
      l.kind === 'TASK' &&
      l.status === 'ACTIVE' &&
      (l.content as Record<string, unknown> | undefined)?.trigger ===
        'GOAL_GAP',
  )
  for (const task of activeGoalGapTasks) {
    const c = (task.content ?? {}) as Record<string, unknown>
    const gr = goalResults.find(r => r.goal.id === c.target)
    if (!gr?.met) {
      continue
    }
    await store.updateLeaf(task.id, {
      status: 'ARCHIVED',
      content: {
        ...c,
        closedAt: nowIso(),
        evidence: 'goal-met-auto-reconcile',
      },
    })
    console.log(
      `[scanDebt] retired GOAL_GAP task ${task.id} — goal met: ${gr.goal.title}`,
    )
    if (reconcileRubric) {
      await persistEvaluation(store, brainId, {
        rubricId: reconcileRubric.id,
        targetLeafId: task.id,
        perspective: 'stale-task-reconciliation',
        scores: [
          {
            criterionId: 'goal-met',
            score: 1,
            rationale: `${gr.goal.title}: current=${gr.current} satisfies target ${gr.comparator} ${gr.target}`,
          },
          {
            criterionId: 'anomaly-resolved',
            score: 0,
            rationale: 'N/A — goal-gap task, not an introspection task',
          },
        ],
        finalScore: 1,
        verdict: 'approve',
        rationale: `Goal met: ${gr.goal.title} (current ${gr.current} ${gr.comparator} ${gr.target})`,
      })
    }
  }

  for (const gr of goalResults) {
    if (gr.met) {
      continue
    }
    const content = gr.goal.content as {
      metric: string
      target: number
      comparator: string
    }
    // Suppress "All seeded regions populated" GOAL_GAP when EMPTY_REGION items exist
    if (content.metric === 'emptySeededRegions' && hasEmptyRegionItems) {
      continue
    }
    // Suppress "All regions meet coverage target" GOAL_GAP when COVERAGE_GAP items will be
    // emitted below — they already represent that work more specifically.
    if (content.metric === 'underCoveredRegions') {
      continue
    }
    items.push({
      trigger: 'GOAL_GAP',
      target: gr.goal.id,
      targetTitle: gr.goal.title,
      detail: `goal unmet: ${gr.goal.title} (current ${gr.current}, target ${content.comparator} ${gr.target})`,
      priority: 90,
    })
  }

  // COVERAGE_GAP (priority 85): regions with coverage score < COVERAGE_TARGET
  const coverageResults = await assessCoverage(store, brainId)
  for (const rc of coverageResults) {
    if (rc.score >= COVERAGE_TARGET) {
      continue
    }
    items.push({
      trigger: 'COVERAGE_GAP',
      target: rc.regionId,
      targetTitle: rc.regionTitle,
      detail: `region '${rc.regionTitle}' coverage ${rc.score.toFixed(2)} < ${COVERAGE_TARGET} — gaps: ${rc.gaps.join(', ')}`,
      priority: 85,
    })
  }

  // QUEUED_TASK: ACTIVE TASK leaves with HUMAN_REQUEST or queued flag, not yet dispatched.
  // Stale-dispatch reclaim (RFC-0029 lease semantics): if dispatchedAt is older than
  // RECLAIM_MINUTES (default 30) AND no closing DECISION leaf exists, treat as fresh.
  const RECLAIM_MINUTES = Number(process.env.RECLAIM_MINUTES ?? '30')
  const reclaimMs = RECLAIM_MINUTES * 60 * 1000

  // Build set of taskIds that have a closing DECISION leaf
  const allDecisions = await store.listLeaves(brainId, { kind: 'DECISION' })
  const closedTaskIds = new Set<string>()
  for (const d of allDecisions) {
    const dc = (d.content ?? {}) as Record<string, unknown>
    if (typeof dc.taskId === 'string') {
      closedTaskIds.add(dc.taskId)
    }
  }

  const allTasks = await store.listLeaves(brainId, { kind: 'TASK' })
  for (const taskLeaf of allTasks) {
    if (taskLeaf.status !== 'ACTIVE') {
      continue
    }
    const c = (taskLeaf.content ?? {}) as Record<string, unknown>
    // Must have closureCriteria (marks it as a work item)
    if (!c.closureCriteria) {
      continue
    }
    // Must be a human-queued task
    if (c.trigger !== 'HUMAN_REQUEST' && c.queued !== true) {
      continue
    }
    // If dispatchedAt is set, only reclaim if lease has expired and no DECISION closed it
    if (c.dispatchedAt) {
      const dispatchedMs = new Date(c.dispatchedAt as string).getTime()
      const ageMs = Date.now() - dispatchedMs
      const isStale = ageMs > reclaimMs
      const isClosed = closedTaskIds.has(taskLeaf.id)
      if (!isStale || isClosed) {
        continue
      }
      // Stale dispatch with no closing decision → re-queue (reclaim)
    }
    items.push({
      trigger: 'QUEUED_TASK',
      target: taskLeaf.id,
      targetTitle: taskLeaf.title,
      detail: (taskLeaf.statement ?? taskLeaf.title) as string,
      priority: typeof c.priority === 'number' ? c.priority : 50,
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
  // QUEUED_TASK: return the existing leaf after stamping dispatchedAt (prevents re-pick)
  if (item.trigger === 'QUEUED_TASK') {
    const existing = await store.getLeaf(item.target)
    if (!existing) {
      throw new Error(`QUEUED_TASK target leaf ${item.target} not found`)
    }
    const updated = await store.updateLeaf(item.target, {
      content: {
        ...((existing.content ?? {}) as Record<string, unknown>),
        dispatchedAt: nowIso(),
      },
    })
    console.log(`queued task dispatched: ${updated.id}`)
    return updated
  }

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

// ── buildWorkPrompt ───────────────────────────────────────────────────────────

const HARD_RULES = `
HARD RULES (non-negotiable):
- Never rename or version-bump packages.
- Never touch packages/delphi-{core,ai,brain,bun,express,governance,langgraph,sandbox,trpc,ui} or realtime-broker.
- Never edit .delphi/ directory.
- Keep \`pnpm typecheck && pnpm lint:check && pnpm test\` green at all times.
- Do NOT git commit or git push — the evolution loop does that.
- End your work by printing exactly: WORK COMPLETE: <one-line summary>
`.trim()

const COMMON_HEADER = `
You are a headless agent working in the Delphi monorepo (pnpm workspace, ESM, strict TypeScript, biome, vitest).
The specification lives in rfcs/. Consult AGENTS.md for system philosophy and conventions.
Your changes will be verified by the gate (\`pnpm typecheck && pnpm lint:check && pnpm test\`) and absorbed via \`pnpm brain:bootstrap\`.
`.trim()

export function buildWorkPrompt(item: DebtItem, task: Leaf): string {
  const taskId = task.id
  const closure = closureFor(item.trigger)

  const header = `${COMMON_HEADER}

Task ID: ${taskId}
Trigger: ${item.trigger}
Target: ${item.targetTitle}
Closure criteria: ${closure}

${HARD_RULES}`

  let body: string

  switch (item.trigger) {
    case 'EMPTY_REGION':
      body = `The knowledge region '${item.targetTitle}' of this repo's Brain is empty. Write ingestion-grade documentation that fills it: factual declarative markdown with YAML frontmatter (name, description, owner: engineering, status: active). For 'Execution Plane': write docs/execution-plane/<package>.md files (one per migrated package: delphi-core, delphi-ai, delphi-langgraph, delphi-sandbox, delphi-ui, delphi-brain, delphi-governance — read each package's README/src first; 30-50 lines each, every claim verifiable). Also add the docs/execution-plane/*.md glob to the source list in scripts/bootstrap-brain.ts mapped to the 'Execution Plane' region (follow the existing sources structure). For other regions: write docs/<kebab-title>/overview.md similarly mapped.`
      break

    case 'OPEN_QUESTION': {
      const kebab = item.targetTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60)
      body = `Research this open question from the Brain: '${item.targetTitle}'. First judge: is it a real open question or extraction noise (rhetorical fragment)? If noise: state so in research/${kebab}.md with frontmatter and a one-line verdict (this curates the Brain). If real: research it against rfcs/ and the codebase, write research/${kebab}.md: frontmatter + your answer as declarative sentences + an Evidence section citing specific RFC files/sections. Ensure scripts/bootstrap-brain.ts ingests research/*.md into the 'Spec' region (add the glob if absent).`
      break
    }

    case 'SPEC_GAP':
      body = `The Brain surfaced a spec gap: ${item.detail}. FIRST check whether rfcs/ already covers this topic (grep the rfcs directory). If covered, do NOT draft a duplicate RFC — instead write research/<kebab>-coverage.md (frontmatter + 3-5 declarative sentences stating where it is covered) and finish. If not covered: draft the missing RFC in rfcs/ following the existing house style EXACTLY (read rfcs/RFC-0026 as the style reference: Status: Draft, Depends On, Purpose, Core Principle, sections, Canonical Rules, Success Criteria). Choose the next free RFC number (ls rfcs/). Keep it focused (~150-250 lines). Update rfcs/RFC-9999-Delphi-Specification-Index.md: add it to the reading order phase that fits and the dependency graph, and remove the corresponding entry from 'Known open areas' if present.`
      break

    case 'ORPHAN_BELIEFS':
    case 'FLAGGED_LEAVES':
    case 'STALE_INDEXES':
      body = `Maintenance: run \`pnpm brain:bootstrap\` and report; if the issue persists, write a research/ note describing root cause.`
      break

    case 'GOAL_GAP': {
      // Extract metric / target / comparator from the detail string
      const detailMatch = item.detail.match(
        /current ([\d.]+), target ([<>=]+) ([\d.]+)/,
      )
      const metricStr = detailMatch
        ? `current=${detailMatch[1]}, target ${detailMatch[2]} ${detailMatch[3]}`
        : item.detail
      body = `A Brain health goal is unmet: '${item.targetTitle}'.

Metric: ${metricStr}

Metrics guide:
- emptySeededRegions: count of SEEDED regions with zero leaves → fix via \`pnpm brain:bootstrap\` or by adding docs to the appropriate source directory.
- orphanBeliefs: belief leaves with no evidence → fix by curating beliefs (link evidence) or running \`pnpm brain:bootstrap\`.
- staleIndexes: indexes not regenerated after leaf changes → fix via \`pnpm brain:bootstrap\`.
- openQuestions: ACTIVE QUESTION leaves → reduce by writing research/*.md answers for open questions.
- avgConfidence: mean confidence across beliefs → improve by adding evidence to low-confidence beliefs.

Decide the most impactful concrete action you can take now to move this metric toward its target. Prefer:
1. Running \`pnpm brain:bootstrap\` if the metric is likely stale (staleIndexes, emptySeededRegions).
2. Writing a research/<slug>.md answer note for an open question (openQuestions).
3. Adding or curating docs if regions are empty.
Do NOT write empty files or placeholder content. Every file must contain real knowledge.
After acting, re-run \`pnpm brain:bootstrap\` to update indexes.`
      break
    }

    case 'COVERAGE_GAP':
      body = `The knowledge region '${item.targetTitle}' of this repo's Brain is under-covered (${item.detail}). DEEPEN it toward structured understanding — do NOT invent content. Read the relevant rfcs/ and source for this region's topic, then write docs/ or research/ markdown (factual, declarative, YAML frontmatter) that adds genuine evidence-backed knowledge to this region: define its key concepts, state load-bearing beliefs with citations to specific RFC files/sections or source files, and answer the region's real open questions. Ensure scripts/bootstrap-brain.ts ingests the file into the right region (follow existing source-list structure). Same hard rules; gate must pass; end with WORK COMPLETE.`
      break

    case 'QUEUED_TASK': {
      const taskContent = (task.content ?? {}) as Record<string, unknown>
      const taskStatement = (task.statement ?? task.title) as string
      const taskClosureCriteria =
        (taskContent.closureCriteria as string | undefined) ??
        closureFor(item.trigger)
      body = `## Engineering Work Order

**Task title:** ${task.title}

**Statement / description:**
${taskStatement}

**Closure criteria:**
${taskClosureCriteria}

### Instructions

This is a CODE task operating in the knowledge plane (packages/delphi-*, scripts/, tests/).

1. Read the relevant source files first before writing any code.
2. Implement the change minimally — no gold-plating.
3. Add or extend vitest tests for every changed behaviour.
4. Rubric leaves are read via \`getRubricByTitle(store, brainId, title)\` from \`scripts/rubrics.ts\` and seeded in \`seedRubrics\`. If this task needs a new rubric, extend \`seedRubrics\` (idempotent: check for existing before creating).
5. EVALUATION leaves are persisted via \`persistEvaluation(store, brainId, input)\` from \`scripts/governance-bridge.ts\`. Use it to record evaluation results against rubric criteria.
6. Constants used as thresholds MUST stay as runtime fallbacks when no brain or rubric is available — libraries must never hard-require a live brain at import time.
7. Run \`pnpm typecheck && pnpm lint:check && pnpm test\` and ensure it is green before finishing.`
      break
    }
  }

  return `${header}

${body}`
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
