---
name: agent-task-execution-contract
type: research
status: closed
region: Spec
topics:
  - task-execution
  - agent-contract
  - task-selection
  - capability-matching
  - task-lifecycle
  - RFC-0029
  - RFC-0030
  - RFC-0026
  - RFC-0011
sources:
  - rfcs/RFC-0029-Task-Execution-Protocol.md
  - rfcs/RFC-0030-Task-Scheduling-and-Priority-Queue.md
  - rfcs/RFC-0026-Tasks-and-Questions.md
  - rfcs/RFC-0011-Knowledge-Economics.md
  - rfcs/RFC-0008-Agents-and-Research-Engine.md
---

# Agent Task Execution Contract

## Why the Execution Contract Exists

RFC-0026 defines what a Task is and its schema. It does not define how an agent
interacts with a Task at runtime. RFC-0029 fills that gap by specifying the
execution contract: the obligations an agent accepts when it claims a task, and
the protocol it must follow from claim to closure.

The core concern: a task that is claimed but never closed creates *phantom
progress* — the queue believes work is happening while nothing is being
produced. RFC-0029 prevents this.

**Source:** RFC-0029 §"Purpose" and §"Core Principle".

---

## Task Selection: Priority-Ordered, Capability-Gated

Agents do not pick tasks arbitrarily. They select the highest-priority OPEN
task that matches their declared capability profile.

Priority is computed per RFC-0011's economics formula:

```
Priority = (Impact × ConfidenceGap × DependencyCount × RiskReduction)
           ÷ EstimatedCost
```

Where:
- `Impact`: how many dependent leaves/decisions would benefit
- `ConfidenceGap`: `1.0 - currentConfidence` of the target leaf
- `DependencyCount`: number of leaves blocked by this task
- `RiskReduction`: how much uncertainty is reduced on completion
- `EstimatedCost`: estimated tokens / compute / time

**Source:** RFC-0011 §"Priority Formula" and RFC-0029 §"Task Selection Protocol".

### Capability Matching

Before claiming, an agent checks its capability profile:

```ts
interface AgentCapability {
  agentId: string
  taskTypes: TaskType[]   // ["RESEARCH", "EXTRACTION", ...]
  domains: string[]        // ontology domain tags
  maxConcurrent: number    // how many tasks the agent can hold at once
}
```

An agent must not claim tasks outside its `taskTypes` or `domains`. The
consequence is explicit: capability mismatch produces low-quality output, which
creates Evaluation Debt (RFC-0005).

**Source:** RFC-0029 §"Capability Matching" and RFC-0005 §"Evaluation Debt".

---

## The Exclusive Claim

A task may have at most one active agent at a time. When an agent claims a task:

1. Task `status` transitions `OPEN → IN_PROGRESS`.
2. Task `assignee` is set to the agent's ID.
3. A `claimExpiresAt` timestamp is set (MVP default: 30 minutes).
4. The task enters the agent's responsibility until closure.

If `claimExpiresAt` elapses without a progress update, the scheduler returns
the task to `OPEN` and records a claim expiry event. The agent that held the
claim is deregistered from the task.

**Source:** RFC-0029 §"Exclusive Claim" and RFC-0030 §"Claim Expiry".

---

## The Four Execution Obligations

When an agent claims a task, it accepts four obligations:

### 1. Progress Reporting

The agent must update the task record at each meaningful execution step. Progress
updates prevent the scheduler from expiring the claim. A task with no updates
for more than `claimExpiresAt` is assumed stalled.

### 2. Produced Leaves

Every artifact — every Leaf or Evidence row — created during execution must be
linked to the task via `producedLeaves`. This creates the traceability chain:
Task → Leaves → Evidence. Without this link, the Brain cannot determine what
work produced which knowledge.

### 3. Closure Verification

Before marking a task `DONE`, the agent must verify the `closureCriteria` field
is satisfied. Closure criteria are written in natural language at task creation
time. The agent asserts satisfaction; the evaluation subsystem (RFC-0005) may
audit the claim.

### 4. Failure Declaration

If execution cannot complete, the agent must:
- Set `status` to `BLOCKED` or `CANCELLED`
- Record the reason in `blockingReason`
- Optionally create a new task for the blocker

An agent that accepts a task and disappears without updating it has violated the
contract. The scheduler detects this via claim expiry and treats it as a
`BLOCKED` transition.

**Source:** RFC-0029 §"Execution Contract" (four obligations).

---

## Task Status Lifecycle

```
OPEN
  ↓ (agent claims)
IN_PROGRESS
  ↓ (closure criteria met)        ↓ (cannot proceed)     ↓ (claim expires)
DONE                           BLOCKED                 (returns to OPEN)
  ↓ (explicit stop)
CANCELLED
```

A task in `BLOCKED` state remains visible in the queue as non-claimable. A new
resolution task may be created for the blocker. When the blocker resolves, the
original task may return to `OPEN`.

**Source:** RFC-0026 §"Task Lifecycle" and RFC-0029 §"Failure Handling".

---

## Task Scheduling and the Priority Queue (RFC-0030)

RFC-0030 specifies the scheduler's runtime behavior. Key properties:

### Continuous Scheduling

The scheduler runs continuously, not in discrete batches. As tasks complete,
new tasks appear (from debt detection, dependency propagation, or explicit
creation), and the priority queue rebalances.

### Budget Limits

Each scheduling cycle has a budget:
- Maximum tasks to dispatch per cycle
- Maximum parallel tasks across all agents
- Domain-specific concurrency limits (prevents a single region from monopolizing)

**Source:** RFC-0030 §"Scheduling Cycle" and §"Budget Limits".

### Starvation Prevention

Low-priority tasks that remain OPEN for too long receive a priority boost. This
prevents high-priority research from starving maintenance tasks (index refresh,
evaluation) indefinitely.

**Source:** RFC-0030 §"Starvation Prevention".

---

## Automatic Task Generation: Who Creates Tasks

Tasks are created automatically in seven scenarios:

| Trigger | Source RFC | Example |
|---|---|---|
| `KNOWLEDGE_DEBT` | RFC-0003 | Belief confidence < threshold |
| `EVIDENCE_DEBT` | RFC-0004 | Leaf has no supporting evidence |
| `EVALUATION_DEBT` | RFC-0005 | Leaf evaluation is stale or missing |
| `ONTOLOGY_DEBT` | RFC-0006 | Concept lacks ontology classification |
| `NAVIGATION_DEBT` | RFC-0007 | Region lacks a current index |
| `DEPENDENCY_CHANGE` | RFC-0022 | Supporting belief confidence dropped |
| `CONFIDENCE_DROP` | RFC-0003 | Confidence fell below configured threshold |

**Source:** RFC-0026 §"Automatic Task Generation" and RFC-0022
§"Research Triggering".

---

## Answers to Open Questions

**Q: Can the same task be assigned to multiple agents simultaneously?**
No. The exclusive claim (RFC-0029 §"Exclusive Claim") ensures at most one
active agent per task. The only concurrency is between *different* tasks.

**Q: What happens if an agent produces leaves but then gets cancelled?**
Produced Leaves remain in the Brain — they are not rolled back on task
cancellation. The task is marked `CANCELLED`, but the knowledge produced is
retained. If the leaves are incorrect, an `EVALUATION` task should be created
to review them.
**Source:** RFC-0029 §"Cancellation Semantics".

**Q: How does the scheduler know when to create INDEX_REFRESH tasks?**
The indexer marks a region's index as stale when any of its leaves change
(confidence, content, new relationship). The scheduler polls stale-index state
and creates `INDEX_REFRESH` tasks per RFC-0028's regeneration policy.
**Source:** RFC-0028 §"Staleness Detection" and RFC-0030 §"Index Refresh Scheduling".

**Q: Can a task be split into sub-tasks?**
RFC-0029 permits an agent to create child tasks via `parentTaskId`. The parent
task remains `IN_PROGRESS` until all child tasks reach terminal states. This
allows complex research to decompose into parallel workstreams.
**Source:** RFC-0029 §"Sub-task Decomposition".
