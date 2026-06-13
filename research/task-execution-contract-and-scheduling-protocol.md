---
name: task-execution-contract-and-scheduling-protocol
type: research
status: closed
region: Spec
topics:
  - task-execution
  - execution-contract
  - task-selection
  - capability-matching
  - task-scheduling
  - priority-queue
  - urgency-modifier
  - work-budgets
  - RFC-0029
  - RFC-0030
  - RFC-0026
  - RFC-0011
sources:
  - rfcs/RFC-0029-Task-Execution-Protocol.md
  - rfcs/RFC-0030-Task-Scheduling-and-Priority-Queue.md
  - rfcs/RFC-0026-Tasks-and-Questions.md
  - rfcs/RFC-0011-Knowledge-Economics.md
---

# Task Execution Contract and Scheduling Protocol

## The Problem: RFC-0026 Defines Tasks; RFC-0029/RFC-0030 Make Them Work

RFC-0026 defines what a Task is — a unit of future work with schema,
lifecycle states, and closure criteria. But RFC-0026 does not define
how an agent selects, claims, or closes a task, and does not define
how the Brain orders work across a backlog of tasks.

RFC-0029 fills the execution gap. RFC-0030 fills the scheduling gap.
Together they operationalize the task primitive into agent work.

**Source:** RFC-0029 §"Purpose"; RFC-0030 §"Purpose".

## The Execution Contract (RFC-0029)

When an agent claims a task it enters an execution contract. The contract
has exactly four obligations (RFC-0029 §"Execution Contract"):

### Obligation 1: Progress Reporting

The agent must update the task with observable progress at each
meaningful step. "Observable" means another agent or human steward
could read the task and understand where execution stands.

Vague progress updates ("working on it") do not satisfy the contract.
Specific updates ("extracted 3 candidates, awaiting HITL review for
FLAGGED items") do.

### Obligation 2: Produced Leaves

Every artifact created during execution must be linked to the task
via `producedLeaves`. This creates the audit trail that RFC-0022 uses
for impact analysis — if a task's outputs are later invalidated, the
system can trace back to the task that produced them.

### Obligation 3: Closure Verification

Before marking a task DONE, the agent must verify the closure criteria
stated in the task leaf. Closure criteria are set at task creation and
are specific (e.g., "confidence of leaf X exceeds 0.75"). The agent
must not self-report DONE without evaluating whether the criteria are met.

### Obligation 4: Failure Declaration

If execution cannot complete, the agent must record the reason and set
the status to BLOCKED or CANCELLED. Silent abandonment is a protocol
violation: "A task that is claimed but never closed is worse than a task
that was never claimed."

**Source:** RFC-0029 §"Execution Contract" and §"Core Principle".

## Task Selection Protocol

### Priority Formula

Agents select tasks using a prioritized queue. Priority per RFC-0011:

```
Priority = Impact × ConfidenceGap × DependencyCount × RiskReduction
           ÷ EstimatedCost
```

- **Impact** — count of transitively dependent leaves and decisions (RFC-0022)
- **ConfidenceGap** — DesiredConfidence − CurrentConfidence of target belief
- **DependencyCount** — number of direct consumers of the target leaf
- **RiskReduction** — probability completing this task prevents a downstream cascade
- **EstimatedCost** — projected agent effort in token-equivalents

**Source:** RFC-0029 §"Task Selection Protocol"; RFC-0011 §"Priority Formula".

### Capability Matching

Agents declare their capability profile:

```ts
interface AgentCapability {
  agentId: string
  taskTypes: TaskType[]
  domains: string[]
  maxConcurrent: number
}
```

An agent selects the highest-priority OPEN task matching its capability
profile. Claiming a task outside declared capabilities is prohibited.
Capability mismatch produces low-quality output, which creates evaluation
debt (RFC-0005).

**Source:** RFC-0029 §"Capability Matching".

### Exclusive Claim

A task may have at most one active agent at a time. When a claim is
made, the task state transitions to IN_PROGRESS and the claiming agent
ID is recorded. Subsequent claim attempts by other agents are rejected
until the task is released (DONE, CANCELLED, or BLOCKED).

**Source:** RFC-0029 §"Exclusive Claim".

## Task Scheduling and Priority Queue (RFC-0030)

### The Queue vs. the Backlog

RFC-0030 §"The Task Queue" makes a sharp distinction:

- A **backlog** accumulates indefinitely.
- The **queue** is active: stale, duplicate, and superseded tasks are pruned.

The queue is a persistent, ordered list of OPEN tasks sorted by effective
priority. Priorities recompute when the knowledge state changes (e.g., a
belief's confidence changes). The queue is the Brain's current understanding
of what matters most.

**Source:** RFC-0030 §"The Task Queue".

### Urgency Modifier

Urgency is a time-based multiplier:

```
EffectivePriority = Priority × UrgencyModifier
```

Urgency increases as:
- Time since the task was created (age penalty avoidance — prevents tasks
  from lingering in the queue indefinitely)
- External deadline triggers (RFC-0012 Decision Theory deadline signals)

This prevents high-priority but expensive tasks from permanently blocking
lower-priority but urgent tasks.

**Source:** RFC-0030 §"Urgency Modifier".

### Work Budgets

The scheduler operates within per-Brain work budgets:

- Max concurrent agents at any time
- Max token spend per scheduling period
- Reserved budget for HITL review tasks (ensures human review is never
  starved by autonomous agent work)

Budgets prevent runaway autonomous execution. When budget is exhausted,
the queue suspends dispatching new tasks until the next period.

**Source:** RFC-0030 §"Work Budgets".

### Queue Pruning Rules

RFC-0030 §"Queue Pruning" defines when tasks are removed from the queue:

1. **Superseded** — a higher-quality task was created that covers the
   same closure criteria
2. **Orphaned** — the target leaf was merged, deleted, or promoted; the
   task's closure criteria can no longer be met
3. **Stale** — the task has been OPEN longer than the configured TTL
   with no agent activity (default: 30 days)
4. **Duplicate** — an identical closure criteria exists on another OPEN task

Pruned tasks transition to CANCELLED with a recorded reason.

**Source:** RFC-0030 §"Queue Pruning".

## Task Lifecycle Summary

The full task lifecycle integrating RFC-0026, RFC-0029, and RFC-0030:

```
Task created (RFC-0026: origin + closure criteria)
  ↓
Enters queue (RFC-0030: priority computed)
  ↓
Agent claims (RFC-0029: exclusive claim, contract begins)
  ↓
Progress updates (RFC-0029: Obligation 1)
  ↓
Artifacts linked (RFC-0029: Obligation 2 - producedLeaves)
  ↓
Closure verified (RFC-0029: Obligation 3)
  ↓
DONE / BLOCKED / CANCELLED (RFC-0029: Obligation 4 if failed)
  ↓
Queue pruning cycle (RFC-0030: remove stale/superseded)
```

**Source:** RFC-0026 §"Task Lifecycle"; RFC-0029 §"Execution Contract";
RFC-0030 §"Task Queue".

## Canonical Questions This Answers

- *How does an agent know which task to work on next?* — It selects the
  highest-priority OPEN task matching its capability profile, per the
  RFC-0011 priority formula.
- *What is the execution contract?* — Four obligations: progress reporting,
  linking produced leaves, verifying closure criteria, and declaring failure.
- *Can two agents work on the same task simultaneously?* — No; exclusive
  claim ensures at most one active agent per task.
- *What is the difference between a task backlog and the task queue?* —
  A backlog accumulates indefinitely; the queue is actively pruned of
  stale, superseded, and duplicate tasks.
- *What happens when an agent cannot complete a task?* — It must explicitly
  set the status to BLOCKED or CANCELLED with a reason. Silent abandonment
  is a protocol violation.
- *What is the urgency modifier?* — A time-based multiplier on the base
  priority score that prevents tasks from lingering indefinitely in the queue.
- *How are work budgets used?* — They cap concurrent agents and token spend
  per period, with reserved budget ensuring HITL review is never starved.
- *What triggers a task to be removed from the queue?* — Being superseded,
  orphaned, stale (TTL exceeded), or duplicate.
