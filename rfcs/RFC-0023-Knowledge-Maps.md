# RFC-0023 — Knowledge Maps
## Navigating Reality Through Structured Learning Paths

Status: Draft

Depends On:
- RFC-0000 through RFC-0022

---

# Purpose

RFC-0019 introduced Knowledge Indexes.

Indexes answer:

What exists here?

Knowledge Maps answer:

Where should I go next?

This RFC defines:

- Knowledge Maps
- Learning Paths
- Exploration Paths
- Research Paths
- Dependency Paths
- Navigation Strategies

---

# Core Principle

Indexes describe knowledge regions.

Maps describe movement between knowledge regions.

Indexes are places.

Maps are routes.

---

# The Navigation Problem

Knowing what exists is insufficient.

Example:

Roman Empire

An agent may know:

- Government
- Military
- Economy
- Religion
- Collapse

But which topic should be explored next?

Knowledge Maps answer this question.

---

# The Map Concept

A Knowledge Map is a navigable representation of possible journeys through knowledge.

Example:

Roman Empire
↓
Economy
↓
Taxation
↓
Inflation
↓
Collapse

---

# Why Maps Exist

Humans rarely learn randomly.

Learning follows paths.

Examples:

Mathematics

Arithmetic
↓
Algebra
↓
Calculus
↓
Differential Equations

Databases

Data Structures
↓
Transactions
↓
ACID
↓
PostgreSQL
↓
TigerBeetle

Maps represent these journeys.

---

# Knowledge Region

Every map connects knowledge regions.

Examples:

History

Law

Medicine

Engineering

Business

Research

---

# Indexes vs Maps

Indexes answer:

What exists here?

Maps answer:

Where should I go next?

---

# Map Schema

```ts
interface KnowledgeMap {
  id: string

  title: string

  description: string

  startNode: string

  routes: MapRoute[]

  generatedAt: string
}
```

---

# Route Schema

```ts
interface MapRoute {
  id: string

  title: string

  purpose: string

  nodes: string[]

  difficulty?: number

  estimatedTokens?: number
}
```

---

# Learning Maps

Purpose:

Acquire understanding.

Example:

Databases

Route:

Data Structures
↓
Indexes
↓
Transactions
↓
ACID
↓
PostgreSQL

---

# Research Maps

Purpose:

Investigate uncertainty.

Example:

Roman Empire Collapse

Route:

Collapse
↓
Economy
↓
Military
↓
Politics
↓
Comparative Analysis

---

# Decision Maps

Purpose:

Support decisions.

Example:

Database Selection

Route:

Requirements
↓
Alternatives
↓
Benchmarks
↓
Evaluations
↓
Decision

---

# Dependency Maps

Purpose:

Understand impact.

Example:

Gravity
↓
Orbital Mechanics
↓
Navigation
↓
GPS

Used for impact analysis.

---

# Exploration Maps

Purpose:

Discover adjacent knowledge.

Example:

PostgreSQL

Related Paths:

Databases

Distributed Systems

Storage Engines

Replication

---

# Curriculum Maps

Purpose:

Structured learning.

Example:

Programming

Variables
↓
Functions
↓
Data Structures
↓
Algorithms
↓
Architecture

---

# Knowledge Journeys

A journey is an agent traversal.

Example:

Question:

Why did Rome collapse?

Journey:

History Index
↓
Roman Empire Index
↓
Collapse Index
↓
Economic Theory
↓
Evidence

---

# Multiple Routes

There may be multiple valid routes.

Example:

Learn Databases

Route A:
Theory First

Route B:
PostgreSQL First

Route C:
Distributed Systems First

Maps should preserve alternatives.

---

# Route Ranking

Routes may be ranked by:

Confidence

Popularity

Completeness

Difficulty

Research Value

---

# Difficulty

Maps may expose difficulty.

Scale:

1–10

Example:

Algebra

Difficulty:

3

Calculus

Difficulty:

7

---

# Context Cost

Maps should estimate context consumption.

Example:

Database Fundamentals

Estimated:

5000 tokens

---

# Knowledge Distance

Knowledge Distance measures how far concepts are from one another.

Example:

PostgreSQL
→ TigerBeetle

Distance:

Small

PostgreSQL
→ Roman Empire

Distance:

Large

---

# Shortest Path

Agents should be able to ask:

What is the shortest path between:

Roman Law

and

European Union Law?

---

# Discovery Paths

Maps should support:

What should I learn next?

What is related?

What am I missing?

---

# Research Guidance

Research agents should use maps.

Flow:

Question
↓
Map Selection
↓
Route Selection
↓
Index Navigation
↓
Leaf Retrieval
↓
Evidence

---

# Federation Maps

Maps may span Brains.

Example:

History Brain
↓
Law Brain
↓
Political Science Brain

Maps remain navigable.

---

# Map Generation

Maps may be generated from:

Dependencies

Ontology

Indexes

Usage Patterns

Evaluations

Agent Traversals

---

# Dynamic Maps

Maps evolve.

New knowledge changes routes.

New dependencies create paths.

New research creates journeys.

---

# Map Health

Brains should expose:

Broken Routes

Dead Ends

Orphan Regions

Unused Paths

---

# Dead Ends

A Dead End occurs when:

Knowledge exists

but

No useful route continues.

Dead Ends create tasks.

---

# Navigation Efficiency

Maps should minimize:

Context Consumption

while maximizing:

Understanding

---

# Canonical Questions

Where should I start?

Where should I go next?

What is the shortest path?

What should I learn next?

What knowledge am I missing?

Which route has highest value?

---

# Canonical Rules

1. Indexes describe places.
2. Maps describe routes.
3. Every significant domain should expose maps.
4. Maps should support multiple routes.
5. Maps should evolve.
6. Maps should minimize context usage.
7. Research should follow maps.
8. Learning should follow maps.
9. Maps may cross Brain boundaries.
10. Navigation should be explainable.

---

# Success Criteria

1. Knowledge regions are navigable.
2. Multiple learning paths exist.
3. Research routes exist.
4. Dependency routes exist.
5. Shortest-path traversal works.
6. Maps evolve automatically.
7. Dead ends are visible.
8. Navigation efficiency improves.
9. Agents can explain their journeys.
10. Brains answer:
   "Where should I go next?"
