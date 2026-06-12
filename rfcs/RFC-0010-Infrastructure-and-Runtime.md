# RFC-0010 — Infrastructure & Runtime
## Reference Implementation Architecture

Status: Draft (Rewritten after RFC-0019)

Depends On:
- RFC-0000 through RFC-0009
- RFC-0019

---

# Purpose

This RFC defines how Delphi is implemented.

The most important architectural principle is:

Knowledge Storage
≠
Knowledge Understanding

Leaves store knowledge.

Indexes provide understanding.

Therefore the runtime must support both.

---

# Core Principle

Leaves are canonical.

Everything else is generated.

Including:

- Knowledge Indexes
- Search Indexes
- Embeddings
- Graph Views
- Knowledge Maps

These are projections.

Never sources of truth.

---

# High-Level Architecture

Clients
↓
API Layer
↓
Brain Runtime
↓
PostgreSQL
↓
Events
↓
Projection Pipeline
↓
Indexes / Search / Graph / Embeddings

---

# Runtime Components

Core services:

1. API Service
2. Brain Runtime
3. Event Processor
4. Index Generator
5. Search Indexer
6. Embedding Generator
7. Confidence Engine
8. Knowledge Debt Engine
9. Agent Runtime
10. Scheduler
11. Federation Gateway

---

# The Index Generator

The Index Generator is a first-class runtime component.

Purpose:

Transform large knowledge regions into navigable summaries.

Inputs:

- Leaves
- Relationships
- Evidence
- Evaluations
- Decisions

Outputs:

- Brain Indexes
- Domain Indexes
- Topic Indexes
- Knowledge Maps

---

# Canonical Storage

Recommended:

PostgreSQL

Postgres stores:

- Brains
- Leaves
- Events
- Edges
- Tasks
- Ontologies

Indexes are generated.

---

# Canonical Tables

brains
leaves
leaf_events
edges
tasks
ontology_packs
federation_links

Everything else should be rebuildable.

---

# New Projection Tables

Suggested:

knowledge_indexes
knowledge_maps
leaf_embeddings

These are generated artifacts.

---

# Knowledge Index Projection

Example:

knowledge_indexes

- id
- brain_id
- title
- summary_tiny
- summary_short
- summary_medium
- summary_long
- confidence
- generated_at

---

# Progressive Compression

Every significant knowledge region should expose:

Tiny

Short

Medium

Long

summaries.

The runtime generates these automatically.

---

# Event Sourcing

Every change creates an event.

Examples:

LEAF_CREATED

LEAF_UPDATED

EVIDENCE_ADDED

CONFIDENCE_CHANGED

INDEX_REGENERATED

ONTOLOGY_CHANGED

---

# Projection Pipeline

Event
↓
Projection Engine
↓
Index Generator
↓
Search Index
↓
Embeddings
↓
Knowledge Maps

All projections are rebuildable.

---

# Search Infrastructure

Search is not navigation.

Search answers:

Where might this exist?

Navigation answers:

Where should I go next?

---

# Retrieval Pipeline

Old:

Question
↓
Vector Search
↓
Chunks

New:

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

This is the default Delphi path.

---

# Search Technologies

Recommended:

Postgres Full Text

plus

pgvector

Optional:

Typesense

OpenSearch

---

# Graph Infrastructure

Do not start with Neo4j.

Generate graph projections from:

Leaves + Edges

Use Postgres initially.

---

# Knowledge Maps

Knowledge Maps are generated.

Purpose:

Guide exploration.

Examples:

Roman Empire
→ Government
→ Military
→ Economy
→ Collapse

Maps describe routes.

Indexes describe regions.

---

# Agent Runtime

Agents never start with leaves.

Agents start with indexes.

Recommended flow:

Question
↓
Index Retrieval
↓
Index Traversal
↓
Leaf Retrieval
↓
Evidence Retrieval
↓
Reasoning

---

# Agent Execution Model

Task
↓
Agent
↓
Indexes
↓
Leaves
↓
Evidence
↓
Proposal
↓
Validation
↓
Event

---

# Confidence Engine

Recalculates:

- Beliefs
- Contradictions
- Dependencies
- Evidence Changes

---

# Knowledge Debt Engine

Produces:

- Missing Evidence Tasks
- Missing Evaluation Tasks
- Research Tasks
- Index Refresh Tasks

---

# Scheduler

Runs:

- Staleness Checks
- Confidence Recalculations
- Index Regeneration
- Research Planning
- Synchronization Jobs

---

# Federation Gateway

Brains exchange:

- Leaves
- Evidence
- Evaluations
- Capabilities
- Indexes

Federation should begin with indexes whenever possible.

---

# Multi-Tenancy

Brains are tenants.

Isolation:

brain_id

on every resource.

---

# Observability

Metrics:

Leaves

Indexes

Knowledge Debt

Confidence Distribution

Research Throughput

Evaluation Coverage

Navigation Efficiency

---

# New Metric

Navigation Efficiency

Measures:

How quickly an agent reaches relevant knowledge.

The goal is:

Maximum understanding
with
minimum context usage.

---

# Deployment

MVP

Single Postgres

Single API

Single Runtime

Single Queue

Single Index Generator

---

# Scaling Path

Phase 1

Monolith

Phase 2

Projection Services

Phase 3

Dedicated Index Infrastructure

Phase 4

Distributed Agent Runtime

Phase 5

Federated Brain Network

---

# Reference Tech Stack

Backend:
TypeScript (Node.js, strict mode; Zod schemas)

Extraction Sidecar:
sodium ai-service (Python/FastAPI, reused as-is over HTTP)
— OCR, transcription, BGE-M3 embeddings

Database:
PostgreSQL (Drizzle ORM)

Search:
pgvector

Optional:
Typesense

Queue:
pg-boss (Postgres-backed) → SQS

Infrastructure:
Cloud Run or Kubernetes

---

# Canonical Rules

1. Leaves are canonical.
2. Events are immutable.
3. Indexes are generated.
4. Projections are disposable.
5. Agents never own knowledge.
6. Brains own knowledge.
7. Navigation precedes retrieval.
8. Search and navigation are different.
9. Knowledge Maps are generated.
10. Everything is auditable.

---

# Success Criteria

1. All knowledge is stored as leaves.
2. Every change produces an event.
3. Indexes are generated automatically.
4. Agents navigate through indexes.
5. Projections can be rebuilt.
6. Confidence can be recalculated.
7. Knowledge debt is measurable.
8. Federation is possible.
9. Multi-tenancy is supported.
10. A brain can explain itself before exposing its knowledge.
