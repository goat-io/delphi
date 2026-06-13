---
name: infrastructure-and-runtime-architecture
type: research
status: closed
region: Spec
topics:
  - infrastructure
  - runtime
  - event-sourcing
  - projection-pipeline
  - search
  - deployment
  - observability
  - RFC-0010
sources:
  - rfcs/RFC-0010-Infrastructure-and-Runtime.md
---

# Infrastructure & Runtime Architecture

## The Governing Principle

RFC-0010 is organized around a single architectural distinction that drives every
decision: **knowledge storage ≠ knowledge understanding**. Leaves store canonical
knowledge. Indexes provide understanding. The runtime must support both, and the
two planes must never be confused.

**Source:** RFC-0010 §"Core Principle" (lines 32–47).

## Canonical vs Generated

RFC-0010 draws a hard boundary between what is canonical and what is generated:

| Canonical (source of truth) | Generated (projections, rebuildable) |
|-----------------------------|--------------------------------------|
| Leaves | Knowledge Indexes |
| Events | Search Indexes |
| Edges | Embeddings |
| Ontology packs | Graph Views |
| Tasks | Knowledge Maps |

Generated artifacts are **never** sources of truth. Every projection can and should
be rebuilt from the canonical tables at any time.

**Source:** RFC-0010 §"Core Principle" (lines 32–47) and §"Canonical Storage" (lines 111–128).

## High-Level Architecture

The data flow is:

```
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
```

**Source:** RFC-0010 §"High-Level Architecture" (lines 51–65).

## Eleven Runtime Components

RFC-0010 §"Runtime Components" (lines 69–83) enumerates eleven first-class services:

1. **API Service** — external protocol surface
2. **Brain Runtime** — coordinates all operations within a brain
3. **Event Processor** — consumes events and drives projections
4. **Index Generator** — transforms leaf regions into navigable summaries (4-tier: Brain → Domain → Topic → Leaf)
5. **Search Indexer** — full-text and vector indexing
6. **Embedding Generator** — produces BGE-M3 vector representations
7. **Confidence Engine** — recalculates belief scores on evidence changes
8. **Knowledge Debt Engine** — produces research/evaluation tasks from coverage gaps
9. **Agent Runtime** — executes research tasks in a stateless manner
10. **Scheduler** — drives staleness checks, index regeneration, research planning
11. **Federation Gateway** — inter-brain exchange via public contracts

## Canonical Tables

RFC-0010 defines the seven tables that hold canonical data. Everything else is
rebuildable:

```
brains
leaves
leaf_events
edges
tasks
ontology_packs
federation_links
```

Three additional projection tables are generated artifacts:

```
knowledge_indexes   (generated summaries at 4 tiers)
knowledge_maps      (generated navigation routes)
leaf_embeddings     (generated vector representations)
```

**Source:** RFC-0010 §"Canonical Tables" (lines 131–141) and §"New Projection Tables" (lines 143–153).

## Event Sourcing Model

Every knowledge mutation is recorded as an immutable event. RFC-0010 §"Event Sourcing"
(lines 191–210) defines the core event types:

- `LEAF_CREATED` / `LEAF_UPDATED`
- `EVIDENCE_ADDED`
- `CONFIDENCE_CHANGED`
- `INDEX_REGENERATED`
- `ONTOLOGY_CHANGED`

Events drive the Projection Pipeline: each event triggers the projection engine,
which regenerates the affected indexes, search entries, embeddings, and maps.
All projections are rebuildable from the event log.

## Progressive Compression

Every significant knowledge region exposes four summary tiers — Tiny, Short, Medium,
Long. The runtime generates these automatically. This ensures that any agent consuming
an index can choose the compression level appropriate to its remaining context budget.

**Source:** RFC-0010 §"Progressive Compression" (lines 174–189).

## Agent Execution Model

Agents in the runtime **never** start from raw leaves or database access. The
prescribed execution flow is:

```
Task → Agent → Indexes → Leaves → Evidence → Proposal → Validation → Event
```

"Agents never start with leaves. Agents start with indexes." This enforces
navigation before retrieval and ensures agents do not bypass the understanding layer.

**Source:** RFC-0010 §"Agent Runtime" (lines 324–343) and §"Agent Execution Model" (lines 345–363).

## Search vs Navigation

RFC-0010 §"Search Infrastructure" (lines 232–242) draws an explicit distinction that
determines which component to use:

- **Search** answers: *Where might this exist?*
- **Navigation** answers: *Where should I go next?*

The canonical retrieval path is navigation-first: Brain Index → Domain Index → Topic
Index → Leaf → Evidence. Direct vector search is a fallback, not the default.

## Search Technologies

RFC-0010 §"Search Technologies" (lines 273–287) recommends:
- **Primary:** PostgreSQL Full Text + pgvector
- **Optional:** Typesense, OpenSearch

The recommendation to start with Postgres avoids premature infrastructure complexity.
Similarly, graph projections should start from Leaves + Edges in Postgres, not Neo4j.

## Multi-Tenancy

Every resource carries a `brain_id` column. Brains are the tenant boundary. Isolation
is enforced by this column, not by separate schemas or databases at the MVP stage.

**Source:** RFC-0010 §"Multi-Tenancy" (lines 413–424).

## Observability Metrics

RFC-0010 §"Observability" (lines 426–458) defines the metrics that characterize brain
health:

- Leaf count
- Index count
- Knowledge Debt level
- Confidence distribution
- Research throughput
- Evaluation coverage
- **Navigation Efficiency** — measures how quickly an agent reaches relevant knowledge;
  the target is maximum understanding with minimum context usage

## Reference Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | TypeScript / Node.js (strict mode), Zod schemas |
| Extraction sidecar | sodium ai-service (Python/FastAPI) — OCR, transcription, BGE-M3 |
| Database | PostgreSQL + Drizzle ORM |
| Vector search | pgvector |
| Optional search | Typesense |
| Queue | pg-boss (Postgres-backed) → SQS later |
| Infrastructure | Cloud Run or Kubernetes |

**Source:** RFC-0010 §"Reference Tech Stack" (lines 503–526).

## Scaling Path

RFC-0010 §"Scaling Path" (lines 478–499) defines a deliberate five-phase progression:

1. **Monolith** — single Postgres, single API, single runtime, single queue
2. **Projection Services** — projection pipeline extracted as separate services
3. **Dedicated Index Infrastructure** — index generation scales independently
4. **Distributed Agent Runtime** — agent execution decoupled from core brain
5. **Federated Brain Network** — inter-brain federation at scale

MVP targets Phase 1 entirely. Federation is explicitly deferred.

## Ten Canonical Rules

RFC-0010 §"Canonical Rules" (lines 528–540) states the invariants that all
implementations must uphold:

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
