---
name: delphi-query-language-dql
type: research
status: closed
region: Spec
topics:
  - dql
  - query-language
  - knowledge-queries
  - navigation
  - impact-analysis
  - federation-queries
  - RFC-0024
sources:
  - rfcs/RFC-0024-Delphi-Query-Language-DQL.md
  - rfcs/RFC-0007-Search-Navigation-and-Knowledge-Discovery.md
  - rfcs/RFC-0022-Dependency-and-Impact-Propagation.md
---

# Delphi Query Language (DQL)

## What DQL Is

DQL is a universal language for interacting with knowledge — designed for humans,
agents, workflows, and Brains to query a Brain consistently and in a human-readable
way. The core distinction from SQL is intentional: "DQL does not query tables. DQL
queries knowledge."

Where SQL operates on rows, DQL operates on Beliefs, Evidence, Decisions,
Evaluations, Tasks, Indexes, Maps, and Dependencies.

**Source:** RFC-0024 §"Purpose" (lines 11–29) and §"Core Principle" (lines 32–50).

## Design Goals

RFC-0024 §"Design Goals" (lines 53–71) defines eight capabilities DQL must support:

1. **Discovery** — find relevant knowledge in a Brain
2. **Navigation** — traverse indexes and maps
3. **Research** — surface open questions and knowledge gaps
4. **Reasoning** — explain beliefs and their evidence chains
5. **Impact Analysis** — compute what breaks if a belief becomes false
6. **Evaluation** — query rubric scores and coverage
7. **Decision Analysis** — retrieve decisions and their rationale
8. **Knowledge Debt Analysis** — query missing evidence, low confidence, and navigation gaps

## Human-First Syntax

DQL is designed to resemble natural language rather than programming syntax.
The canonical example:

```sql
SHOW beliefs
ABOUT TigerBeetle
```

This readability requirement ensures that domain experts without programming
backgrounds can interact with a Brain directly.

**Source:** RFC-0024 §"Human First" (lines 73–83).

## Canonical Object Types

RFC-0024 §"Canonical Object Types" (lines 85–110) defines the eleven objects
DQL can operate on:

`BELIEF`, `EVIDENCE`, `QUESTION`, `DECISION`, `TASK`, `EVALUATION`, `INDEX`,
`MAP`, `ONTOLOGY`, `ASSET`, `WORK`

These map directly to the Delphi Meta Model primitives from RFC-0001.

## Eight Query Categories with Examples

### 1. Discovery
```sql
SHOW beliefs ABOUT "Roman Empire"
SHOW concepts RELATED TO "TigerBeetle"
```

### 2. Navigation
```sql
START AT "Roman Empire"
SHOW next topics

SHOW map FOR "Databases"
```

### 3. Index Queries
```sql
SHOW index FOR "Roman Empire"
SHOW child indexes FOR "History"
```

### 4. Route / Path Queries
```sql
SHOW route FROM "Roman Law" TO "European Union Law"
SHOW shortest path FROM "PostgreSQL" TO "TigerBeetle"
```

### 5. Dependency Queries
```sql
SHOW dependencies FOR belief "Gravity"
SHOW consumers FOR belief "Gravity"
```

### 6. Impact Queries
```sql
WHAT BREAKS IF belief "Gravity" BECOMES FALSE
SHOW affected decisions FOR belief "TigerBeetle Reliability"
```

### 7. Confidence and Contradiction Queries
```sql
SHOW beliefs WHERE confidence < 0.60
SHOW weakest beliefs ORDER BY impact DESC
SHOW contradictions FOR "Minimum Wage"
SHOW competing theories FOR "Roman Empire Collapse"
```

### 8. Knowledge Debt Queries
```sql
SHOW highest knowledge debt
SHOW navigation debt
```

**Source:** RFC-0024 §"Discovery Queries" through §"Knowledge Debt Queries" (lines 127–370).

## Research and Decision Queries

Research planning is native to DQL:

```sql
SHOW open questions FOR domain "Databases"
WHAT SHOULD WE LEARN NEXT?
```

Decision traceability is also a first-class operation:

```sql
SHOW decisions AFFECTED BY belief "Gravity"
WHY WAS decision "Use PostgreSQL" MADE?
```

**Source:** RFC-0024 §"Research Queries" (lines 336–352) and §"Decision Queries" (lines 394–413).

## Knowledge-Native Operations

DQL replaces SQL's CRUD model with knowledge-native verbs:

| DQL Verb | Purpose |
|----------|---------|
| `SHOW` | Retrieve beliefs, evidence, indexes, maps, decisions |
| `EXPLAIN` | Return evidence, confidence, dependencies, contradictions for a belief |
| `COMPARE` | Compare competing theories or approaches |
| `NAVIGATE` | Traverse the index hierarchy |
| `TRACE` | Follow lineage through the evidence chain |
| `IMPACT` | Compute downstream effects of a belief change |
| `LEARN` | Return a Knowledge Map for a learning path |
| `EVALUATE` | Surface rubric scores and coverage gaps |
| `DISCOVER` | Find related concepts |

**Source:** RFC-0024 §"Knowledge Native Operations" (lines 567–598).

## EXPLAIN Query

The `EXPLAIN` verb returns a full breakdown of a single belief:

```sql
EXPLAIN belief "Roman Economic Decline"
```

Returns: Evidence, Confidence, Dependencies, Contradictions. This is the primary
tool for understanding *why* a Brain holds a particular belief.

**Source:** RFC-0024 §"Explain Queries" (lines 600–619).

## Query Execution Model

A DQL query follows the same navigation-first path as the Delphi retrieval model:

```
Question
  ↓ DQL Parser
  ↓ Planner (chooses indexes, maps; estimates context cost; optimizes traversal)
  ↓ Index Traversal
  ↓ Map Traversal
  ↓ Leaf Retrieval
  ↓ Evidence Retrieval
  ↓ Result
```

**Source:** RFC-0024 §"Query Execution Model" (lines 495–512) and §"Query Planner" (lines 514–527).

## Context Cost Estimation

Every DQL query should estimate and expose its context cost in tokens. This
allows agents and callers to make informed decisions about query scope before
execution. Example: `SHOW beliefs ABOUT "Roman Empire"` — Estimated: 2,000 tokens.

**Source:** RFC-0024 §"Context Awareness" (lines 529–545).

## DQL Result Model

```ts
interface DQLResult {
  query: string
  summary: string
  confidence: number
  contextCost: number
  results: unknown[]
}
```

Results always include a summary and a confidence score, not just raw data.

**Source:** RFC-0024 §"Query Result Model" (lines 548–563).

## Federation Queries

DQL can cross brain boundaries:

```sql
SEARCH all brains FOR "Roman Law"
SHOW route FROM brain "History" TO brain "Law"
```

Federation is queryable through the same language — no separate federation DSL.

**Source:** RFC-0024 §"Federation Queries" (lines 471–493).

## Future Extensions

RFC-0024 §"Future Extensions" (lines 675–687) identifies planned but deferred
query types: Temporal Queries, Probabilistic Queries, Simulation Queries,
Multi-Brain Queries.

## Ten Canonical Rules

RFC-0024 §"Canonical Rules" (lines 689–701):

1. DQL queries knowledge, not storage.
2. Navigation precedes retrieval.
3. Indexes should be used first.
4. Maps should guide traversal.
5. Context cost should be visible.
6. Impact analysis should be native.
7. Knowledge debt should be queryable.
8. Decisions should be explainable.
9. Federation should be queryable.
10. Queries should remain human-readable.
