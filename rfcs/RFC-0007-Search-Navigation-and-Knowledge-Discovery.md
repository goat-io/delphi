# RFC-0007 — Search, Navigation & Knowledge Discovery
## How Agents Understand Before They Read

Status: Draft (Rewritten after RFC-0019)

Depends On:
- RFC-0000
- RFC-0001
- RFC-0002
- RFC-0003
- RFC-0004
- RFC-0005
- RFC-0006
- RFC-0019

---

# Purpose

Traditional systems retrieve documents.

Most AI systems retrieve chunks.

Delphi navigates understanding.

The goal is not retrieval.

The goal is efficient movement through knowledge.

This RFC defines:

- Search
- Navigation
- Discovery
- Traversal
- Knowledge Maps
- Knowledge Indexes
- Context Budgeting

---

# Core Principle

Agents should not search first.

Agents should orient themselves first.

Understanding precedes retrieval.

---

# The Navigation Principle

Traditional RAG:

Question
→ Vector Search
→ Chunks
→ Answer

Delphi:

Question
→ Brain Index
→ Domain Index
→ Topic Index
→ Leaf
→ Evidence
→ Answer

---

# Search vs Navigation

Search answers:

Where might this exist?

Navigation answers:

Where should I go next?

Both are required.

Navigation should happen before deep retrieval.

---

# Knowledge Hierarchy

Every Brain should expose:

Brain Index
↓
Domain Indexes
↓
Topic Indexes
↓
Subtopic Indexes
↓
Leaf Collections
↓
Leaves

Agents traverse this hierarchy progressively.

---

# Knowledge Indexes

Indexes are generated summaries of knowledge regions.

Indexes answer:

- What exists here?
- What matters most?
- What should I read next?
- What are the important questions?
- What are the important decisions?

---

# Brain Index

Every Brain must expose a Brain Index.

Example:

Goatlab Brain

Contains:

- Products
- Architecture
- Research
- Operations

This is the first thing agents read.

---

# Domain Index

Examples:

History

Engineering

Law

Medicine

Business

Each domain exposes:

Summary

Key Concepts

Key Beliefs

Key Questions

Child Domains

---

# Topic Index

Example:

Roman Empire

Summary

Key Concepts

Open Questions

Important Evidence

Child Topics

---

# Progressive Compression

Every significant knowledge region should expose:

Tiny Summary

Short Summary

Medium Summary

Long Summary

Example:

Roman Empire

10 Tokens

100 Tokens

1000 Tokens

10000 Tokens

Agents choose the smallest useful representation.

---

# Context Budgeting

Context is expensive.

Reading should occur progressively.

Level 0

Brain Index

Level 1

Domain Index

Level 2

Topic Index

Level 3

Leaf Summary

Level 4

Leaf Content

Level 5

Evidence

The agent should stop as soon as sufficient understanding exists.

---

# Entry Points

Navigation may begin from:

Question

Object

Belief

Decision

Task

Research Area

Capability

Ontology Type

---

# Search Surfaces

Every leaf exposes a Search Surface.

```ts
interface SearchSurface {
  title: string
  summary: string
  aliases: string[]
  tags: string[]
  keywords: string[]
}
```

Search Surfaces support discovery.

Indexes support navigation.

---

# Search Types

## Keyword Search

Useful for:

Names

Identifiers

References

---

## Semantic Search

Useful for:

Related Concepts

Similar Ideas

Discovery

---

## Graph Search

Useful for:

Dependencies

Lineage

Impact Analysis

---

## Index Search

Useful for:

Orientation

Topic Discovery

Knowledge Exploration

Recommended first step.

---

## Hybrid Search

Combine:

Keyword

Semantic

Graph

Index

Recommended default.

---

# Traversal Strategy

Agents should traverse:

Index
→ Index
→ Index
→ Leaf
→ Evidence

Never:

Brain
→ Thousands of Leaves

---

# Dependency Traversal

Question:

What supports this?

Traverse:

Belief
→ Evidence

---

# Impact Traversal

Question:

What breaks if this changes?

Traverse:

Belief
→ Decision
→ Task
→ Outcome

---

# Evaluation Traversal

Question:

How good is this?

Traverse:

Object
→ Evaluation
→ Rubric

---

# Lineage Traversal

Question:

Where did this originate?

Traverse:

Leaf
→ Source
→ Source
→ Source

Until root.

---

# Knowledge Maps

Indexes describe regions.

Maps describe routes.

Example:

Roman Empire

Related Topics:

- Republic
- Augustus
- Military
- Collapse
- Economy

Suggested Paths:

- Political History
- Economic History
- Military History

---

# Discovery

Agents should always ask:

What else is related?

What am I missing?

What contradicts this?

What should I read next?

---

# Ranking Signals

Results should be ranked using:

1. Confidence
2. Evidence Quality
3. Relevance
4. Relationship Strength
5. Freshness
6. Usage Frequency
7. Ontology Match

---

# Search By Question

Example:

Should Walliver use TigerBeetle?

Process:

Brain Index
→ Engineering Index
→ Databases Index
→ TigerBeetle
→ Evidence
→ Evaluations
→ Contradictions
→ Answer

---

# Search By Decision

Example:

Why did we choose PostgreSQL?

Process:

Decision
→ Beliefs
→ Evidence
→ Evaluations
→ Alternatives

---

# Search By Research

Example:

What should we investigate next?

Process:

Knowledge Debt
→ Open Questions
→ Confidence Gaps
→ Research Tasks

---

# Search Debt

Search debt occurs when:

- Knowledge cannot be discovered
- Indexes are stale
- Navigation paths are broken
- Duplicate concepts exist
- Search quality degrades

Search debt creates tasks.

---

# Agent Retrieval Contract

```ts
interface RetrievalResult {
  id: string

  title: string

  summary: string

  confidence: number

  relevanceScore: number

  navigationPath: string[]
}
```

---

# Canonical Questions

Where should I start?

What exists here?

What matters most?

What should I read next?

What supports this?

What contradicts this?

What depends on this?

---

# Canonical Rules

1. Navigation precedes retrieval.
2. Agents should read indexes first.
3. Context should be loaded progressively.
4. Every Brain exposes a Brain Index.
5. Every major domain exposes an Index.
6. Search and navigation are distinct concepts.
7. Knowledge Maps should be generated.
8. Agents should avoid brute-force retrieval.
9. Understanding is more important than retrieval.
10. Context is a scarce resource.

---

# Success Criteria

A Delphi implementation successfully implements this RFC when:

1. Agents navigate before retrieving.
2. Knowledge Indexes guide exploration.
3. Context usage decreases dramatically.
4. Knowledge becomes discoverable.
5. Search and navigation work together.
6. Dependency traversal works.
7. Impact traversal works.
8. Evaluation traversal works.
9. Knowledge Maps are generated.
10. Agents can efficiently traverse extremely large knowledge spaces.
