---
name: seven-step-evolution-loop-primitive-mapping
type: research
status: closed
region: Spec
topics:
  - evolution-loop
  - self-evolution
  - primitive-mapping
  - autonomous-agents
  - knowledge-economics
  - RFC-0008
  - RFC-0011
  - RFC-0017
  - RFC-0026
  - RFC-0029
  - RFC-0030
  - DELPHI-MVP-0003
sources:
  - rfcs/RFC-0008-Agents-and-Research-Engine.md
  - rfcs/RFC-0011-Knowledge-Economics.md
  - rfcs/RFC-0017-Implementation-Roadmap.md
  - rfcs/RFC-0026-Tasks-and-Questions.md
  - rfcs/RFC-0029-Task-Execution-Protocol.md
  - rfcs/RFC-0030-Task-Scheduling-and-Priority-Queue.md
  - rfcs/DELPHI-MVP-0003-Delphi-Builds-Delphi.md
  - rfcs/RFC-0019-Knowledge-Indexes-and-Hierarchical-Summaries.md
  - rfcs/RFC-0028-Knowledge-Regions-and-Index-Lifecycle.md
---

# The Seven-Step Evolution Loop: How It Maps to Delphi Primitives

## Overview

The AGENTS.md manifesto defines evolution as a seven-step process. Each step
is not abstract — it maps to concrete Delphi primitives with specific RFC
backing. This document traces that mapping precisely.

```
1. Understand  →  Navigate indexes (RFC-0007, RFC-0019)
2. Learn       →  Read leaves + evidence (RFC-0002, RFC-0004)
3. Generate    →  Create candidates + questions (RFC-0027, RFC-0026)
4. Execute     →  Claim and execute tasks (RFC-0029)
5. Evaluate    →  Run rubric evaluations (RFC-0005)
6. Incorporate →  Promote candidates to leaves (RFC-0031)
7. Repeat      →  Scheduler re-queues work (RFC-0030)
```

**Source:** AGENTS.md §"What Is Delphi?" and RFC-0017 §"Evolution Loop".

---

## Step 1: Understand — Navigate Indexes

Before an agent reads any content, it navigates the index hierarchy to
understand what exists and where to focus. This is the Navigation-First
principle (RFC-0007).

Navigation path:

```
Brain Index (tier 0)
  → Region Index (tier 1, e.g., "Spec")
    → Topic Index (tier 2, e.g., "Confidence Theory")
      → Leaf (tier 3)
```

The four-tier index hierarchy (RFC-0019) exists specifically to support this
step. Indexes answer "What exists here?" so that agents do not need to read
all leaves to understand the landscape.

Key primitive: **Knowledge Index** (RFC-0019). Indexes are generated summaries,
not canonical storage. They are rebuilt when leaves change.

**Source:** RFC-0007 §"Navigation-First Principle" and RFC-0019 §"Four-Tier Hierarchy".

---

## Step 2: Learn — Read Leaves and Evidence

After navigation identifies relevant leaves, the agent reads them directly.
Each Leaf carries:

- `content`: the belief or knowledge claim
- `confidence`: current reliability score
- `status`: `ACTIVE | STALE | REFUTED | REVIEW_REQUIRED`
- linked Evidence: the provenance records supporting the belief

Evidence records (RFC-0004) tell the agent not just *what* is believed but
*why* — which sources support the belief, how reliable those sources are, and
when the evidence was collected.

This is learning from the Brain's prior experience. Agents do not start from
scratch; they build on existing knowledge with known confidence levels.

**Source:** RFC-0002 §"Leaf Schema" and RFC-0004 §"Evidence Schema".

---

## Step 3: Generate — Create Candidates and Questions

Having understood the existing state, the agent identifies what is missing.
This step produces two outputs:

### New Knowledge Candidates

The agent runs extraction or research, producing Candidates (RFC-0027) — proposed
beliefs, objects, or relationships. Candidates are provisional and enter the
staging pipeline (RFC-0031) before becoming canonical Leaves.

### New Questions

When the agent identifies uncertainty it cannot resolve, it creates `QUESTION`
leaves (RFC-0026). Questions are first-class: they are stored, tracked, linked
to the research agenda, and resolved by future research tasks.

Both Candidates and Questions feed the next execution cycle with new work.

**Source:** RFC-0027 §"Candidate Creation" and RFC-0026 §"Question Schema".

---

## Step 4: Execute — Claim and Run Tasks

The Task system (RFC-0026, RFC-0029) is the execution primitive. Tasks
represent concrete units of work:

| Task type | What it does |
|---|---|
| `RESEARCH` | Investigates questions, generates candidates |
| `EXTRACTION` | Processes assets into candidates |
| `EVALUATION` | Runs rubric scoring on leaves |
| `INDEX_REFRESH` | Regenerates stale region indexes |
| `REVIEW` | Human or agent reviews flagged content |
| `ONTOLOGY` | Proposes ontology extension |

The scheduler (RFC-0030) assigns tasks by priority. Priority is computed from
impact, confidence gap, dependency count, and cost (RFC-0011).

The execution contract (RFC-0029): every claimed task must end in `DONE`,
`BLOCKED`, or `CANCELLED`. Phantom progress is explicitly prevented.

**Source:** RFC-0026 §"Task Types" and RFC-0029 §"Execution Contract".

---

## Step 5: Evaluate — Run Rubric Evaluations

After execution produces new leaves or updates existing ones, the evaluation
subsystem (RFC-0005) scores the output against rubrics.

A Rubric is a structured scoring specification:

```ts
interface Rubric {
  id: string
  name: string
  dimensions: RubricDimension[]   // each with weight and scoring criteria
  passingScore: number             // minimum aggregate score to pass
}
```

Evaluation produces an `Evaluation` record linked to a Leaf, recording:
- Score per dimension
- Overall quality score
- Pass/fail verdict
- Evaluator ID (agent or human)

Leaves that fail evaluation are flagged `REVIEW_REQUIRED`. Their confidence
is reduced. Evaluation debt (insufficient evaluations) generates new `EVALUATION`
tasks, which feed the next cycle.

**Source:** RFC-0005 §"Rubric Schema" and §"Evaluation Record".

---

## Step 6: Incorporate — Promote Candidates to Leaves

Successful candidates that pass entity resolution and (if flagged) human review
are promoted to canonical Leaves (RFC-0031). Incorporation is not just storage:

1. **Leaf creation/update**: The Leaf is written with its full RFC-0002 schema.
2. **Evidence attachment**: At least one Evidence row is created (RFC-0004).
3. **Confidence recalculation**: The RFC-0003 formula runs with the new evidence.
4. **Index staleness**: Affected region indexes are marked stale.
5. **Dependency propagation**: If the leaf is depended upon by other leaves,
   propagation runs (RFC-0022) to update downstream confidence scores.
6. **Task closure**: The producing task is marked `DONE` with the new leaf ID
   in `producedLeaves`.

This step transforms provisional knowledge into canonical Brain state.

**Source:** RFC-0031 §"Promotion Protocol" and RFC-0022 §"Propagation Triggers".

---

## Step 7: Repeat — The Scheduler Re-queues Work

After incorporation, the cycle continues automatically:

- **New stale indexes** → `INDEX_REFRESH` tasks
- **New confidence changes** → potential downstream recalculation tasks
- **New questions generated during research** → new `RESEARCH` tasks
- **Failed evaluations** → `EVALUATION` tasks
- **Flagged candidates** → `REVIEW` tasks

The scheduler (RFC-0030) runs continuously. It processes the priority queue,
dispatches available agents, expires stale claims, and detects new debt. There
is no manual trigger required for the next cycle.

**Source:** RFC-0030 §"Continuous Scheduling" and RFC-0028 §"Regeneration Policy".

---

## How the Loop Runs on This Repository

DELPHI-MVP-0003 describes "Delphi Builds Delphi": this repository's own
specification is a live Brain. The evolution daemon:

1. Reads the RFC files as assets
2. Extracts beliefs from the specification text
3. Generates questions about gaps and open areas
4. Runs research tasks to answer those questions
5. Evaluates the extracted beliefs against quality rubrics
6. Promotes passing candidates to the brain/ JSONL store
7. Regenerates indexes over the updated Spec region
8. Repeats

The `evolution.log.md` file in the repo root records the history of this
self-directed loop. The `pnpm brain:bootstrap` command imports the canonical
brain/ state and rebuilds all derived structures (indexes, maps, embeddings).

**Source:** DELPHI-MVP-0003 §"Self-Hosting Loop" and AGENTS.md §"Delphi In Delphi".

---

## Answers to Open Questions

**Q: What prevents the loop from running indefinitely without converging?**
Two mechanisms: (1) the knowledge economics prioritizer (RFC-0011) drives agents
toward high-impact tasks first; as high-confidence beliefs accumulate, fewer
high-priority research tasks remain. (2) Questions that are answered are marked
`RESOLVED` and removed from the research agenda. Coverage score increases
toward 1.0 as unanswered questions decrease.
**Source:** RFC-0011 §"Convergence" and RFC-0026 §"Question Closure".

**Q: Can the loop run without any human input?**
For knowledge within the Brain's existing sources: yes. For knowledge requiring
new source ingestion (new PDFs, new URLs), a human must provide the Asset.
For FLAGGED candidates requiring HITL review: a human steward must approve or
reject. Beyond those inputs, the loop is fully autonomous.
**Source:** RFC-0000 §"Autonomy Policy" and RFC-0031 §"HITL Protocol".

**Q: What is the relationship between coverage score and loop convergence?**
Coverage score is the primary metric: `coveredLeaves / totalLeaves` where
covered means confidence ≥ threshold and evidence count ≥ minimum. A coverage
score of 1.0 means every belief in the region meets both conditions. The loop
does not stop at 1.0 — new sources may add new beliefs with lower confidence,
re-opening research gaps.
**Source:** RFC-0028 §"Coverage Score Definition".

**Q: Does the loop generate new tasks for itself (meta-evolution)?**
Yes. If the evolution agent identifies that the evolution process itself is
producing poor-quality outputs (low evaluation scores on its own candidates),
it can create `ONTOLOGY` or `REVIEW` tasks targeting the extraction pipeline
or rubric specifications. This is the self-improvement mechanism described in
DELPHI-MVP-0003 §"Meta-Evolution".
**Source:** DELPHI-MVP-0003 §"Meta-Evolution".
