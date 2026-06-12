# RFC-0019 — Knowledge Indexes & Hierarchical Summaries
## Intelligence Through Compression

Status: Draft

Depends On:
- RFC-0000 through RFC-0018

---

# Purpose

Knowledge is useless if it cannot be navigated.

Agents have limited context.

Humans have limited attention.

Therefore Delphi requires a mechanism for:

- Compression
- Navigation
- Orientation
- Discovery

This RFC defines Knowledge Indexes.

---

# Core Principle

Agents should not read knowledge first.

Agents should read indexes first.

Knowledge should be explored the same way humans explore books.

Book
→ Table of Contents
→ Chapter Summary
→ Section Summary
→ Paragraph

Delphi should work the same way.

---

# Why This Exists

Without indexes:

Brain
→ Millions of Leaves

Agents become expensive.

Context windows become bottlenecks.

Navigation becomes difficult.

---

# The Compression Principle

Knowledge should exist at multiple levels of abstraction.

Example:

World
→ History
→ Roman Empire
→ Collapse
→ Economy
→ Taxation

Each level exposes a summary of what lies beneath it.

---

# Knowledge Index

A Knowledge Index is a generated representation of a knowledge region.

Indexes are not canonical.

Leaves remain canonical.

Indexes are projections.

---

# Knowledge Index Schema

```ts
interface KnowledgeIndex {
  id: string

  title: string

  summary: string

  scope: string

  confidence: number

  keyConcepts: string[]

  keyBeliefs: string[]

  keyDecisions: string[]

  keyQuestions: string[]

  importantDependencies: string[]

  childIndexes: string[]

  representativeLeaves: string[]

  generatedAt: string
}
```

---

# Example

Roman Empire

Summary:

Ancient Mediterranean empire existing from 27 BC to 476 AD in the West.

Key Concepts:

- Augustus
- Pax Romana
- Senate
- Expansion
- Collapse

Child Indexes:

- Government
- Military
- Economy
- Religion
- Society
- Collapse

---

# Recursive Navigation

Indexes may contain indexes.

Example:

Roman Empire
→ Collapse
→ Economy
→ Taxation

Agents navigate progressively.

---

# Index Levels

Suggested levels:

Level 0

Brain Index

Level 1

Domain Index

Level 2

Topic Index

Level 3

Subtopic Index

Level 4

Leaf Collection Index

Level 5

Individual Leaves

---

# The Navigation Rule

Agents should always attempt:

Index
→ Index
→ Index
→ Leaf

Never:

Brain
→ All Leaves

---

# Generated Not Authored

Indexes should be generated.

Humans may review them.

Leaves remain canonical.

Indexes are disposable.

---

# Brain Index

Every Brain should expose a Brain Index.

Example:

Goatlab Brain

Summary:

Knowledge about projects, architecture, decisions and strategy.

Key Domains:

- Products
- Architecture
- Operations
- Research

---

# Ontology Index

Every Ontology Pack should expose an index.

Example:

@delphi/legal

Key Types:

- Law
- Regulation
- Jurisdiction
- Court Decision

---

# Capability Index

Every Capability should expose:

Purpose

Methodologies

Related Knowledge

Evaluations

---

# Rubric Index

Every Rubric should expose:

Criteria

Weights

Expected Outcomes

---

# Research Index

Every Research Area should expose:

Known Knowledge

Open Questions

Major Findings

Research Debt

---

# Decision Index

Every Decision Cluster should expose:

Important Decisions

Dependencies

Risks

Open Questions

---

# Knowledge Density

Indexes should minimize tokens.

Goal:

Maximum information

Minimum context cost

---

# Context Budgeting

Suggested:

Brain Index
< 1 KB

Domain Index
< 2 KB

Topic Index
< 4 KB

Subtopic Index
< 8 KB

Only leaves may exceed this.

---

# Agent Workflow

Question
→ Brain Index
→ Domain Index
→ Topic Index
→ Relevant Leaves

This minimizes context consumption.

---

# Discovery

Indexes should answer:

What exists here?

What matters most?

Where should I go next?

---

# Importance Ranking

Indexes should highlight:

Most Important Concepts

Most Important Beliefs

Most Important Decisions

Most Important Questions

---

# Open Questions

Indexes should expose uncertainty.

Examples:

Unresolved debates

Missing evidence

Research gaps

Contradictions

---

# Dependency Awareness

Indexes should expose:

Major dependencies

Major consumers

High-impact beliefs

---

# Multi-Brain Navigation

Federated Brains should expose indexes.

Example:

World Brain
→ History Brain
→ Roman Empire

without loading entire datasets.

---

# Knowledge Maps

Indexes collectively form a navigable map.

This becomes:

Table of Contents for Reality.

---

# Index Generation

Indexes may be generated from:

Leaves

Relationships

Evidence

Evaluations

Decisions

Tasks

---

# Index Evolution

Indexes evolve automatically.

Changes in leaves trigger:

Index regeneration.

---

# Search Integration

Search should return:

Indexes first.

Leaves second.

Navigation before retrieval.

---

# Canonical Rules

1. Leaves remain canonical.
2. Indexes are generated.
3. Every Brain exposes an index.
4. Every major domain exposes an index.
5. Every ontology exposes an index.
6. Agents navigate through indexes.
7. Indexes expose open questions.
8. Indexes expose important concepts.
9. Indexes minimize context usage.
10. Indexes form a map of knowledge.

---

# Success Criteria

A Delphi implementation successfully implements this RFC when:

1. Agents can navigate large knowledge spaces efficiently.
2. Context consumption decreases dramatically.
3. Every Brain explains itself.
4. Every domain explains itself.
5. Every ontology explains itself.
6. Important concepts are surfaced automatically.
7. Open questions remain visible.
8. Navigation becomes hierarchical.
9. Knowledge becomes discoverable.
10. Delphi behaves like a table of contents for reality.
