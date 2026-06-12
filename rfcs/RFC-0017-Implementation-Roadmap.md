# RFC-0017 — Implementation Roadmap
## From Specification to Working Delphi

Status: Draft
Depends On:
- RFC-0000 through RFC-0016
- RFC-0018

---

# Purpose

This RFC transforms Delphi from a specification into an executable engineering plan.

Goals:

- Minimize risk
- Deliver value early
- Avoid over-engineering
- Build foundations first
- Enable continuous evolution

---

# Guiding Principle

Do not build Delphi all at once.

Build the smallest possible Brain.

Prove assumptions.

Expand incrementally.

---

# North Star

Final Vision:

Question
→ Research
→ Evidence
→ Beliefs
→ Evaluation
→ Decisions
→ Tasks
→ Observation
→ Knowledge Update

Continuously.

---

# MVP Definition

The first Delphi Brain should support:

- Leaves
- Evidence
- Relationships
- Search
- Confidence
- Tasks

No federation.

No ontology evolution.

No autonomous research.

No complex agents.

---

# Phase 0 — Bootstrap

Duration:
1–2 weeks

Goal:

Create repository structure.

Deliverables:

- Monorepo
- CI/CD
- Local development
- Database migrations
- API skeleton

Suggested structure (canonical, see DELPHI-MVP-0001):

apps/
  api/
  worker/

packages/
  delphi-core/
  delphi-brain/
  delphi-ingestion/
  delphi-extraction/
  delphi-indexer/
  delphi-agent/

---

# Phase 1 — Core Brain

Duration:
2–4 weeks

RFCs:

- RFC-0002
- RFC-0010

Goal:

Implement canonical storage.

Deliverables:

- Brain model
- Leaves table
- Events table
- Edges table
- CRUD APIs
- Audit trail

Success:

Can create and retrieve leaves.

---

# Phase 2 — Knowledge Layer

Duration:
2–4 weeks

RFCs:

- RFC-0003
- RFC-0004

Goal:

Represent knowledge.

Deliverables:

- Beliefs
- Evidence
- Provenance
- Confidence
- Contradictions

Success:

Every belief can explain itself.

---

# Phase 3 — Search Layer

Duration:
2–3 weeks

RFCs:

- RFC-0007

Goal:

Allow navigation.

Deliverables:

- Full-text search
- pgvector
- Search surfaces
- Graph traversal APIs

Success:

Agent can discover relevant knowledge.

---

# Phase 4 — Evaluation Layer

Duration:
2–4 weeks

RFCs:

- RFC-0005

Goal:

Define quality.

Deliverables:

- Rubrics
- Evaluations
- Scoring
- Quality gates

Success:

Outputs become measurable.

---

# Phase 5 — Decision Layer

Duration:
2–3 weeks

RFCs:

- RFC-0012

Goal:

Represent decision making.

Deliverables:

- Decision leaves
- Alternatives
- Risks
- Consequences

Success:

Decisions become traceable.

---

# Phase 6 — Ontology Layer

Duration:
3–5 weeks

RFCs:

- RFC-0006
- RFC-0015

Goal:

Enable classification.

Deliverables:

- Ontology packs
- Relationship types
- Validation rules
- Ontology migrations

Success:

Brains become extensible.

---

# Phase 7 — Research Engine

Duration:
4–8 weeks

RFCs:

- RFC-0008
- RFC-0013

Goal:

Create active intelligence.

Deliverables:

- Research tasks
- Agent runtime
- Capability registry
- Methodologies

Success:

Agents can improve knowledge.

---

# Phase 8 — Knowledge Economics

Duration:
2–4 weeks

RFCs:

- RFC-0011

Goal:

Prioritize learning.

Deliverables:

- Knowledge debt engine
- Research ROI engine
- Prioritization scores

Success:

Brain knows what to learn next.

---

# Phase 9 — Federation

Duration:
4–8 weeks

RFCs:

- RFC-0009
- RFC-0014

Goal:

Connect brains.

Deliverables:

- Brain manifests
- Import/export
- References
- Synchronization

Success:

Brains collaborate.

---

# Phase 10 — Universal Brain

Duration:
Ongoing

RFCs:

- RFC-0016
- RFC-0018

Goal:

Validate universality.

Deliverables:

- World Brain
- Company Brain
- Personal Brain
- Research Brain

Success:

Protocol works across domains.

---

# Technical Stack

Backend:

TypeScript (Node.js, strict mode)

Schemas:

Zod in delphi-core — single source of truth for
runtime validation, LLM structured outputs, API contracts,
and DB types. RFC schema notation maps 1:1.

Extraction Sidecar:

sodium ai-service (Python/FastAPI), reused as-is over HTTP:

- BGE-M3 embeddings (1024-dim, multilingual, local ONNX)
- PaddleOCR
- faster-whisper transcription

delphi-ingestion/extraction call it; never reimplement it.

Database:

PostgreSQL (Drizzle ORM)

Search:

pgvector

LLM:

Anthropic API, tiered by pipeline stage:

- Extraction (high volume): claude-haiku-4-5 via Batch API
- Entity-resolution adjudication: claude-sonnet-4-6
- Index/map generation, research agent: claude-opus-4-8

Structured outputs validated with Zod.

PDF ingestion may use Claude-native PDF reading (with citations)
or the sidecar's OCR pipeline, per asset.

Optional:

Typesense

Queues:

pg-boss (Postgres-backed) initially

Later:

SQS

---

# Agent Runtime

Initial:

Workflow-driven agents

Later:

Persistent agent ecosystem

Agents should remain stateless.

Brains own memory.

---

# First Production Brain

Recommendation:

Goatlab Brain

Reasons:

- Known domain
- Existing knowledge
- Existing ADRs
- Existing projects
- Real users

---

# First Ontology Packs

Build first:

@delphi/core

@delphi/company
(ported from the careium-brain kind taxonomy and JSON Schemas —
see DELPHI-MVP-0002, do not redesign)

Later:

@delphi/legal
@delphi/research
@delphi/design

---

# First Metrics

Track:

Number of Leaves

Evidence Coverage

Confidence Distribution

Knowledge Debt

Research Throughput

Decision Coverage

Evaluation Coverage

---

# Anti-Goals

Do NOT build:

- Neo4j first
- Distributed systems first
- Federation first
- Autonomous agents first

Build foundations first.

---

# Major Risks

Risk:
Ontology Explosion

Mitigation:
Ontology governance

---

Risk:
Knowledge Debt Growth

Mitigation:
Knowledge economics

---

Risk:
Agent Hallucinations

Mitigation:
Evidence requirements

---

Risk:
Federation Complexity

Mitigation:
Delay federation

---

# Team Structure

Suggested:

1 Platform Engineer

1 Knowledge Engineer

1 Agent Engineer

Optional:

Domain Experts

---

# MVP Success Criteria

Within six months:

- Store knowledge
- Link evidence
- Calculate confidence
- Execute evaluations
- Track decisions
- Search effectively
- Run research tasks

---

# V1 Success Criteria

Within twelve months:

- Ontology evolution
- Knowledge economics
- Agent runtime
- Federation
- Multi-brain ecosystem

---

# Long-Term Vision

Delphi becomes:

A distributed network of brains that continuously improve their understanding of reality through evidence, evaluation, decision-making, and research.

---

# Final Principle

Do not start by building the most intelligent system.

Start by building the smallest brain that can learn.
