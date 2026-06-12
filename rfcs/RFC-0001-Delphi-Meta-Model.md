# RFC-0001 — Delphi Meta Model
## The Fundamental Concepts of Delphi

Status: Draft (Revised after RFC-0019)

Depends On:
- RFC-0000 Constitution

Required By:
- Every Other RFC

---

# Purpose

RFC-0000 defines why Delphi exists.

RFC-0001 defines what Delphi is made of.

This document defines the irreducible concepts from which the entire Delphi specification emerges.

Every ontology, brain, agent, rubric, decision, evaluation, research process, and federation protocol is built from these primitives.

---

# Core Principle

Delphi does not model domains.

Delphi models intelligence.

The same structure must work for:

- Physics
- Biology
- Law
- Medicine
- Engineering
- Companies
- Design
- Personal Knowledge
- Research

The Meta Model exists to guarantee universality.

---

# The Three Layers Of Intelligence

Delphi is built on three layers.

## Memory

Stores knowledge.

Represented by:

- Leaves
- Evidence
- Relationships

---

## Understanding

Compresses knowledge.

Represented by:

- Knowledge Indexes

---

## Action

Uses knowledge.

Represented by:

- Evaluations
- Decisions
- Tasks
- Agents

---

# The Universal Loop

Reality
↓
Observation
↓
Evidence
↓
Assertion
↓
Belief
↓
Knowledge Index
↓
Evaluation
↓
Decision
↓
Action
↓
Observation

Everything in Delphi participates in this loop.

---

# The Fundamental Primitives

The Delphi specification is built from twelve primitives.

1. Brain
2. Leaf
3. Assertion
4. Relationship
5. Evidence
6. Knowledge Index
7. Evaluation
8. Decision
9. Task
10. Ontology
11. Capability
12. Agent

Everything else is a specialization or composition of these concepts.

---

# Brain

A Brain is an independent knowledge system.

A Brain owns:

- Knowledge
- Evidence
- Confidence
- Evaluations
- Decisions
- Tasks
- Ontologies
- Indexes

Brains are the highest-level container in Delphi.

---

# Leaf

A Leaf is the canonical storage unit.

Everything is stored as a leaf.

Examples:

- Person
- Company
- Law
- Technology
- Rubric
- Decision
- Research Question

Leaves are the source of truth.

---

# Assertion

An Assertion is the smallest unit of meaning.

Examples:

- PostgreSQL scales well.
- Roman Law influenced Civil Law.
- Accessibility improves usability.

Assertions are claims.

Not truth.

Not facts.

Claims.

---

# Belief

A Belief is an assertion with confidence.

Example:

Assertion:
TigerBeetle is suitable.

Confidence:
0.84

Result:

Belief

---

# Fact

Facts are not a primitive.

A Fact is simply a belief whose confidence exceeds an accepted threshold.

Facts may change over time.

---

# Relationship

Relationships connect leaves.

Examples:

SUPPORTS

CONTRADICTS

DEPENDS_ON

CAUSES

IS_A

PART_OF

Relationships create the graph.

---

# Evidence

Evidence explains why something is believed.

Examples:

- Research Paper
- Benchmark
- Interview
- Observation
- Law
- Court Decision
- Experiment

Evidence influences confidence.

---

# Knowledge Index

Knowledge Indexes are compressed representations of knowledge.

Indexes answer:

- What exists here?
- What matters most?
- What should I read next?
- What are the important decisions?
- What are the important questions?

Indexes are generated.

Leaves remain canonical.

Note:

The Knowledge Index is the only primitive that is NOT stored as a leaf.

It is a generated projection (RFC-0002, RFC-0019).

It is listed as a primitive because the protocol cannot function
without it — not because it is canonical.

---

# Why Indexes Exist

Brains eventually become too large to understand directly.

Example:

Roman Empire

may contain:

- 50,000 leaves
- 2 million relationships
- thousands of evidence sources

No agent can load everything.

Instead the agent reads:

Roman Empire Index

and decides where to go next.

---

# Hierarchical Navigation

Knowledge should be explored through indexes.

Example:

World
→ History
→ Roman Empire
→ Collapse
→ Economy
→ Taxation

Each level exposes an index.

---

# Progressive Compression

Every significant knowledge region should expose multiple summary levels.

Example:

Roman Empire

Tiny Summary
10 tokens

Short Summary
100 tokens

Medium Summary
1000 tokens

Long Summary
10000 tokens

Agents should use the smallest representation that satisfies the task.

---

# Evaluation

Evaluation answers:

How good is this?

Examples:

- Architecture Review
- Accessibility Audit
- Legal Analysis
- Research Review

Evaluations use rubrics.

---

# Decision

Decision answers:

What should we do?

Decisions consume:

- Beliefs
- Evidence
- Evaluations

Decisions create:

- Tasks
- Actions

---

# Task

Tasks represent future work.

Examples:

Research

Implementation

Review

Validation

Tasks reduce uncertainty.

---

# Ontology

Ontology answers:

What is this?

How should it be classified?

Ontology defines:

- Types
- Relationships
- Validation Rules

---

# Capability

Capability answers:

What can an agent do?

Examples:

- Legal Research
- Architecture Review
- Scientific Analysis

Capabilities combine:

Knowledge
+
Methodology
+
Evaluation

---

# Agent

Agents perform work.

Agents do not own knowledge.

Brains own knowledge.

Agents:

- Research
- Evaluate
- Review
- Synthesize
- Plan
- Navigate

---

# The Universal Formula

Every domain can be represented as:

Objects
+
Evidence
+
Beliefs
+
Indexes
+
Evaluations
+
Decisions
+
Tasks
+
Ontology

This is the foundation of RFC-0018.

---

# The Knowledge Formula

Knowledge consists of:

Assertion
+
Evidence
+
Confidence
+
Relationships
+
Provenance

---

# The Navigation Formula

Understanding consists of:

Knowledge
+
Compression
+
Navigation

Knowledge Indexes provide:

Compression
and
Navigation

---

# The Decision Formula

Decision Quality depends on:

Beliefs
+
Evidence
+
Evaluations
+
Alternatives
+
Risk Analysis

---

# The Research Formula

Research exists to reduce uncertainty.

Research produces:

Evidence
→ Beliefs
→ Decisions

---

# The Federation Formula

Brain
↔ Brain

through:

Leaves
Evidence
Evaluations
Capabilities
Ontologies
Indexes

Never through direct storage access.

---

# The Storage Formula

Canonical:

Brain
→ Leaves
→ Events

Generated:

Indexes
Search
Embeddings
Graphs
Analytics

---

# The Evolution Formula

Knowledge evolves.

Ontology evolves.

Evaluations evolve.

Capabilities evolve.

Indexes evolve.

Brains evolve.

Therefore:

Everything is versioned.

---

# Meta Model Diagram

Reality
↓
Observation
↓
Evidence
↓
Assertion
↓
Belief
↓
Knowledge Index
↓
Evaluation
↓
Decision
↓
Task
↓
Action
↓
Observation

Agents operate on the loop.

Brains store the loop.

Ontology describes the loop.

Indexes explain the loop.

---

# Canonical Rules

1. Everything belongs to a Brain.
2. Everything is stored as a Leaf.
3. Assertions are the unit of meaning.
4. Beliefs are assertions with confidence.
5. Evidence supports beliefs.
6. Relationships create structure.
7. Knowledge Indexes create understanding.
8. Evaluations measure quality.
9. Decisions create action.
10. Tasks reduce uncertainty.
11. Ontology provides classification.
12. Agents operate on knowledge.
13. Brains own knowledge.
14. Every significant knowledge region must expose an Index.

---

# Success Criteria

A Delphi implementation successfully implements this RFC when:

1. Every concept can be expressed using the primitives.
2. Every domain can use the same protocol.
3. Knowledge remains explainable.
4. Understanding remains scalable.
5. Navigation remains efficient.
6. Evaluation remains reproducible.
7. Decisions remain traceable.
8. Ontology remains extensible.
9. Agents remain interoperable.
10. Brains remain sovereign.
11. Federation remains possible.
12. The entire specification can be derived from this Meta Model.
