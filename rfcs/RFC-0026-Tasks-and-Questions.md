# RFC-0026 — Tasks & Questions
## How Uncertainty Becomes Work

Status: Draft

Depends On:
- RFC-0000 through RFC-0025

---

# Purpose

Task is a fundamental primitive (RFC-0001).

Questions are first-class leaves (RFC-0008).

Yet neither had a schema or a dedicated specification.

Nearly every RFC creates tasks:

- Knowledge debt creates tasks (RFC-0003)
- Missing evidence creates tasks (RFC-0004)
- Evaluation debt creates tasks (RFC-0005)
- Ontology gaps create tasks (RFC-0006)
- Search debt creates tasks (RFC-0007)
- Dependency changes create tasks (RFC-0022)

This RFC defines:

- Task Schema
- Task Lifecycle
- Question Schema
- Question Lifecycle
- Automatic Task Generation
- Task Closure Rules

---

# Core Principle

Tasks exist to reduce uncertainty.

Questions represent uncertainty.

A task without a purpose is noise.

Every task should answer:

What uncertainty do I reduce?

---

# Task

A Task is a unit of future work.

Tasks are leaves.

LeafKind:

TASK

---

# Task Schema

```ts
interface Task {
  id: string

  title: string

  description: string

  taskType:
    | "RESEARCH"
    | "REVIEW"
    | "EXTRACTION"
    | "INDEX_REFRESH"
    | "EVALUATION"
    | "ONTOLOGY"
    | "MIGRATION"
    | "IMPLEMENTATION"

  status:
    | "OPEN"
    | "IN_PROGRESS"
    | "BLOCKED"
    | "DONE"
    | "CANCELLED"

  priority: number

  origin: TaskOrigin

  assignee?: AgentRef

  resolvesQuestions: string[]

  targetLeaves: string[]

  closureCriteria: string

  producedLeaves: string[]
}
```

---

# Task Origin

Every task must explain why it exists.

```ts
interface TaskOrigin {
  trigger:
    | "KNOWLEDGE_DEBT"
    | "EVIDENCE_DEBT"
    | "EVALUATION_DEBT"
    | "ONTOLOGY_DEBT"
    | "NAVIGATION_DEBT"
    | "CONTRADICTION"
    | "CONFIDENCE_DROP"
    | "STALENESS"
    | "DEPENDENCY_CHANGE"
    | "HUMAN_REQUEST"

  sourceLeafId?: string

  explanation: string
}
```

Tasks without origin are invalid.

---

# Task Lifecycle

Created
→ Prioritized
→ Assigned
→ In Progress
→ Done
→ Verified

or

→ Blocked
→ Cancelled

---

# Closure Rules

A task is DONE when its closure criteria are met.

Examples:

Research Task
→ Evidence leaves created and linked

Index Refresh Task
→ Index regenerated, staleness cleared

Ontology Task
→ Proposal created or migration executed

A task should record what it produced.

producedLeaves makes work auditable.

---

# Priority

Priority is computed, not guessed.

Per RFC-0011:

Priority
=
Impact × Confidence Gap × Dependency Count × Risk Reduction
÷
Estimated Cost

Humans may override priority.

Overrides require an explanation.

---

# Question

A Question is explicit, tracked uncertainty.

Questions are leaves.

LeafKind:

QUESTION

---

# Question Schema

```ts
interface Question {
  id: string

  title: string

  statement: string

  status:
    | "OPEN"
    | "IN_RESEARCH"
    | "ANSWERED"
    | "PARTIALLY_ANSWERED"
    | "OBSOLETE"

  desiredConfidence: number

  currentConfidence?: number

  answeredBy: string[]

  relatedLeaves: string[]

  spawnedBy?: string
}
```

---

# Question Lifecycle

Asked
→ Prioritized
→ Researched
→ Answered
→ Closed

or

→ Obsolete

A question is ANSWERED when a belief exists whose confidence
meets desiredConfidence.

A question becomes OBSOLETE when the uncertainty no longer matters.

---

# Questions Generate Tasks

Question
↓
Research Task
↓
Evidence
↓
Belief
↓
Question Closed

Every open question should eventually have a task.

An open question without a task is research debt.

---

# Automatic Task Generation

Consolidated triggers (from RFC-0003, RFC-0008, RFC-0022):

Confidence drops below threshold
→ RESEARCH task

Contradiction appears
→ REVIEW task

Evidence becomes stale
→ RESEARCH task

Ontology gap detected
→ ONTOLOGY task

Index staleness exceeds tolerance
→ INDEX_REFRESH task

Dependency changes
→ REVIEW task on consumers

Decision loses supporting belief
→ REVIEW task on decision

---

# Deduplication

Before creating a task:

Check for an existing open task
with the same trigger and target.

Duplicate tasks are waste (RFC-0011).

---

# Canonical Questions

Why does this task exist?

What uncertainty does it reduce?

What question does it answer?

What did it produce?

What happens if it is never done?

---

# Canonical Rules

1. Tasks are leaves.
2. Questions are leaves.
3. Every task has an origin.
4. Every task has closure criteria.
5. Tasks record what they produced.
6. Priority is computed.
7. Open questions generate tasks.
8. Duplicate tasks are prevented.
9. Task completion is auditable.
10. Tasks exist to reduce uncertainty.

---

# Success Criteria

1. Every task explains why it exists.
2. Every task can be closed objectively.
3. Questions track their own confidence targets.
4. Answered questions link to answering beliefs.
5. Automatic triggers create tasks.
6. Duplicates are detected.
7. Priorities are explainable.
8. Work output is traceable.
9. Research debt is visible as open questions without tasks.
10. The Brain can answer: "What work matters most right now?"
