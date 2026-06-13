---
name: dql-query-syntax-and-eight-categories
type: research
status: closed
region: Spec
topics:
  - DQL
  - delphi-query-language
  - query-syntax
  - discovery-queries
  - navigation-queries
  - dependency-queries
  - impact-queries
  - knowledge-debt-queries
  - temporal-queries
  - RFC-0024
sources:
  - rfcs/RFC-0024-Delphi-Query-Language-DQL.md
---

# Delphi Query Language (DQL): Syntax and Eight Query Categories

## What DQL Is

RFC-0024 §"Purpose": DQL is Delphi's universal language for interacting
with knowledge. SQL queries databases; GraphQL queries APIs; DQL queries
Brains.

DQL operates on knowledge primitives — beliefs, evidence, decisions,
tasks, indexes, maps, dependencies — not on raw tables.

DQL targets four audiences: humans, agents, workflows, and Brains
themselves (inter-brain queries).

**Source:** RFC-0024 §"Purpose" and §"Core Principle".

## Design Goals

RFC-0024 §"Design Goals" lists eight goals. DQL must support:

1. **Discovery** — find what exists in a Brain
2. **Navigation** — traverse the index/map hierarchy
3. **Research** — gather evidence about a topic
4. **Reasoning** — evaluate confidence and contradictions
5. **Impact Analysis** — determine what breaks if a belief changes
6. **Evaluation** — assess quality of beliefs and evidence
7. **Decision Analysis** — understand what drove a decision
8. **Knowledge Debt Analysis** — find gaps, unanswered questions, weak evidence

**Source:** RFC-0024 §"Design Goals".

## Human-First Syntax

RFC-0024 §"Human First": DQL resembles natural language. The syntax
uses English-like keywords (SHOW, ABOUT, FOR, START AT, WHAT BREAKS IF)
rather than SQL-style jargon.

**Source:** RFC-0024 §"Human First".

## The Canonical Object Types

DQL operates on:

```
BELIEF   EVIDENCE   QUESTION   DECISION   TASK
EVALUATION   INDEX   MAP   ONTOLOGY   ASSET   WORK
```

**Source:** RFC-0024 §"Canonical Object Types".

## The Eight Query Categories

RFC-0024 §"Query Categories" defines eight categories with example syntax:

### 1. Discovery Queries

Find what exists in the Brain about a topic.

```dql
SHOW beliefs
ABOUT "Roman Empire"

SHOW concepts
RELATED TO "TigerBeetle"
```

### 2. Navigation Queries

Traverse the index/map hierarchy to find where to go next.

```dql
START AT "Roman Empire"
SHOW next topics

SHOW map
FOR "Databases"
```

### 3. Index Queries

Inspect the generated index summaries for a region or topic.

```dql
SHOW index
FOR "Roman Empire"

SHOW child indexes
FOR "History"
```

### 4. Route Queries

Find the knowledge path between two topics.

```dql
SHOW route
FROM "Roman Law"
TO "European Union Law"

SHOW shortest path
FROM "PostgreSQL"
TO "TigerBeetle"
```

### 5. Dependency Queries

Inspect what a belief depends on and what depends on it.

```dql
SHOW dependencies
FOR belief "Gravity"

SHOW consumers
FOR belief "Gravity"
```

### 6. Impact Queries

Determine what would break if a belief were false or degraded.

```dql
WHAT BREAKS IF
belief "TigerBeetle is suitable" = false

SHOW impact
OF confidence change ON "Gravity"
```

### 7. Research Queries

Gather evidence about a topic, including contradictions and open questions.

```dql
SHOW evidence
FOR belief "PostgreSQL scales to millions of rows"

SHOW contradictions
FOR belief "Gravity"

SHOW open questions
ABOUT "TigerBeetle"
```

### 8. Knowledge Debt Queries

Find gaps: beliefs with no evidence, unanswered questions, low-confidence
regions, stale indexes.

```dql
SHOW beliefs
WHERE confidence < 0.40

SHOW questions
WITHOUT answers
IN region "Spec"

SHOW stale indexes
WHERE last_generated > 7 days ago
```

**Source:** RFC-0024 §"Query Categories" and example sections.

## Temporal Queries: A Known Future Extension

RFC-0024 §"Future Extensions" lists temporal queries as a planned
but unspecified extension:

```dql
-- Future (not yet specified)
SHOW beliefs
AS OF "2025-01-01"

SHOW confidence history
FOR belief "TigerBeetle is suitable"
FROM "2024-01-01" TO "2025-01-01"
```

This allows agents to ask what the Brain believed at a specific point
in time. No RFC currently specifies the temporal query model.

**Source:** RFC-0024 §"Future Extensions"; RFC-9999 §"Known Open Areas".

## DQL vs. Direct MCP Tool Calls

RFC-0024 §"Relationship to MCP Interface": DQL is the language; the
MCP tools (RFC-0007) are the interface. The MCP tools (`navigate_index`,
`search`, `get_leaf`, `ask`, `trace_dependencies`, `what_breaks_if`)
implement specific DQL query patterns as structured API calls.

A human or agent may write DQL to be interpreted by the Brain's query
engine, or may call MCP tools directly. The tools are a subset of DQL's
full expressive power.

**Source:** RFC-0024 §"Relationship to MCP Interface".

## Canonical Questions This Answers

- *What is DQL?* — The Delphi Query Language: a natural-language-like
  query language for interacting with Brain knowledge (beliefs, evidence,
  indexes, decisions, tasks, maps, dependencies).
- *What are the eight DQL query categories?* — Discovery, Navigation,
  Index, Route, Dependency, Impact, Research, Knowledge Debt.
- *What does a discovery query look like?* — `SHOW beliefs ABOUT "topic"`.
- *What does an impact query do?* — It asks what would break if a specific
  belief were false. Example: `WHAT BREAKS IF belief "X" = false`.
- *Does DQL support temporal queries?* — Planned but not yet specified.
  RFC-0024 lists it as a future extension. No covering RFC exists yet.
- *How is DQL related to MCP tools?* — The MCP tools implement specific
  DQL query patterns as structured API calls. DQL is the language;
  the MCP interface is the current API surface.
- *Can DQL find knowledge debt?* — Yes. Knowledge Debt queries find beliefs
  with confidence < threshold, unanswered questions, stale indexes, and
  regions with missing evidence.
- *Who can use DQL?* — Humans, agents, workflows, and Brains themselves
  (for inter-brain federation queries).
