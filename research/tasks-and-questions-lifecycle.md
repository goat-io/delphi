---
name: tasks-and-questions-lifecycle
type: research
status: closed
region: Spec
topics:
  - tasks
  - questions
  - lifecycle
  - uncertainty
  - RFC-0026
sources:
  - rfcs/RFC-0026-Tasks-and-Questions.md
  - rfcs/RFC-0003-Knowledge-and-Confidence-Theory.md
  - rfcs/RFC-0011-Knowledge-Economics.md
---

# Tasks and Questions: How Uncertainty Becomes Work in Delphi

## Core Principle

Tasks exist to reduce uncertainty. Questions represent uncertainty. Every task
must answer: *What uncertainty do I reduce?* A task without a traceable purpose
is noise and violates RFC-0026's core principle.

**Source:** RFC-0026 §"Core Principle" (lines 39–51).

## Tasks Are Leaves

Tasks are first-class leaves with `LeafKind: TASK`. This means they are stored,
versioned, linked to other leaves, and participate in the dependency graph like
any other knowledge object.

**Source:** RFC-0026 §"Task" (lines 54–62).

## Task Schema

```ts
interface Task {
  id: string
  title: string
  description: string
  taskType:
    | "RESEARCH" | "REVIEW" | "EXTRACTION" | "INDEX_REFRESH"
    | "EVALUATION" | "ONTOLOGY" | "MIGRATION" | "IMPLEMENTATION"
  status: "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED"
  priority: number           // computed, not guessed
  origin: TaskOrigin         // required — no origin = invalid task
  assignee?: AgentRef
  resolvesQuestions: string[]
  targetLeaves: string[]
  closureCriteria: string    // objective, verifiable
  producedLeaves: string[]   // audit trail
}
```

**Source:** RFC-0026 §"Task Schema" (lines 65–107).

## Task Origin: Every Task Must Explain Why It Exists

```ts
interface TaskOrigin {
  trigger:
    | "KNOWLEDGE_DEBT" | "EVIDENCE_DEBT" | "EVALUATION_DEBT"
    | "ONTOLOGY_DEBT" | "NAVIGATION_DEBT" | "CONTRADICTION"
    | "CONFIDENCE_DROP" | "STALENESS" | "DEPENDENCY_CHANGE"
    | "HUMAN_REQUEST"
  sourceLeafId?: string
  explanation: string
}
```

Tasks without an origin are **invalid**. The `sourceLeafId` links the task to
the leaf that generated it, preserving a traceable audit path from knowledge
debt to work item.

**Source:** RFC-0026 §"Task Origin" (lines 110–135).

## Task Lifecycle

```
Created → Prioritized → Assigned → In Progress → Done → Verified
                                              ↘ Blocked → Cancelled
```

A task is **DONE** when its `closureCriteria` are objectively met. Examples:
- Research Task → evidence leaves created and linked
- Index Refresh Task → index regenerated, staleness cleared
- Ontology Task → proposal created or migration executed

`producedLeaves` records what the task created, making all work auditable.

**Source:** RFC-0026 §"Task Lifecycle" (lines 138–153) and
§"Closure Rules" (lines 155–171).

## Priority Is Computed

Priority is not manually guessed. Per RFC-0011 (Knowledge Economics):

```
Priority = Impact × Confidence Gap × Dependency Count × Risk Reduction
           ÷ Estimated Cost
```

Humans may override computed priority, but overrides require an explanation.
This keeps the priority system honest and auditable.

**Source:** RFC-0026 §"Priority" (lines 173–191).

## Questions Are First-Class Leaves

Questions are leaves with `LeafKind: QUESTION`. They represent tracked,
explicit uncertainty — the system knows what it does not know.

```ts
interface Question {
  id: string
  title: string
  statement: string
  status: "OPEN" | "IN_RESEARCH" | "ANSWERED" | "PARTIALLY_ANSWERED" | "OBSOLETE"
  desiredConfidence: number    // target confidence threshold
  currentConfidence?: number
  answeredBy: string[]         // leaf IDs of answering beliefs
  relatedLeaves: string[]
  spawnedBy?: string           // ID of leaf that created this question
}
```

**Source:** RFC-0026 §"Question Schema" (lines 202–233).

## Question Lifecycle

```
Asked → Prioritized → Researched → Answered → Closed
                                ↘ Obsolete
```

A question is **ANSWERED** when a belief exists whose confidence meets
`desiredConfidence`. A question becomes **OBSOLETE** when the underlying
uncertainty no longer matters to the Brain.

An open question without a task is *research debt* (RFC-0026 §"Questions
Generate Tasks", lines 255–268).

**Source:** RFC-0026 §"Question Lifecycle" (lines 235–253).

## Automatic Task Generation

The system automatically creates tasks from knowledge state changes
(RFC-0026 §"Automatic Task Generation", lines 275–300):

| Trigger | Task Type Created |
|---|---|
| Confidence drops below threshold | RESEARCH |
| Contradiction appears | REVIEW |
| Evidence becomes stale | RESEARCH |
| Ontology gap detected | ONTOLOGY |
| Index staleness exceeds tolerance | INDEX_REFRESH |
| Dependency changes | REVIEW on consumers |
| Decision loses supporting belief | REVIEW on decision |

## Deduplication

Before creating any task, the system checks for an existing open task with the
same trigger and target leaf. Duplicate tasks are waste per RFC-0011 Knowledge
Economics. Deduplication is mandatory, not optional.

**Source:** RFC-0026 §"Deduplication" (lines 302–309).

## The Uncertainty Reduction Loop

The full loop (RFC-0026 §"Questions Generate Tasks", lines 255–268):

```
Open Question
→ Research Task created
→ Task assigned to Agent
→ Agent produces Evidence
→ Evidence supports Belief
→ Belief confidence meets desiredConfidence
→ Question status = ANSWERED
→ Question closed
```

This loop is the mechanism by which the Brain's knowledge debt is paid down
over time.

## Canonical Questions This Answers

- *What is a task in Delphi?* — A first-class leaf (`LeafKind: TASK`) with a
  required origin, computed priority, objective closure criteria, and an audit
  trail of what it produced.
- *How is task priority determined?* — Computed formula: Impact × Confidence
  Gap × Dependency Count × Risk Reduction ÷ Estimated Cost (RFC-0011).
- *What is an open question in Delphi?* — A leaf representing tracked
  uncertainty, with a target confidence threshold. Answered when a belief
  reaches that threshold.
- *What is research debt?* — An open question with no associated task.
- *How are tasks deduplicated?* — Before creation, the system checks for an
  existing open task with the same trigger and target.
- *Can tasks be created manually?* — Yes, via trigger `HUMAN_REQUEST`; all
  other triggers are automatic from knowledge state changes.
