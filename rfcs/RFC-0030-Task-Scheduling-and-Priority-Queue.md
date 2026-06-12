# RFC-0030 — Task Scheduling & Priority Queue
## How the Brain Orders and Budgets Future Work

Status: Draft

Depends On:
- RFC-0026 Tasks & Questions
- RFC-0029 Task Execution Protocol
- RFC-0011 Knowledge Economics
- RFC-0012 Decision Theory
- RFC-0022 Dependency & Impact Propagation

---

# Purpose

RFC-0026 defines what a Task is.

A Task is a unit of future work.

RFC-0029 defines how an agent executes a Task.

Neither defines:

- How tasks are ordered relative to each other.
- How the Brain decides which task to work on next.
- How work budgets constrain scheduling.
- How task urgency changes over time.
- How blocked tasks are rescheduled.

This RFC defines the Task Scheduling and Priority Queue:

The mechanism by which a Brain transforms a backlog of open tasks
into an ordered, budgeted plan of agent work.

---

# Core Principle

A Brain that cannot prioritize work cannot improve.

Priority is not an opinion.

Priority is computed from the Knowledge Economics formula (RFC-0011)
applied to each task's expected knowledge gain.

The queue is the Brain's current understanding of what matters most.

---

# The Task Queue

The Task Queue is a persistent, ordered list of open tasks.

Every OPEN task appears in the queue.

The queue is sorted by effective priority.

The queue is dynamic: priorities recompute when the knowledge state changes.

The queue is not a backlog.

A backlog accumulates indefinitely.

The queue is active: stale, duplicate, and superseded tasks are pruned.

---

# Priority Score

Priority is computed per RFC-0011:

```
Priority =
  (Impact × ConfidenceGap × DependencyCount × RiskReduction)
  ÷ EstimatedCost
```

**Impact** — count of transitively dependent leaves and decisions (RFC-0022).

**ConfidenceGap** — DesiredConfidence − CurrentConfidence of the target belief.

**DependencyCount** — number of direct consumers of the target leaf.

**RiskReduction** — probability that completing this task prevents a downstream confidence cascade.

**EstimatedCost** — projected agent effort in token-equivalents. Defaults by task type; updated post-execution.

Higher priority = higher score.

---

# Urgency Modifier

Urgency is a time-based multiplier:

```
EffectivePriority = Priority × UrgencyModifier
```

Urgency increases when:

- A task has been OPEN past its StalenessThreshold.
- A dependent decision has a hard deadline.
- A contradiction involving the target leaf is unresolved.
- A BLOCKED task's blocker has cleared.

Urgency prevents important tasks from aging out of visibility.

---

# Scheduling Cycle

The Brain runs a scheduling cycle on a configurable interval or on trigger events.

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

Trigger events: confidence change, dependency graph change, task completion,
new question, contradiction detected.

---

# Budget Constraints

The Brain operates under a work budget:

```ts
interface WorkBudget {
  maxConcurrentTasks:   number
  maxTokensPerCycle:    number
  reservedForHuman:     number   // tasks requiring human review
  reservedForCritical:  number   // tasks for contradiction resolution
}
```

The scheduler never exceeds `maxConcurrentTasks` or `maxTokensPerCycle`.

Capacity is always reserved for CONTRADICTION and HUMAN_REQUEST origins.

Budgets prevent runaway agent loops.

---

# Task Selection

When an agent requests work, the scheduler selects from the queue:

1. Only OPEN tasks with no unresolved BLOCKED dependencies.
2. Highest EffectivePriority first.
3. Prefer tasks whose target leaves the agent has previously worked on.
4. Prefer CONTRADICTION-origin tasks when contradictions exist.
5. Never assign a task already IN_PROGRESS.

Agents do not self-select from the queue.

---

# Blocked Task Rescheduling

A BLOCKED task re-enters the queue when its blocker resolves.

Blocked tasks do not decay in priority.

They receive an urgency boost proportional to their wait time.

---

# Queue Pruning

A task is removed from the queue (status: CANCELLED) when:

- A duplicate task with the same trigger and target is already IN_PROGRESS.
- The target leaf has been deleted.
- The originating question has been closed.
- The task's EstimatedCost exceeds remaining budget with no reset scheduled.

Pruning keeps the queue reflecting current knowledge state.

---

# Human Override

Humans may override priority.

Every override requires a written explanation.

Overrides are recorded as auditable events on the task.

Human overrides do not circumvent budget constraints.

---

# Queue Schema

```ts
interface TaskQueueEntry {
  taskId:            string
  computedPriority:  number
  effectivePriority: number
  urgencyModifier:   number
  estimatedCost:     number
  eligibleAt:        Date
  blockedBy:         string[]
  overriddenBy?:     string
}
```

---

# Canonical Rules

1. Every OPEN task is in the queue.
2. Priority is computed, not assigned.
3. Effective priority = computed priority × urgency modifier.
4. Agents do not self-select tasks from the queue.
5. Budget constraints are enforced per scheduling cycle.
6. BLOCKED tasks re-enter the queue with urgency boost when their blocker resolves.
7. Human overrides require written explanation and are auditable.
8. Duplicate tasks are pruned before assignment.
9. The queue reflects the current knowledge state, not a historical backlog.
10. CONTRADICTION-origin tasks are always prioritized over routine maintenance.

---

# Success Criteria

1. Given N open tasks, the Brain can surface the single highest-value task.
2. Priority scores are fully derivable from the knowledge graph — no magic constants.
3. A task blocked today is automatically rescheduled when its blocker is done.
4. Human overrides are visible and reversible.
5. The scheduler never exceeds the configured work budget per cycle.
6. Scheduling decisions are reproducible: same knowledge state → same queue order.
7. Cost estimates improve over time as agent execution data accumulates.
8. The queue shrinks when work is done; it does not grow without bound.
9. Any agent can ask "what should I do next?" and receive an objective answer.
10. The Brain's work prioritization is fully explainable without human judgment.
