---
name: architecture-scalability-and-tech-stack
type: research
status: closed
region: Spec
topics:
  - architecture
  - scalability
  - deployment-phases
  - tech-stack
  - postgresql
  - pgvector
  - knowledge-plane
  - RFC-0010
  - RFC-0017
sources:
  - rfcs/RFC-0010-Infrastructure-and-Runtime.md
  - rfcs/RFC-0017-Implementation-Roadmap.md
  - rfcs/RFC-0009-Brains-and-Federation.md
  - rfcs/RFC-0018-Universal-Knowledge-Model.md
---

# Delphi Architecture, Scalability, and Tech Stack

## Which Architecture Scales Best?

RFC-0010 §"Scaling Path" defines five progressive phases, not one fixed
architecture. The guiding principle (RFC-0017 §"Guiding Principle"):

> Do not build Delphi all at once.
> Build the smallest possible Brain.
> Prove assumptions.
> Expand incrementally.

| Phase | Architecture | What It Unlocks |
|-------|-------------|-----------------|
| 1 | Monolith — single Postgres, single API, single runtime | Prove the leaf/index model works |
| 2 | Projection Services extracted | Scale index generation independently |
| 3 | Dedicated Index Infrastructure | High-throughput index regeneration |
| 4 | Distributed Agent Runtime | Parallel research at scale |
| 5 | Federated Brain Network | Multi-Brain knowledge exchange |

The answer to "which architecture scales best" is: **start at Phase 1,
validate, then advance one phase at a time**. Skipping phases creates
distributed-systems complexity before the knowledge model is proven.

**Source:** RFC-0010 §"Scaling Path" (lines 215–235), RFC-0017
§"Guiding Principle" (lines 30–38).

## Core Architectural Principle: Leaves Are Canonical, Everything Else Is Generated

RFC-0010 §"Core Principle" is the load-bearing architectural belief:

> Leaves are canonical.
> Everything else is generated.

Generated (disposable, rebuildable) artifacts:
- Knowledge Indexes
- Search Indexes
- Embeddings
- Graph Views
- Knowledge Maps

This means the database schema only needs to be durable for the canonical
tables. Everything else can be destroyed and rebuilt from events.

**Source:** RFC-0010 §"Core Principle" (lines 25–40), §"Canonical Rules"
(lines 238–252).

## Canonical Storage: PostgreSQL

RFC-0010 §"Canonical Storage" and RFC-0017 §"Technical Stack" both specify
PostgreSQL as the canonical store:

Canonical tables (RFC-0010 §"Canonical Tables"):
```
brains
leaves
leaf_events
edges
tasks
ontology_packs
federation_links
```

Generated/projection tables:
```
knowledge_indexes
knowledge_maps
leaf_embeddings
```

Everything in the generated tables must be rebuildable from the canonical
tables via the projection pipeline.

**Source:** RFC-0010 §"Canonical Storage" (lines 82–92), §"Canonical Tables"
(lines 94–105), §"New Projection Tables" (lines 107–114).

## Reference Tech Stack

RFC-0017 §"Technical Stack" specifies the full stack:

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Backend language | TypeScript (Node.js, strict mode) | Single language across packages |
| Schema validation | Zod in delphi-core | Single source of truth for runtime, LLM outputs, API, and DB types |
| Database | PostgreSQL with Drizzle ORM | Proven, ACID, supports pgvector |
| Vector search | pgvector | Embedded in Postgres, no separate service |
| Extraction sidecar | sodium ai-service (Python/FastAPI) | Reused as-is: OCR, transcription, BGE-M3 embeddings |
| Embeddings | BGE-M3 (1024-dim, multilingual, local ONNX) | Multilingual, local inference, no API cost |
| LLM — extraction (high volume) | claude-haiku-4-5 via Batch API | Cost-efficient for bulk extraction |
| LLM — adjudication | claude-sonnet-4-6 | Quality threshold for entity resolution |
| LLM — index/research | claude-opus-4-8 | Highest quality for index generation and research agents |
| Queue | pg-boss (Postgres-backed) → SQS | Postgres-native queue, upgrade to SQS at scale |
| Optional search | Typesense | For faceted, relevance-ranked full-text at scale |

**Source:** RFC-0017 §"Technical Stack" (lines 180–220).

## Event Sourcing: Every Change Produces an Immutable Event

RFC-0010 §"Event Sourcing" defines the event model:

Key events:
```
LEAF_CREATED
LEAF_UPDATED
EVIDENCE_ADDED
CONFIDENCE_CHANGED
INDEX_REGENERATED
ONTOLOGY_CHANGED
```

Events flow into the Projection Pipeline:
```
Event → Projection Engine → Index Generator → Search Index → Embeddings → Knowledge Maps
```

All projections are rebuildable from events. This is what makes the
generated/canonical distinction enforceable: you can always wipe projections
and replay events to restore them.

**Source:** RFC-0010 §"Event Sourcing" (lines 118–132), §"Projection Pipeline"
(lines 133–144).

## Runtime Components

RFC-0010 §"Runtime Components" lists 11 core services:

1. **API Service** — HTTP endpoints
2. **Brain Runtime** — leaf/event coordination
3. **Event Processor** — processes and fans out events
4. **Index Generator** — transforms knowledge regions into navigable summaries
5. **Search Indexer** — maintains pgvector and full-text indexes
6. **Embedding Generator** — produces BGE-M3 embeddings
7. **Confidence Engine** — recalculates confidence on belief/evidence changes
8. **Knowledge Debt Engine** — produces missing-evidence and research tasks
9. **Agent Runtime** — executes research agents
10. **Scheduler** — staleness checks, index regeneration, sync jobs
11. **Federation Gateway** — cross-Brain knowledge exchange

MVP needs only components 1–4 (API, Brain Runtime, Event Processor, Index
Generator). Others are added as the system matures.

**Source:** RFC-0010 §"Runtime Components" (lines 42–60).

## Search vs. Navigation: Two Different Capabilities

RFC-0010 §"Search Infrastructure" distinguishes explicitly:

| Capability | Question It Answers | When to Use |
|-----------|---------------------|-------------|
| Search | "Where might this exist?" | When the agent doesn't know what to navigate to |
| Navigation | "Where should I go next?" | When the agent has a known starting context |

The canonical Delphi retrieval path (RFC-0010 §"Retrieval Pipeline"):
```
Question
↓ Brain Index (navigation)
↓ Domain Index (navigation)
↓ Topic Index (navigation)
↓ Leaf (retrieval)
↓ Evidence (retrieval)
↓ Answer
```

Vector search / pgvector is a fallback for when navigation fails, not the
primary path.

**Source:** RFC-0010 §"Search Infrastructure" (lines 148–163),
§"Retrieval Pipeline" (lines 165–180).

## Anti-Goals: What Not to Build First

RFC-0017 §"Anti-Goals" lists explicit prohibitions for the first build:

- Do NOT start with Neo4j (use Postgres graph traversal first)
- Do NOT build distributed systems first
- Do NOT build federation first
- Do NOT build autonomous agents first

The pattern: build the knowledge model correctly before adding
distribution, federation, or autonomy. Each adds complexity that
compounds on top of any foundational mistakes.

**Source:** RFC-0017 §"Anti-Goals" (lines 234–244).

## MVP Success Criteria

RFC-0017 §"MVP Success Criteria" defines success within six months:

1. Store knowledge (leaves + evidence)
2. Link evidence
3. Calculate confidence
4. Execute evaluations
5. Track decisions
6. Search effectively
7. Run research tasks

These seven capabilities correspond to build phases 1–7. Phase 8
(Knowledge Economics) and Phase 9 (Federation) are V1 targets.

**Source:** RFC-0017 §"MVP Success Criteria" (lines 250–262).
