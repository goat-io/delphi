// node --import tsx scripts/introspect.ts

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ensureSeededRegions } from '@goatlab/delphi-indexer'
import { BrainStore } from '@goatlab/delphi-knowledge'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AnomalyKind =
  | 'DISPUTED_TASK'
  | 'UNVERIFIED_CLOSURE'
  | 'NEEDS_HUMAN_UNRESOLVED'
  | 'ROLLBACK'
  | 'EMPTY_CYCLE'
  | 'GATE_RED_TWICE'

export interface Anomaly {
  signature: string
  kind: AnomalyKind
  detail: string
  evidence: string
}

// ── scanLoopAnomalies ─────────────────────────────────────────────────────────

/**
 * Scan the brain and the evolution log for anomalies.
 * Sources:
 *   1. Brain: DISPUTED TASK leaves
 *   2. Brain: TASK leaves with content.unverified === true
 *   3. Brain: EVALUATION leaves with needs_human verdict/outcome and no follow-up DECISION
 *   4. evolution.log.md: RED gate cycles, SKIPPED gate cycles, DISPUTED closure, empty-cycle markers
 *
 * Results are deduplicated by signature (first seen wins) and sorted by kind.
 */
export async function scanLoopAnomalies(
  store: BrainStore,
  brainId: string,
  opts?: { logPath?: string },
): Promise<Anomaly[]> {
  const seen = new Map<string, Anomaly>()

  function add(a: Anomaly): void {
    if (!seen.has(a.signature)) {
      seen.set(a.signature, a)
    }
  }

  // ── 1. Brain: DISPUTED TASK leaves ──────────────────────────────────────────
  const allLeaves = await store.listLeaves(brainId)

  for (const leaf of allLeaves) {
    if (leaf.kind !== 'TASK') {
      continue
    }
    if (leaf.status === 'DISPUTED') {
      const c = (leaf.content ?? {}) as Record<string, unknown>
      const blocked = typeof c.blocked === 'string' ? c.blocked : ''
      const detail = blocked
        ? `${leaf.title} — blocked: ${blocked}`
        : leaf.title
      add({
        signature: `disputed:${leaf.id}`,
        kind: 'DISPUTED_TASK',
        detail,
        evidence: `brain:leaf:${leaf.id}`,
      })
    }
  }

  // ── 2. Brain: TASK leaves with content.unverified === true ──────────────────
  for (const leaf of allLeaves) {
    if (leaf.kind !== 'TASK') {
      continue
    }
    const c = (leaf.content ?? {}) as Record<string, unknown>
    if (c.unverified === true) {
      add({
        signature: `unverified:${leaf.id}`,
        kind: 'UNVERIFIED_CLOSURE',
        detail: leaf.title,
        evidence: `brain:leaf:${leaf.id}`,
      })
    }
  }

  // ── 3. Brain: EVALUATION needs_human without follow-up DECISION ─────────────
  const decisionLeaves = allLeaves.filter(l => l.kind === 'DECISION')
  const resolvedTargetIds = new Set(
    decisionLeaves
      .map(d => {
        const c = (d.content ?? {}) as Record<string, unknown>
        return typeof c.taskId === 'string' ? c.taskId : null
      })
      .filter((id): id is string => id !== null),
  )

  for (const leaf of allLeaves) {
    if (leaf.kind !== 'EVALUATION') {
      continue
    }
    const c = (leaf.content ?? {}) as Record<string, unknown>
    const verdict = c.verdict
    const outcome = c.outcome
    if (verdict !== 'needs_human' && outcome !== 'needs_human') {
      continue
    }

    const targetLeafId =
      typeof c.targetLeafId === 'string' ? c.targetLeafId : leaf.id
    if (resolvedTargetIds.has(targetLeafId)) {
      continue
    }

    const perspective =
      typeof c.perspective === 'string' ? c.perspective : 'unknown'
    add({
      signature: `needs-human:${targetLeafId}:${perspective}`,
      kind: 'NEEDS_HUMAN_UNRESOLVED',
      detail: leaf.title,
      evidence: `brain:leaf:${leaf.id}`,
    })
  }

  // ── 4. Parse evolution.log.md ────────────────────────────────────────────────
  const logPath = opts?.logPath ?? resolve(process.cwd(), 'evolution.log.md')

  if (existsSync(logPath)) {
    const logContent = readFileSync(logPath, 'utf-8')
    const cycleBlocks = logContent.split(/(?=^## Cycle \d+)/m).filter(Boolean)

    // Track RED gate cycles by taskId for GATE_RED_TWICE detection
    const redByTaskId = new Map<string, string[]>() // taskId → [timestamp, ...]

    for (const block of cycleBlocks) {
      // Extract timestamp from "## Cycle N — <timestamp>"
      const headerMatch = block.match(/^## Cycle \d+ — (.+)/m)
      if (!headerMatch) {
        continue
      }
      const timestamp = headerMatch[1]!.trim()

      // Extract task id from "| Task | <id> — ..."
      const taskRowMatch = block.match(/\|\s*Task\s*\|\s*(\S+)\s*—/)
      const taskId = taskRowMatch ? (taskRowMatch[1] ?? '') : ''

      // Extract gate result
      const gateMatch = block.match(/\|\s*Gate\s*\|\s*(\S+)\s*\|/)
      const gateResult = gateMatch ? gateMatch[1]!.trim() : ''

      // Extract closure result
      const closureMatch = block.match(/\|\s*Closure\s*\|\s*(\S+)\s*\|/)
      const closureResult = closureMatch ? closureMatch[1]!.trim() : ''

      // Extract agent summary line
      const summaryMatch = block.match(/\|\s*Agent summary\s*\|\s*(.+?)\s*\|/)
      const agentSummary = summaryMatch ? summaryMatch[1]!.trim() : ''

      if (gateResult === 'RED') {
        add({
          signature: `log:${timestamp}:GATE_RED`,
          kind: 'ROLLBACK',
          detail: `cycle gate RED at ${timestamp}`,
          evidence: `evolution.log.md:cycle:${timestamp}`,
        })

        // Track for GATE_RED_TWICE
        if (taskId) {
          const prior = redByTaskId.get(taskId) ?? []
          prior.push(timestamp)
          redByTaskId.set(taskId, prior)
        }
      } else if (gateResult === 'SKIPPED') {
        add({
          signature: `log:${timestamp}:GATE_RED`,
          kind: 'EMPTY_CYCLE',
          detail: `cycle gate SKIPPED at ${timestamp}`,
          evidence: `evolution.log.md:cycle:${timestamp}`,
        })
      }

      if (closureResult === 'DISPUTED') {
        add({
          signature: `log:${timestamp}:DISPUTED`,
          kind: 'DISPUTED_TASK',
          detail: `closure disputed at ${timestamp}`,
          evidence: `evolution.log.md:cycle:${timestamp}`,
        })
      }

      if (agentSummary.includes('no work produced — empty cycle')) {
        add({
          signature: `log:${timestamp}:EMPTY_CYCLE`,
          kind: 'EMPTY_CYCLE',
          detail: `empty cycle at ${timestamp}`,
          evidence: `evolution.log.md:cycle:${timestamp}`,
        })
      }
    }

    // Emit GATE_RED_TWICE for any taskId with 2+ RED gates
    for (const [taskId, timestamps] of redByTaskId.entries()) {
      if (timestamps.length >= 2) {
        add({
          signature: `log:${taskId}:GATE_RED_TWICE`,
          kind: 'GATE_RED_TWICE',
          detail: `gate RED twice for task ${taskId} at ${timestamps.join(', ')}`,
          evidence: `evolution.log.md:cycle:${timestamps[timestamps.length - 1]}`,
        })
      }
    }
  }

  // Sort by kind (alphabetical for determinism)
  const anomalies = Array.from(seen.values())
  anomalies.sort((a, b) => a.kind.localeCompare(b.kind))
  return anomalies
}

// ── emitDefectTasks ───────────────────────────────────────────────────────────

/**
 * Deduplicate logic (applied in order):
 *   A. Exact-match: if any task (any status) has content.target === anomaly.signature → skip (deduped)
 *   B. Class-level: if any ACTIVE task tagged ['loop-defect','auto-detected'] has
 *      content.anomalyKind === anomaly.kind → skip (deduped)
 *   Cap: if ACTIVE auto-detected loop-defect task count >= 5, log warning and stop emitting.
 *
 * Rationale: exact dedup prevents re-creating tasks for the exact same anomaly instance;
 * class-level dedup prevents multiple active tasks for the same anomaly class (flooding
 * the queue with variants of the same structural problem). The cap (5) prevents runaway
 * defect task accumulation during noisy loops.
 */
export async function emitDefectTasks(
  store: BrainStore,
  brainId: string,
  anomalies: Anomaly[],
): Promise<{ created: number; deduped: number }> {
  let created = 0
  let deduped = 0

  const [opsRegion] = await ensureSeededRegions(store, brainId, ['Operations'])
  const regionId = opsRegion?.id

  for (const anomaly of anomalies) {
    // Cap check: count ACTIVE tasks tagged 'auto-detected'
    const allLeaves = await store.listLeaves(brainId)
    const activeAutoDetected = allLeaves.filter(
      l =>
        l.kind === 'TASK' &&
        l.status === 'ACTIVE' &&
        (l.tags ?? []).includes('auto-detected'),
    )
    if (activeAutoDetected.length >= 5) {
      console.warn(
        `[emitDefectTasks] cap reached (${activeAutoDetected.length} active auto-detected tasks) — skipping remaining anomalies`,
      )
      break
    }

    // Dedupe check A (exact): any task (any status) with content.target === anomaly.signature
    const exactMatch = allLeaves.find(l => {
      if (l.kind !== 'TASK') {
        return false
      }
      const c = (l.content ?? {}) as Record<string, unknown>
      return c.target === anomaly.signature
    })
    if (exactMatch) {
      deduped++
      continue
    }

    // Dedupe check B (class-level): any ACTIVE loop-defect task with same anomalyKind
    const classMatch = allLeaves.find(l => {
      if (l.kind !== 'TASK') {
        return false
      }
      if (l.status !== 'ACTIVE') {
        return false
      }
      const tags = l.tags ?? []
      if (!tags.includes('loop-defect') || !tags.includes('auto-detected')) {
        return false
      }
      const c = (l.content ?? {}) as Record<string, unknown>
      return c.anomalyKind === anomaly.kind
    })
    if (classMatch) {
      deduped++
      continue
    }

    // Create the defect task leaf
    await store.createLeaf({
      brainId,
      kind: 'TASK',
      status: 'ACTIVE',
      title: `[loop-defect] ${anomaly.kind}: ${anomaly.signature.slice(0, 60)}`,
      statement: anomaly.detail,
      aliases: [],
      tags: ['loop-defect', 'auto-detected'],
      regionId,
      content: {
        trigger: 'HUMAN_REQUEST',
        queued: true,
        target: anomaly.signature,
        priority: 92,
        origin: 'introspection',
        anomalyKind: anomaly.kind,
        evidence: anomaly.evidence,
        closureCriteria:
          'anomaly class no longer reproduced in a subsequent run + regression coverage',
      },
    })

    created++
  }

  return { created, deduped }
}
