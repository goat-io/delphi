---
title: Task Execution and Scheduling Protocol
region: Spec
sources:
  - rfcs/RFC-0029-Task-Execution-Protocol.md
  - rfcs/RFC-0030-Task-Scheduling-and-Priority-Queue.md
  - rfcs/RFC-0026-Tasks-and-Questions.md
  - rfcs/RFC-0011-Knowledge-Economics.md
  - rfcs/RFC-0022-Dependency-and-Impact-Propagation.md
confidence: 0.86
---

# Task Execution and Scheduling Protocol

## Core Thesis

RFC-0026 defines what a Task is. RFC-0029 defines the contract an agent accepts when it
claims one. RFC-0030 defines how the Brain orders the backlog into an executable queue.
Together these three RFCs form the complete execution layer: from an unordered set of
open work items to a verifiably closed unit of knowledge creation.

## The Execution Contract (RFC-0029)

When an agent claims a task, it enters a four-obligation contract:

1. **Progress Reporting** — the agent must record observable progress at each meaningful step
2. **Produced Leaves** — every artifact created must be linked to the task via `producedLeaves`
3. **Closure Verification** — before marking DONE, the agent must verify each criterion in `closureCriteria`
4. **Failure Declaration** — if execution cannot complete, the agent must record the reason explicitly

RFC-0029 is explicit: "An agent that accepts a task and disappears has violated the execution
contract." Silent abandonment is a protocol violation, not just a quality issue — it creates
phantom progress that poisons the knowledge graph's understanding of what work is complete.

## Task Lifecycle States

RFC-0029 defines the complete state machine:

```
OPEN
  ↓ (agent selects via capability match + priority)
IN_PROGRESS
  ↓
  ├── DONE      — closure criteria verified, produced leaves linked
  ├── BLOCKED   — dependency not available; named; returns to queue
  └── CANCELLED — explicitly abandoned; reason recorded; supersession referenced
```

DONE and CANCELLED are terminal. BLOCKED returns the task to the visible queue with an
urgency boost proportional to wait time (RFC-0030). A BLOCKED task retains its `assignee`
for context continuity.

## Capability Matching

RFC-0029 requires agents to declare a capability profile before claiming any task:

```ts
interface AgentCapability {
  agentId: string
  taskTypes: TaskType[]
  domains: string[]
  maxConcurrent: number
}
```

An agent must not claim a task outside its declared `taskTypes` or `domains`. Capability
mismatch produces low-quality output, which creates evaluation debt (RFC-0005) — a secondary
cost that compounds the initial waste.

## Closure Verification

Before setting status to DONE, the agent must verify each clause in `closureCriteria` and
record the result:

```ts
interface ClosureVerification {
  criterion: string
  verified: boolean
  evidence: string   // leaf ID or explanation
}
```

If any criterion cannot be verified, the task must be BLOCKED, not DONE. RFC-0029 names
unverified closure a "knowledge integrity violation." A DONE task with unverified closure
criteria is indistinguishable from a correctly closed task until downstream beliefs built
on it are evaluated and found to be unsupported.

## Abandonment Recovery

RFC-0029 defines a timeout mechanism: a task IN_PROGRESS with no progress record for longer
than its `maxExecutionDuration` is considered abandoned. Abandoned tasks:

- Return to OPEN status
- Clear `assignee`
- Record the abandonment event with timestamp

A task abandoned twice without progress triggers a self-review: the task definition itself
becomes the subject of a new REVIEW task. The implication is that twice-abandoned tasks
are probably poorly specified.

## The Priority Queue (RFC-0030)

RFC-0030 defines the Task Queue as a persistent, ordered list of every OPEN task, sorted
by effective priority. The queue is dynamic — priorities recompute when the knowledge state
changes. It is not a backlog: stale, duplicate, and superseded tasks are pruned.

### Priority Score

RFC-0030 applies the RFC-0011 Knowledge Economics formula:

```
Priority =
  (Impact × ConfidenceGap × DependencyCount × RiskReduction)
  ÷ EstimatedCost
```

Where:
- **Impact** — count of transitively dependent leaves and decisions (from RFC-0022 dependency graph)
- **ConfidenceGap** — DesiredConfidence − CurrentConfidence for the target belief
- **DependencyCount** — direct consumers of the target leaf
- **RiskReduction** — probability that completing this task prevents a downstream confidence cascade
- **EstimatedCost** — projected agent effort in token-equivalents; defaults by task type, calibrated post-execution

### Urgency Modifier

Urgency is a time-based multiplier applied on top of computed priority:

```
EffectivePriority = Priority × UrgencyModifier
```

Urgency increases when:
- A task has been OPEN past its `StalenessThreshold`
- A dependent decision has a hard deadline
- A contradiction involving the target leaf is unresolved
- A BLOCKED task's blocker has just cleared

This prevents important tasks from silently aging out of the queue.

## Scheduling Cycle

RFC-0030 defines a scheduling cycle that runs on configurable intervals or on trigger events:

```
Trigger
↓ Recompute priorities for affected tasks
↓ Rebuild queue order
↓ Prune duplicates and superseded tasks
↓ Surface top-N tasks to available agents
```

Trigger events: confidence change, dependency graph change, task completion, new question
created, contradiction detected.

## Budget Constraints

RFC-0030 requires the scheduler to enforce a work budget per cycle:

```ts
interface WorkBudget {
  maxConcurrentTasks:   number
  maxTokensPerCycle:    number
  reservedForHuman:     number   // tasks requiring human review
  reservedForCritical:  number   // CONTRADICTION-origin tasks
}
```

CONTRADICTION-origin tasks are always prioritized. Capacity is always reserved for them and
for HUMAN_REQUEST tasks. This ensures the Brain cannot reach a state where a known
contradiction has no agent assigned to resolve it.

## Queue Pruning

A task is removed from the queue (status CANCELLED) when:
- A duplicate task for the same trigger and target is already IN_PROGRESS
- The target leaf has been deleted
- The originating question has been closed
- The task's `EstimatedCost` exceeds remaining budget with no reset scheduled

Pruning keeps the queue reflecting current knowledge state, not historical intent.

## Human Override

RFC-0030 allows humans to override computed priority, but requires:
1. A written explanation for the override
2. The override is recorded as an auditable event on the task
3. Budget constraints still apply — priority override does not bypass capacity limits

This preserves the auditability that makes Delphi's decision-making explainable.

## Answered Questions

**Q: What happens if an agent crashes mid-task?**

The `maxExecutionDuration` timeout detects abandonment. The task returns to OPEN after the
threshold passes, with the abandonment recorded. The next scheduling cycle will reassign it
to the next eligible agent. See RFC-0029 "Timeout and Abandonment."

**Q: Can two agents work on the same task simultaneously?**

No. RFC-0029 enforces exclusive claim: at most one agent may hold a task at a time.
When claimed, status transitions to IN_PROGRESS and `assignee` is set. No other agent
may claim it while IN_PROGRESS.

**Q: How does the Brain know when a BLOCKED task's dependency has cleared?**

RFC-0030's scheduling cycle is triggered on dependency graph changes (RFC-0022). When a
leaf that was blocking a task is updated or answered, the trigger fires, the BLOCKED task's
priority is recomputed with an urgency boost, and it re-enters the eligible queue.

**Q: What constitutes a valid "produced leaf" for a task?**

Any leaf created or materially updated during execution, linked via `producedLeaves` on
the task and via a corresponding evidence reference on the leaf. Tasks that genuinely
produce no new leaves must set `noProducedLeavesReason` explicitly — for example, an
INDEX_REFRESH task updates an index without creating a new canonical leaf.

**Q: Is the queue order deterministic given the same knowledge state?**

Yes. RFC-0030 states explicitly: "same knowledge state → same queue order." All inputs
to the priority formula are derivable from the knowledge graph, not from random or
time-based tiebreakers.
