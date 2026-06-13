---
name: meta-model-and-fundamental-primitives
type: research
status: closed
region: Spec
topics:
  - meta-model
  - primitives
  - brain
  - leaf
  - assertion
  - belief
  - knowledge-index
  - evaluation
  - decision
  - ontology
  - agent
  - RFC-0001
sources:
  - rfcs/RFC-0001-Delphi-Meta-Model.md
---

# The Delphi Meta Model: Twelve Fundamental Primitives

## Why the Meta Model Exists

RFC-0001 establishes the irreducible concepts from which the entire Delphi
specification emerges. Every ontology, brain, agent, rubric, decision,
evaluation, research process, and federation protocol derives from these
twelve primitives. The model is domain-agnostic by design — it must work
equally for physics, law, medicine, engineering, business, and personal
knowledge because the evolutionary dynamics are universal.

**Source:** RFC-0001 §"Purpose" (lines 16–23) and §"Core Principle" (lines
28–45).

## Three Layers of Intelligence

RFC-0001 organizes the primitives into three functional layers:

| Layer | Function | Primitives |
|---|---|---|
| **Memory** | Stores knowledge | Leaves, Evidence, Relationships |
| **Understanding** | Compresses knowledge | Knowledge Indexes |
| **Action** | Uses knowledge | Evaluations, Decisions, Tasks, Agents |

**Source:** RFC-0001 §"The Three Layers Of Intelligence" (lines 48–85).

## The Universal Loop

All twelve primitives participate in one continuous loop:

```
Reality → Observation → Evidence → Assertion → Belief
→ Knowledge Index → Evaluation → Decision → Task → Action → Observation
```

Agents operate on the loop. Brains store the loop. Ontology describes the
loop. Indexes explain the loop.

**Source:** RFC-0001 §"The Universal Loop" (lines 88–110) and
§"Meta Model Diagram" (lines 605–631).

## The Twelve Primitives

### 1. Brain
A Brain is an independent, sovereign knowledge system. It owns all knowledge,
evidence, confidence, evaluations, decisions, tasks, ontologies, and indexes.
Brains are the highest-level container in Delphi. Brains may federate but
never share storage directly.

### 2. Leaf
A Leaf is the canonical storage unit. Everything canonical is stored as a
leaf. Examples include persons, companies, laws, technologies, rubrics,
decisions, and questions. Leaves are the source of truth.

### 3. Assertion
An Assertion is the smallest unit of meaning — a claim about reality. It is
not truth, not fact: it is a claim. Examples: "PostgreSQL scales well",
"Roman Law influenced Civil Law".

### 4. Relationship
Relationships connect leaves, creating the knowledge graph. Core types:
`SUPPORTS`, `CONTRADICTS`, `DEPENDS_ON`, `CAUSES`, `IS_A`, `PART_OF`.

### 5. Evidence
Evidence explains why something is believed. Examples: research papers,
benchmarks, interviews, observations, court decisions, experiments. Evidence
influences confidence and references assets.

### 6. Knowledge Index
Indexes are generated compressed representations of knowledge regions. They
answer: what exists here, what matters most, what should I read next, what
are the important decisions and questions. **Knowledge Index is the only
primitive that is NOT stored as a leaf** — it is a generated projection
(RFC-0002, RFC-0019). It is a primitive because the protocol cannot function
without it, not because it is canonical.

### 7. Evaluation
An Evaluation answers "how good is this?" Examples: architecture reviews,
accessibility audits, legal analyses. Evaluations use rubrics to produce
reproducible quality assessments.

### 8. Decision
A Decision answers "what should we do?" It consumes beliefs, evidence, and
evaluations, then creates tasks and actions. Every significant decision must
be traceable to the beliefs and evidence that supported it.

### 9. Task
Tasks represent future work and exist to reduce uncertainty. Types include
Research, Implementation, Review, and Validation. Every task must answer:
what uncertainty do I reduce?

### 10. Ontology
Ontology answers "what is this and how should it be classified?" It defines
types, relationships, and validation rules. Without ontology, extraction
produces untyped soup.

### 11. Capability
Capability answers "what can an agent do?" Capabilities combine knowledge,
methodology, and evaluation. Examples: Legal Research, Architecture Review,
Scientific Analysis.

### 12. Agent
Agents perform work. They do NOT own knowledge — Brains own knowledge. Agents
are temporary workers. They research, evaluate, review, synthesize, plan, and
navigate but all results are stored in the Brain.

**Source:** RFC-0001 §"The Fundamental Primitives" (lines 113–131) and all
subsequent primitive sections.

## Facts Are Not a Primitive

A Fact is not a distinct primitive. It is simply a belief whose confidence
exceeds an accepted threshold. Facts may change over time as evidence evolves.
This is a deliberate design choice — Delphi does not model truth, it models
beliefs about reality at a given confidence level.

**Source:** RFC-0001 §"Fact" (lines 212–219).

## The Universal Formula

Every domain can be represented as:

```
Objects + Evidence + Beliefs + Indexes + Evaluations + Decisions + Tasks + Ontology
```

This universality is the foundation of RFC-0018 (Universal Knowledge Model).

**Source:** RFC-0001 §"The Universal Formula" (lines 463–485).

## Canonical Rules (RFC-0001)

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

**Source:** RFC-0001 §"Canonical Rules" (lines 641–658).

## Canonical Questions This Answers

- *What are the twelve Delphi primitives?* — Brain, Leaf, Assertion,
  Relationship, Evidence, Knowledge Index, Evaluation, Decision, Task,
  Ontology, Capability, Agent.
- *Is a Fact a separate primitive?* — No. A fact is a high-confidence belief.
- *Why is Knowledge Index listed as a primitive if it is not a leaf?* — Because
  the protocol cannot function without it, even though it is generated, not
  canonical.
- *Who owns knowledge in Delphi?* — Brains own knowledge. Agents are temporary
  workers.
- *What is the universal loop?* — Reality → Observation → Evidence →
  Assertion → Belief → Index → Evaluation → Decision → Task → Action →
  Observation (continuous).
