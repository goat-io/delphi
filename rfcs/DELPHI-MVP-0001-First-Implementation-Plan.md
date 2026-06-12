# DELPHI-MVP-0001 — First Implementation Plan
## From RFCs to Running Software

Status: Implementation Blueprint

---

# Goal

Build the smallest possible Delphi implementation that validates the architecture.

We are not building:

- Federation
- Multi-brain ecosystems
- Advanced agent coordination
- Knowledge economics
- Full ontology governance

We are building a system that can:

1. Ingest documents
2. Extract knowledge
3. Store knowledge
4. Build indexes
5. Build maps
6. Answer questions
7. Explain its reasoning

---

# Success Criteria

Given 100 PDFs about a domain (example: TigerBeetle):

Delphi should:

- Extract concepts
- Extract beliefs
- Extract evidence
- Build relationships
- Generate indexes
- Generate maps
- Answer questions
- Explain confidence
- Show dependencies

If this works, the architecture is validated.

---

# MVP Scope

Single Brain

Single PostgreSQL Database

Single Agent

Single Index Generator

Single Knowledge Domain

No Federation

No Multi-Tenant Support

---

# Repository Structure

```text
packages/

  delphi-core/
  delphi-brain/
  delphi-ingestion/
  delphi-extraction/
  delphi-indexer/
  delphi-agent/

apps/

  api/
  worker/
```

---

# Package Responsibilities

## delphi-core

Contains RFC primitives.

```ts
Brain
Leaf
Evidence
Relationship
Index
Map
Task
```

No database access.

No AI.

Only contracts.

---

## delphi-brain

Persistence layer.

Responsibilities:

- PostgreSQL access
- Leaf storage
- Relationship storage
- Evidence storage
- Asset metadata

---

## delphi-ingestion

Responsible for:

- PDF ingestion
- Website ingestion
- Video metadata ingestion

Heavy lifting (OCR, transcription, embeddings) is delegated
to the existing sodium ai-service over HTTP — never reimplemented.

Outputs:

Assets

---

## delphi-extraction

Implements RFC-0027.

Responsible for:

- OCR
- Transcription
- Chunking
- Candidate extraction (concepts, beliefs, questions)
- Entity resolution (merge / create / link / flag)
- Evidence attachment

Extraction produces Candidates.

Candidates are resolved against existing leaves
BEFORE anything becomes canonical (RFC-0027).

Outputs:

Leaves (new knowledge)

Evidence (attached to existing leaves)

Relationships

---

## delphi-indexer

Implements RFC-0019 and RFC-0028.

Responsible for:

- Region formation (seeded domains + hub detection)
- Knowledge Indexes
- Knowledge Maps
- Summaries

Regeneration is debounced and budgeted (RFC-0028).

Events mark indexes dirty; a scheduler regenerates.

Bulk ingestion suspends regeneration until the batch completes.

Outputs:

Indexes

Maps

---

## delphi-agent

Single research agent.

Flow:

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

---

# PostgreSQL Schema

## brains

```sql
CREATE TABLE brains (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL
);
```

---

## assets

```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY,
  brain_id UUID NOT NULL,

  type TEXT NOT NULL,

  title TEXT NOT NULL,

  uri TEXT NOT NULL,

  checksum TEXT,

  created_at TIMESTAMP NOT NULL
);
```

Assets are stored externally.

S3/GCS only.

---

## leaves

```sql
CREATE TABLE leaves (
  id UUID PRIMARY KEY,

  brain_id UUID NOT NULL,

  kind TEXT NOT NULL,

  title TEXT NOT NULL,

  summary TEXT,

  statement TEXT,

  confidence NUMERIC,

  status TEXT NOT NULL,

  version INTEGER NOT NULL DEFAULT 1,

  content JSONB,

  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

MVP simplification:

Updates increment `version` in place and append a leaf_event.

Full immutable version rows (RFC-0002) are deferred past MVP.

History is recoverable from leaf_events.

---

## leaf_events

```sql
CREATE TABLE leaf_events (
  id UUID PRIMARY KEY,

  leaf_id UUID NOT NULL,

  type TEXT NOT NULL,

  payload JSONB,

  created_at TIMESTAMP NOT NULL
);
```

Append-only.

Canonical per RFC-0002 rule 12:
every change creates an event.

---

## relationships

```sql
CREATE TABLE relationships (
  id UUID PRIMARY KEY,

  source_leaf_id UUID NOT NULL,

  target_leaf_id UUID NOT NULL,

  type TEXT NOT NULL,

  confidence NUMERIC,

  metadata JSONB
);
```

---

## evidence

```sql
CREATE TABLE evidence (
  id UUID PRIMARY KEY,

  leaf_id UUID NOT NULL,

  asset_id UUID NOT NULL,

  citation TEXT,

  strength NUMERIC,

  metadata JSONB
);
```

---

## indexes

```sql
CREATE TABLE indexes (
  id UUID PRIMARY KEY,

  brain_id UUID NOT NULL,

  title TEXT NOT NULL,

  summary_tiny TEXT,
  summary_short TEXT,
  summary_medium TEXT,
  summary_long TEXT,

  metadata JSONB,

  generated_at TIMESTAMP NOT NULL
);
```

---

## maps

```sql
CREATE TABLE maps (
  id UUID PRIMARY KEY,

  brain_id UUID NOT NULL,

  title TEXT NOT NULL,

  metadata JSONB,

  generated_at TIMESTAMP NOT NULL
);
```

---

# Asset Pipeline

```text
PDF
↓
Asset
↓
Text Extraction
↓
Transcript
↓
Chunking
↓
Extraction
```

Store:

- Asset metadata
- Transcript
- Chunks

Store raw files in S3.

---

# Knowledge Extraction

Input:

Chunk

Output:

Concepts

Beliefs

Questions

Evidence

Example:

Text:

"TigerBeetle provides deterministic financial transactions."

Produces:

Belief:
TigerBeetle provides deterministic financial transactions.

Evidence:
Chunk Reference

---

# Leaf Types

Initial MVP (subset of the RFC-0002 LeafKind enum):

```text
OBJECT
BELIEF
QUESTION
EVIDENCE
DECISION
TASK
```

Concepts are stored as OBJECT leaves (RFC-0002).

Keep it simple.

---

# Index Generation

Input:

Leaves

Relationships

Evidence

Generate:

Tiny Summary

Short Summary

Medium Summary

Long Summary

---

# Map Generation

Input:

Relationships

Generate:

Learning Paths

Dependency Paths

Research Paths

---

# Agent Flow

Question:

"Why use TigerBeetle?"

Process:

Read Brain Index

Read TigerBeetle Index

Read Relevant Leaves

Read Evidence

Generate Answer

---

# API Endpoints

```text
POST /assets

POST /questions

GET /leaves/:id

GET /indexes/:id

GET /maps/:id

GET /search
```

---

# Search Strategy

Phase 1:

Postgres Full Text

Phase 2:

pgvector

No Typesense initially.

---

# Index Strategy

Indexes are generated.

Never edited manually.

Regeneration policy (RFC-0028):

- Leaf/evidence changes mark indexes dirty
- Scheduler regenerates dirty indexes (debounced, max once per 15 min)
- Bulk ingestion suspends regeneration until batch completes
- Daily sweep bounds worst-case staleness

---

# First Dataset

Recommended:

TigerBeetle

Sources:

- Documentation
- GitHub Issues
- RFCs
- Blog Posts

Goal:

~100 documents

Second dataset:

careium-brain (686 real documents with frontmatter,
catalog relationships, and narratives — see DELPHI-MVP-0002).

Validates the Company Brain example (RFC-0016) end to end.

---

# First Demonstration

User asks:

"Why should I use TigerBeetle?"

Delphi returns:

- Summary
- Confidence
- Evidence
- Dependencies
- Contradictions

---

# Confidence (MVP)

The full component model (RFC-0003) is deferred.

MVP confidence per belief:

- extraction confidence (from RFC-0027 candidates)
- evidence count
- source diversity (count of distinct assets cited)

Stored as a single NUMERIC.

The simplification must be explicit in API responses
so consumers do not mistake it for the full model.

---

# Answer Quality Benchmark

"Useful without manual curation" is not measurable.

Before ingestion, write a benchmark set:

- 25 questions about the chosen domain
- For each: the expected key claims
  and the source documents that support them

After ingestion, score:

1. Answer cites correct sources
2. Key claims are present
3. Confidence is shown and plausible
4. Known contradictions surface

Target: ≥ 80% of benchmark questions pass criteria 1–3.

The benchmark is the MVP's own rubric (RFC-0005 applied to itself).

Re-run it after every pipeline change.

---

# Out Of Scope

Do not build:

- Federation
- Multi-brain synchronization
- Ontology governance
- Consensus engine
- Economics engine
- Advanced DQL

---

# Exit Criteria

The MVP is complete when:

1. Documents can be ingested.
2. Knowledge can be extracted.
3. Leaves are stored.
4. Evidence is linked.
5. Indexes are generated.
6. Maps are generated.
7. Questions can be answered.
8. Confidence is displayed.
9. Dependencies are displayed.
10. The Answer Quality Benchmark passes at ≥ 80%
    without manual curation.

At this point Delphi has proven its core thesis:
Knowledge can be transformed into understanding, navigation and reasoning through a unified protocol.
