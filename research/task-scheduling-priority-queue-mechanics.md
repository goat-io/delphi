---
title: Task Scheduling and Priority Queue Mechanics
region: Spec
kind: research
confidence: 0.80
sources:
  - rfcs/RFC-0030-Task-Scheduling-and-Priority-Queue.md
  - rfcs/RFC-0029-Task-Execution-Protocol.md
  - rfcs/RFC-0026-Tasks-and-Questions.md
  - rfcs/RFC-0011-Knowledge-Economics.md
  - rfcs/RFC-0022-Dependency-and-Impact-Propagation.md
---

# Task Scheduling and Priority Queue Mechanics

## What the Queue Is (RFC-0030)

RFC-0030 § The Task Queue defines:

> "The Task Queue is a persistent, ordered list of open tasks. Every OPEN task appears in
> the queue. The queue is sorted by effective priority. The queue is dynamic: priorities
> recompute when the knowledge state changes."

This is not a static backlog. It is a live view over the knowledge graph. When a confidence
change propagates through the dependency graph (RFC-0022), every task whose target leaf is
affected gets its priority recomputed in the same scheduling cycle.

---

## Priority Formula (RFC-0030, RFC-0011)

The base priority formula from RFC-0011 as applied in RFC-0030:

```
Priority =
  (Impact × ConfidenceGap × DependencyCount × RiskReduction)
  ÷ EstimatedCost
```

### Term Definitions

| Term              | Source    | Meaning                                                          |
|-------------------|-----------|------------------------------------------------------------------|
| `Impact`          | RFC-0022  | Count of transitively dependent leaves and decisions             |
| `ConfidenceGap`   | RFC-0003  | `DesiredConfidence − CurrentConfidence` of the target belief     |
| `DependencyCount` | RFC-0002  | Number of direct consumers of the target leaf                    |
| `RiskReduction`   | RFC-0012  | Probability that completing the task prevents a confidence cascade |
| `EstimatedCost`   | RFC-0030  | Projected agent effort in token-equivalents; defaults by type    |

**Belief:** `EstimatedCost` defaults come from historical execution data (RFC-0030 §
Priority Score); tasks with no history use type-default estimates which improve over time.

---

## Urgency Modifier (RFC-0030)

Priority alone would let important tasks age without movement. The urgency modifier
prevents this:

```
EffectivePriority = Priority × UrgencyModifier
```

RFC-0030 § Urgency Modifier specifies that urgency increases when:

1. A task has been OPEN past its `StalenessThreshold`.
2. A dependent decision has a hard deadline.
3. A contradiction involving the target leaf is unresolved.
4. A BLOCKED task's blocker has just cleared.

The urgency modifier is time-based: the longer a task sits open, the higher its urgency
grows, preventing indefinite starvation of lower-priority work.

---

## Scheduling Cycle Trigger Events (RFC-0030)

The scheduling cycle runs on a configurable interval OR is triggered by events:

- Confidence change on any leaf
- Dependency graph change (edge added or removed)
- Task completion (DONE, CANCELLED, BLOCKED → OPEN)
- New question created (RFC-0026)
- Contradiction detected

Per RFC-0030 § Scheduling Cycle:

```
Trigger
↓
Recompute priorities for affected tasks
↓
Rebuild queue order
↓
Prune duplicate and superseded tasks
↓
Surface top-N tasks to available agents
```

**Belief:** Priority recomputation is scoped to affected tasks, not a full-queue scan,
for efficiency.

---

## Budget Constraints (RFC-0030)

The scheduler operates under a `WorkBudget`:

```ts
interface WorkBudget {
  maxConcurrentTasks:   number
  maxTokensPerCycle:    number
  reservedForHuman:     number
  reservedForCritical:  number
}
```

Capacity is always reserved for:
- **CONTRADICTION-origin tasks** — unresolved contradictions get budget slots regardless
  of their computed priority score (RFC-0030 § Task Selection, rule 4).
- **HUMAN_REQUEST-origin tasks** — tasks triggered by a human override are reserved.

**Belief:** Budget constraints prevent runaway agent loops; they are the scheduling
equivalent of the generation budgets in RFC-0028.

---

## Task Selection Rules (RFC-0030)

When an agent requests work, the scheduler applies rules in order:

1. Only OPEN tasks with no unresolved BLOCKED dependencies.
2. Highest `EffectivePriority` first.
3. Prefer tasks whose target leaves the agent has previously worked on (domain affinity).
4. Prefer CONTRADICTION-origin tasks when contradictions exist.
5. Never assign a task already IN_PROGRESS.

**Belief:** Rule 3 (domain affinity) is a tiebreaker, not a primary sort — it does not
override the priority ordering.

---

## Blocked Task Rescheduling (RFC-0030)

A BLOCKED task (RFC-0029 § Failure Handling) re-enters the queue when its blocker
resolves. RFC-0030 § Blocked Task Rescheduling:

> "Blocked tasks do not decay in priority. They receive an urgency boost proportional to
> their wait time."

This ensures that a task which was blocked for 7 days resurfaces near the top of the
queue, not at its original unadjusted priority.

---

## Queue Pruning (RFC-0030)

A task is pruned (status: CANCELLED) when:

| Condition                                              | Reason                     |
|--------------------------------------------------------|----------------------------|
| Duplicate task in same state already IN_PROGRESS       | Deduplication              |
| Target leaf deleted                                    | Stale target               |
| Originating question closed (RFC-0026)                 | No longer needed           |
| EstimatedCost exceeds remaining budget, no reset scheduled | Budget exhausted        |

**Belief:** Pruning is what keeps the queue reflecting current knowledge state rather
than accumulating a historical backlog (RFC-0030 § The Task Queue: "not a backlog").

---

## Human Overrides (RFC-0030)

RFC-0030 § Human Override:

> "Every override requires a written explanation. Overrides are recorded as auditable
> events on the task. Human overrides do not circumvent budget constraints."

This means human overrides can reprioritise tasks but cannot exceed the Brain's token
or concurrency budget. The override is an event on the `TaskQueueEntry.overriddenBy` field.

---

## Queue Schema (RFC-0030)

```ts
interface TaskQueueEntry {
  taskId:            string
  computedPriority:  number      // from RFC-0011 formula
  effectivePriority: number      // computedPriority × urgencyModifier
  urgencyModifier:   number
  estimatedCost:     number
  eligibleAt:        Date        // not before this (after BLOCKED resolution delay)
  blockedBy:         string[]    // taskIds or leafIds blocking this
  overriddenBy?:     string      // human who overrode priority
}
```

---

## Canonical Beliefs

1. Every OPEN task is in the priority queue; the queue is a live view, not a backlog.
2. Priority is computed from the RFC-0011 formula; it is not manually assigned.
3. Effective priority = computed priority × urgency modifier; urgency prevents starvation.
4. The scheduling cycle is event-triggered and priority-scoped, not a full-queue scan.
5. Budget constraints are enforced per cycle; CONTRADICTION tasks always get reserved capacity.
6. BLOCKED tasks re-enter the queue with urgency boost when their blocker resolves.
7. Human overrides require written explanation and are auditable events.
8. Queue pruning removes stale, duplicate, and budget-exhausted tasks continuously.
9. Agents do not self-select tasks; the scheduler surfaces the highest-priority eligible task.
10. Scheduling decisions are reproducible: same knowledge state → same queue order.
