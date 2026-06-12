# AGENTS.md
# Delphi Knowledge Operating System
## Agent Context & Working Agreement

Version: 0.1

---

# What Is Delphi?

Delphi is a Knowledge Operating System.

Delphi is NOT:

- A vector database
- A document management system
- A wiki
- A graph database
- A RAG framework

Delphi is a system designed to transform:

Reality
↓
Assets
↓
Evidence
↓
Knowledge
↓
Understanding
↓
Navigation
↓
Evaluation
↓
Decision
↓
Action
↓
Learning

into a continuously evolving Brain.

---

# Mission

The mission of Delphi is:

To build a universal protocol for representing, navigating, evaluating, evolving, and federating knowledge.

The same protocol should work for:

- Companies
- Engineering
- Law
- Medicine
- History
- Research
- Personal Knowledge
- Civilization-scale knowledge

---

# Core Principles

## Knowledge ≠ Understanding

Knowledge is stored in Leaves.

Understanding is represented through Indexes.

---

## Understanding ≠ Navigation

Indexes explain:

"What exists here?"

Maps explain:

"Where should I go next?"

---

## Assets ≠ Knowledge

A PDF is not knowledge.

A Video is not knowledge.

A Book is not knowledge.

Assets contain knowledge.

Knowledge must be extracted.

---

## Truth ≠ Facts

Delphi does not store truth.

Delphi stores beliefs about reality.

Truth is:

- Contextual
- Temporal
- Jurisdictional
- Uncertain

---

## Brains Own Knowledge

Agents do not own knowledge.

Brains own knowledge.

Agents are temporary workers.

---

# Universal Model

Reality
↓
Work
↓
Expression
↓
Asset
↓
Extraction
↓
Evidence
↓
Knowledge
↓
Indexes
↓
Maps
↓
Evaluations
↓
Decisions
↓
Tasks
↓
Agents
↓
Evolution

---

# The Fundamental Primitives

The Delphi Meta Model contains:

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

Everything else derives from these primitives.

---

# What Is A Brain?

A Brain is an independent knowledge system.

Examples:

- Goatlab Brain
- Careium Brain
- Legal Brain
- History Brain

Brains are sovereign.

Brains may federate.

---

# What Is A Leaf?

Leaves are the canonical storage unit.

Everything canonical is stored as a Leaf.

Examples:

- Concept
- Belief
- Question
- Decision
- Task

Leaves are the source of truth.

---

# What Is Evidence?

Evidence explains why a belief exists.

Examples:

- PDF citation
- Book chapter
- Video timestamp
- Court decision
- Benchmark result

Evidence references Assets.

---

# What Is An Index?

Indexes are generated summaries.

Indexes answer:

- What exists here?
- What matters most?
- What should I read next?

Indexes are not canonical.

Indexes are generated.

---

# What Is A Map?

Maps represent routes through knowledge.

Maps answer:

- Where should I go next?
- What should I learn next?
- What is the shortest path?

Indexes describe places.

Maps describe movement.

---

# Navigation First

Agents MUST NOT begin with retrieval.

Agents MUST navigate first.

Bad:

Question
↓
Vector Search
↓
Chunks

Good:

Question
↓
Brain Index
↓
Domain Index
↓
Topic Index
↓
Leaf
↓
Evidence

Navigation precedes retrieval.

---

# The Agent Philosophy

Agents do not answer questions.

Agents improve Brains.

Every agent action should:

- Reduce uncertainty
- Improve understanding
- Improve navigation
- Improve evidence quality
- Improve ontology quality

---

# Agent Types

Navigator

Researcher

Synthesizer

Critic

Evaluator

Auditor

Planner

Ontology Steward

---

# Research Loop

Question
↓
Navigation
↓
Research
↓
Evidence
↓
Belief Update
↓
Evaluation
↓
Index Update
↓
New Questions

Continuous process.

---

# Truth Model

Assertions are claims.

Beliefs are assertions with confidence.

Facts are high-confidence beliefs.

Theories are collections of beliefs.

Consensus influences confidence.

Consensus is not truth.

---

# Dependency Model

Every belief should answer:

What supports me?

What do I depend on?

Who depends on me?

What breaks if I become false?

---

# Knowledge Debt

Knowledge Debt exists when:

- Evidence is missing
- Confidence is weak
- Questions are unanswered

Knowledge Debt creates work.

---

# Navigation Debt

Navigation Debt exists when:

Knowledge exists
but
cannot be discovered efficiently.

Navigation Debt creates work.

---

# Ontology Debt

Ontology Debt exists when:

Reality cannot be represented cleanly.

Ontology Debt creates work.

---

# MVP Scope

Current implementation target:

Single Brain

Single PostgreSQL Database

Single Index Generator

Single Research Agent

Single Knowledge Domain

No Federation

No Multi-Brain Coordination

---

# Current Architecture

This is the Delphi monorepo. Two planes:

## Knowledge plane (the RFC implementation, private packages)

apps/
  api/                  Fastify HTTP API (@goatlab/delphi-api)

packages/
  delphi-protocol/      Zod contracts for all RFC primitives + confidence math
  delphi-knowledge/     Storage: Db (pg/PGlite), migrations, BrainStore
  delphi-ingestion/     Files → Assets + Chunks
  delphi-extraction/    Chunks → Candidates → resolution → Leaves + Evidence
  delphi-indexer/       Regions, 4-tier indexes, maps, scheduler
  delphi-agent/         Question → navigation → evidence-cited answers

## Execution plane (migrated from fluent — PUBLISHED npm packages)

packages/
  delphi-core/          Durable Postgres workflow engine (DAGs, HITL gates, budgets)
  delphi-ai/            Multi-provider AI adapter + multi-agent consensus
  delphi-langgraph/     LangGraph step executor
  delphi-sandbox/       Docker sandboxed agent execution
  delphi-ui/            Workflow dashboard (React)
  delphi-brain/         Git/markdown Brain framework (Go CLI + React, polyglot)
  delphi-trpc/ delphi-express/ delphi-bun/ delphi-governance/ realtime-broker/

CRITICAL: execution-plane package names and versions are PUBLISHED and
consumed in production. NEVER rename them. "delphi-core" is the workflow
engine, NOT the RFC contracts package (that is delphi-protocol).
fluent still contains the originals until consumers are repointed —
coordinate before publishing from here.

Backend language: TypeScript (Node.js, strict mode).
RFC schemas are implemented as Zod schemas in delphi-core.

Asset extraction sidecar: the existing sodium ai-service
(/Users/igca/Documents/Code/sodium/apps/ai-service) is reused
as-is over HTTP for OCR (PaddleOCR), transcription (faster-whisper),
and embeddings (BGE-M3, 1024-dim, stored in pgvector).
Do not rewrite it in TypeScript; do not duplicate its capabilities.

This codebase is 100% AI-authored. Optimize for machine
verifiability: strict typing, exhaustive discriminated unions,
schema validation at every boundary, and tests that an agent
can run to verify its own changes.

The Delphi specification — 28 RFCs plus the implementation
blueprints — lives in rfcs/. It is the bible of this repo:
every design decision must trace to it, and spec changes are
made there first (rfcs/RFC-9999 is the master index).

Before building anything, read rfcs/DELPHI-MVP-0002-Prior-Art-and-Reuse.md:
careium-brain (/Users/igca/Documents/Code/careium-brain) and the
sodium monorepo contain proven pieces of Delphi — harvest them,
do not rediscover them.

---

# Storage Model

Canonical:

Brains
Leaves
Evidence
Relationships
Assets

Generated:

Indexes
Maps
Embeddings
Search Projections

---

# Retrieval Model

Question
↓
Index
↓
Map
↓
Leaf
↓
Evidence
↓
Answer

This is the canonical Delphi workflow.

---

# Success Criteria

The first Delphi implementation succeeds when it can:

1. Ingest documents
2. Extract knowledge
3. Store leaves
4. Store evidence
5. Generate indexes
6. Generate maps
7. Answer questions
8. Explain confidence
9. Show dependencies
10. Continuously improve

---

# Guidance For Agents

When making decisions:

Prefer simplicity.

Prefer explainability.

Prefer traceability.

Prefer navigation over retrieval.

Prefer evidence over opinion.

Prefer confidence over certainty.

Prefer evolution over rigid design.

When uncertain:

Create a Question.

When knowledge is missing:

Create Research.

When navigation is poor:

Create an Index or Map.

When ontology is insufficient:

Create an Ontology Proposal.

Always optimize for:

Maximum understanding
with
minimum context consumption.

---

# Final Principle

Delphi is not a database.

Delphi is not an AI framework.

Delphi is an attempt to build a living, evolving model of understanding.

Everything should be evaluated against this question:

"Does this improve the Brain's ability to understand reality?"
