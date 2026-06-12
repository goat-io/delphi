# RFC-0029 — Task Execution Protocol
## How Agents Claim, Execute, and Close Tasks

Status: Draft

Depends On:
- RFC-0026 Tasks & Questions
- RFC-0008 Agents & Research Engine
- RFC-0011 Knowledge Economics
- RFC-0022 Dependency & Impact Propagation

---

# Purpose

RFC-0026 defines what a Task is.

A Task is a unit of future work.

RFC-0026 specifies schema, lifecycle states, and closure criteria.

It does not specify:

- How an agent selects a task.
- What contract an agent accepts when it claims a task.
- How progress is reported during execution.
- How closure is verified and recorded.
- What happens when execution fails.

This RFC defines the execution protocol:

The bridge between a Task as a knowledge primitive
and
a Task as a unit of agent work.

---

# Core Principle

A task that is claimed but never closed is worse than a task that was never claimed.

Partial execution without closure creates phantom progress.

Every claim must end in one of:

- DONE (closure criteria met)
- CANCELLED (explicitly abandoned)
- BLOCKED (stalled, returned to queue)

Agents must never abandon tasks silently.

---

# Execution Contract

When an agent claims a task, it enters an execution contract.

The contract has four obligations:

1. Progress Reporting
   The agent must update the task with observable progress
   at each meaningful step.

2. Produced Leaves
   Every artifact created during execution must be linked
   to the task via `producedLeaves`.

3. Closure Verification
   Before marking a task DONE, the agent must verify
   the closure criteria are satisfied.

4. Failure Declaration
   If execution cannot complete, the agent must record
   the reason and set the appropriate status.

An agent that accepts a task and disappears
has violated the execution contract.

---

# Task Selection Protocol

## Selection Order

Agents select tasks using a prioritized queue.

Priority is computed per RFC-0011:

```
Priority = Impact × Confidence Gap × Dependency Count × Risk Reduction
           ÷ Estimated Cost
```

Agents do not choose tasks arbitrarily.

Agents select the highest-priority OPEN task
matching their capability profile.

## Capability Matching

```ts
interface AgentCapability {
  agentId: string
  taskTypes: TaskType[]
  domains: string[]
  maxConcurrent: number
}
```

An agent must not claim a task outside its declared capabilities.

Capability mismatch produces low-quality output.

Low-quality output creates evaluation debt (RFC-0005).

## Exclusive Claim

A task may have at most one active agent at a time.

When an agent claims a task:

- Status transitions: OPEN → IN_PROGRESS
- `assignee` is set to the claiming agent's `AgentRef`
- `claimedAt` timestamp is recorded

No other agent may claim the task while it is IN_PROGRESS.

---

# Execution Lifecycle

```
OPEN
  ↓ (agent selects, capability matches)
IN_PROGRESS
  ↓ (agent works, reports progress, creates leaves)
  ├── DONE      (closure criteria verified)
  ├── BLOCKED   (dependency not available)
  └── CANCELLED (explicitly abandoned)
```

DONE and CANCELLED are terminal.

BLOCKED returns the task to a visible queue.

A BLOCKED task retains its `assignee` for context.

A new agent may claim a BLOCKED task.

---

# Progress Reporting

Agents must record progress as the task proceeds.

```ts
interface TaskProgressRecord {
  timestamp: string
  agentId: string
  step: string
  leavesCreated: string[]
  note?: string
}
```

Progress records are append-only.

Progress records are NOT canonical knowledge.

Progress records are execution metadata.

---

# Produced Leaves

Every leaf created during task execution must be linked.

```ts
// On the Task:
producedLeaves: string[]   // leaf IDs created or updated

// On each produced Leaf:
evidence: Evidence[]       // must include a reference to the task
```

A task that claims DONE with empty `producedLeaves`
must provide an explicit explanation.

Some tasks produce no new leaves.

Example: An INDEX_REFRESH task updates an existing index
but may not create a new leaf.

In this case, the task must record:

```ts
noProducedLeavesReason: string
```

---

# Closure Verification

Before setting status to DONE, the agent must verify
each clause in `closureCriteria`.

Closure criteria are defined when the task is created (RFC-0026).

```ts
interface ClosureVerification {
  criterion: string
  verified: boolean
  evidence: string   // leaf ID or explanation
}

// Added to Task on closure:
closureVerifications: ClosureVerification[]
```

If any criterion cannot be verified:

- The task must not be marked DONE.
- The task should be marked BLOCKED with an explanation.

Unverified closure is a knowledge integrity violation.

---

# Failure Handling

Agents fail.

Failures must be declared explicitly.

```ts
interface ExecutionFailure {
  agentId: string
  reason: string
  blockedOnLeafId?: string
  blockedOnTaskId?: string
  attemptedAt: string
}
```

## Failure Outcomes

### BLOCKED

The agent cannot proceed due to a missing dependency.

The blocking dependency must be named.

The task returns to the queue.

A new RESEARCH or REVIEW task may be automatically created
to resolve the blocking dependency.

### CANCELLED

The agent determines the task is no longer valid.

Reasons:

- The underlying question was answered another way.
- The target leaf was deleted.
- The task duplicates another (RFC-0026 deduplication rule).

Cancellation must be explained.

Cancellation must reference the superseding task or leaf if applicable.

---

# Timeout and Abandonment

A task that is IN_PROGRESS with no progress record
for longer than its `maxExecutionDuration`
is considered abandoned.

Abandoned tasks:

- Return to OPEN status.
- Clear `assignee`.
- Record the abandonment with timestamp.

A task that is abandoned twice without progress
triggers a REVIEW task on the task definition itself.

The task definition may be poorly specified.

---

# Canonical Rules

1. Every claimed task must end in DONE, BLOCKED, or CANCELLED.
2. Agents must not claim tasks outside their capabilities.
3. At most one agent may hold a task at a time.
4. Progress is reported at each meaningful step.
5. All produced leaves are linked to the task.
6. Closure criteria must be verified before marking DONE.
7. Failures are declared with named reasons.
8. Abandoned tasks return to OPEN automatically.
9. Twice-abandoned tasks trigger self-review.
10. Silent abandonment is a protocol violation.

---

# Success Criteria

1. Every IN_PROGRESS task has a declared assignee.
2. Every DONE task has verified closure criteria.
3. Every DONE task records what it produced.
4. Every BLOCKED task names its blocking dependency.
5. Every CANCELLED task explains why.
6. Abandoned tasks are detected and recovered within one cycle.
7. No task remains IN_PROGRESS without progress records.
8. The Brain can answer: "What is every agent working on right now?"
9. The Brain can answer: "What did task X produce?"
10. The Brain can answer: "Why did task X fail?"
