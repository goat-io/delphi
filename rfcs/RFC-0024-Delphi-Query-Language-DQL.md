# RFC-0024 — Delphi Query Language (DQL)
## A Universal Language For Knowledge, Understanding and Reasoning

Status: Draft

Depends On:
- RFC-0000 through RFC-0023

---

# Purpose

Delphi requires a universal language that allows:

Humans

Agents

Workflows

Brains

to interact with knowledge consistently.

SQL queries databases.

GraphQL queries APIs.

DQL queries Brains.

---

# Core Principle

DQL does not query tables.

DQL queries knowledge.

DQL operates on:

- Beliefs
- Evidence
- Decisions
- Evaluations
- Tasks
- Indexes
- Maps
- Dependencies

---

# Design Goals

DQL must support:

Discovery

Navigation

Research

Reasoning

Impact Analysis

Evaluation

Decision Analysis

Knowledge Debt Analysis

---

# Human First

DQL should resemble natural language.

Example:

SHOW beliefs
ABOUT TigerBeetle

---

# Canonical Object Types

DQL operates on:

BELIEF

EVIDENCE

QUESTION

DECISION

TASK

EVALUATION

INDEX

MAP

ONTOLOGY

ASSET

WORK

---

# Query Categories

1. Discovery
2. Navigation
3. Dependency
4. Research
5. Evaluation
6. Decision
7. Impact
8. Knowledge Debt

---

# Discovery Queries

Example:

```sql
SHOW beliefs
ABOUT "Roman Empire"
```

---

Example:

```sql
SHOW concepts
RELATED TO "TigerBeetle"
```

---

# Navigation Queries

Example:

```sql
START AT "Roman Empire"

SHOW next topics
```

---

Example:

```sql
SHOW map
FOR "Databases"
```

---

# Index Queries

Example:

```sql
SHOW index
FOR "Roman Empire"
```

---

Example:

```sql
SHOW child indexes
FOR "History"
```

---

# Route Queries

Example:

```sql
SHOW route

FROM "Roman Law"

TO "European Union Law"
```

---

Example:

```sql
SHOW shortest path

FROM "PostgreSQL"

TO "TigerBeetle"
```

---

# Dependency Queries

Example:

```sql
SHOW dependencies
FOR belief "Gravity"
```

---

Example:

```sql
SHOW consumers
FOR belief "Gravity"
```

---

# Impact Queries

Example:

```sql
WHAT BREAKS IF

belief "Gravity"

BECOMES FALSE
```

---

Example:

```sql
SHOW affected decisions

FOR belief "TigerBeetle Reliability"
```

---

# Confidence Queries

Example:

```sql
SHOW beliefs

WHERE confidence < 0.60
```

---

Example:

```sql
SHOW weakest beliefs

ORDER BY impact DESC
```

---

# Contradiction Queries

Example:

```sql
SHOW contradictions

FOR "Minimum Wage"
```

---

Example:

```sql
SHOW competing theories

FOR "Roman Empire Collapse"
```

---

# Consensus Queries

Example:

```sql
SHOW consensus

FOR belief "Climate Change"
```

---

# Evidence Queries

Example:

```sql
SHOW evidence

FOR belief "Roman Economic Decline"
```

---

Example:

```sql
SHOW strongest evidence

FOR belief "TigerBeetle Reliability"
```

---

# Research Queries

Example:

```sql
SHOW open questions

FOR domain "Databases"
```

---

Example:

```sql
WHAT SHOULD WE LEARN NEXT?
```

---

# Knowledge Debt Queries

Example:

```sql
SHOW highest knowledge debt
```

---

Example:

```sql
SHOW navigation debt
```

---

# Evaluation Queries

Example:

```sql
SHOW evaluations

FOR "System Architecture"
```

---

Example:

```sql
SHOW lowest scoring evaluations
```

---

# Decision Queries

Example:

```sql
SHOW decisions

AFFECTED BY belief "Gravity"
```

---

Example:

```sql
WHY WAS

decision "Use PostgreSQL"

MADE?
```

---

# Ontology Queries

Example:

```sql
SHOW ontology

FOR domain "Law"
```

---

Example:

```sql
SHOW missing ontology coverage
```

---

# Asset Queries

Example:

```sql
SHOW assets

FOR work "The Bible"
```

---

Example:

```sql
SHOW evidence

FROM asset "roman-history.pdf"
```

---

# Work Queries

Example:

```sql
SHOW expressions

FOR work "The Bible"
```

---

# Federation Queries

Example:

```sql
SEARCH all brains

FOR "Roman Law"
```

---

Example:

```sql
SHOW route

FROM brain "History"

TO brain "Law"
```

---

# Query Execution Model

Question
↓
DQL Parser
↓
Planner
↓
Index Traversal
↓
Map Traversal
↓
Leaf Retrieval
↓
Evidence Retrieval
↓
Result

---

# Query Planner

Planner responsibilities:

Choose indexes

Choose maps

Estimate context cost

Optimize traversal

---

# Context Awareness

Every query should estimate:

Context Cost

Example:

```sql
SHOW beliefs

ABOUT "Roman Empire"
```

Estimated:

2,000 tokens

---

# Query Result Model

```ts
interface DQLResult {
  query: string

  summary: string

  confidence: number

  contextCost: number

  results: unknown[]
}
```

---

# Knowledge Native Operations

Traditional SQL:

SELECT

UPDATE

DELETE

INSERT

DQL:

SHOW

EXPLAIN

COMPARE

NAVIGATE

TRACE

IMPACT

LEARN

EVALUATE

DISCOVER

---

# Explain Queries

Example:

```sql
EXPLAIN belief

"Roman Economic Decline"
```

Returns:

Evidence

Confidence

Dependencies

Contradictions

---

# Trace Queries

Example:

```sql
TRACE lineage

FOR belief "Roman Law"
```

---

# Compare Queries

Example:

```sql
COMPARE theories

FOR "Roman Empire Collapse"
```

---

# Learn Queries

Example:

```sql
LEARN path

FOR "Distributed Databases"
```

Returns:

Knowledge Map

---

# Discover Queries

Example:

```sql
DISCOVER related concepts

FOR "TigerBeetle"
```

---

# Future Extensions

Potential:

Temporal Queries

Probabilistic Queries

Simulation Queries

Multi-Brain Queries

---

# Canonical Rules

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

---

# Success Criteria

1. Humans can use DQL.
2. Agents can use DQL.
3. Discovery works.
4. Navigation works.
5. Dependency analysis works.
6. Impact analysis works.
7. Research planning works.
8. Knowledge debt is queryable.
9. Federation is queryable.
10. A Brain becomes explorable through a single language.
