---
name: spec-open-areas-and-implementation-build-order
type: research
status: closed
region: Spec
topics:
  - specification-gaps
  - open-areas
  - build-order
  - implementation-roadmap
  - security-and-access
  - temporal-queries
  - human-review-ui
  - RFC-9999
  - RFC-0017
  - DELPHI-MVP-0001
sources:
  - rfcs/RFC-9999-Delphi-Specification-Index.md
  - rfcs/RFC-0017-Implementation-Roadmap.md
  - rfcs/DELPHI-MVP-0001-First-Implementation-Plan.md
---

# Delphi Specification: Open Areas, Known Gaps, and Build Order

## What the Specification Currently Covers

RFC-9999 §"Specification Status" reports that all RFCs through RFC-0031
are written (Status: Draft). The 32 documents span:

- Meta model and leaf protocol (RFC-0001, RFC-0002)
- Knowledge and confidence theory (RFC-0003)
- Evidence and provenance (RFC-0004)
- Evaluation and rubrics (RFC-0005)
- Ontology system and governance (RFC-0006, RFC-0015, RFC-0025)
- Search, navigation, agents (RFC-0007, RFC-0008, RFC-0013)
- Brains and federation (RFC-0009, RFC-0014)
- Infrastructure and runtime (RFC-0010, RFC-0017)
- Decision theory and economics (RFC-0011, RFC-0012)
- Example brains (RFC-0016)
- Universal knowledge model (RFC-0018)
- Indexes, maps, DQL, regions (RFC-0019, RFC-0023, RFC-0024, RFC-0028)
- Extraction pipeline and candidate staging (RFC-0020, RFC-0027, RFC-0031)
- Epistemology and dependency propagation (RFC-0021, RFC-0022)
- Tasks, execution, and scheduling (RFC-0026, RFC-0029, RFC-0030)

**Source:** RFC-9999 §"Specification Status".

## Known Open Areas (No RFC Yet)

RFC-9999 explicitly identifies three areas without a covering RFC:

### 1. Security and Access Control

What is missing:
- Visibility enforcement (which agents/users can read which leaves)
- PII handling within the knowledge graph
- Federation trust details (how much to trust knowledge from a peer Brain)

This gap affects any multi-tenant or multi-brain deployment. Until covered,
access control must be implemented at the application layer outside the
protocol.

**Source:** RFC-9999 §"Known open areas" → "Security & Access Control".

### 2. Human Review Interface — UI Surface

What is missing:
- The approval UI for the HITL review queue
- The frontend surfaces for reviewing FLAGGED candidates (RFC-0031)

Note: RFC-0031 now covers the *review queue protocol* (state machine,
approve/reject/defer actions, TTL, back-pressure). What remains unspecified
is the UI layer through which human stewards interact with that queue.

**Source:** RFC-9999 §"Known open areas" → "Human Review Interface".

### 3. Temporal Queries

What is missing:
- As-of-time traversal ("What did the Brain believe on 2025-01-01?")
- Point-in-time knowledge graph snapshots
- Historical confidence tracking over time

RFC-0024 (Delphi Query Language) lists temporal queries as a future
extension, but no RFC has yet specified the full temporal query model.

**Source:** RFC-9999 §"Known open areas" → "Temporal Queries";
RFC-0024 §"Future Extensions".

## The Canonical Build Order

RFC-9999 §"Suggested Build Order" provides the implementation sequence.
This is the order in which a new implementation team should build the system:

### Phase 1 — Storage Foundation (RFC-0002, RFC-0010)
- Leaves, events, and the storage schema
- PGlite for local development; PostgreSQL for production
- Migration baseline

### Phase 2 — Knowledge and Evidence (RFC-0003, RFC-0004)
- Confidence formula implementation (6-component weighted sum)
- Evidence model and provenance tracking

### Phase 3 — Evaluation (RFC-0005)
- Rubrics and evaluation engine
- Quality gates

### Phase 4 — Ontology (RFC-0006)
- Type system and classification
- Ontology validation rules

### Phase 5 — Search and Navigation (RFC-0007)
- Index-first navigation (not vector-first)
- Full-text search over leaves

### Phase 6 — Agents (RFC-0008, RFC-0013)
- Research agent architecture
- Capability profiles

### Phase 7 — Decision Making (RFC-0011, RFC-0012)
- Knowledge economics and priority formula
- Decision lifecycle and traceability

### Phase 8 — Federation (RFC-0009, RFC-0014)
- Brain-to-brain communication
- MCP surface

**Source:** RFC-9999 §"Suggested Build Order".

## The Eleven-Phase Reading Order

For understanding the specification before implementation, RFC-9999 defines
an eleven-phase reading sequence:

| Phase | RFCs | Purpose |
|---|---|---|
| 1 — Foundations | RFC-0000, 0001, 0002, 0003 | What Delphi is; what it is made of |
| 2 — Trust | RFC-0004, 0005 | Why we believe things; quality evaluation |
| 3 — Structure | RFC-0006, 0015 | Classification; schema evolution |
| 4 — Intelligence | RFC-0007, 0008, 0013 | How agents think and navigate |
| 5 — Networks | RFC-0009, 0014 | Brain communication; interoperability |
| 6 — Runtime | RFC-0010, 0017 | How Delphi is built and deployed |
| 7 — Decision Making | RFC-0012, 0011 | Decisions; uncertainty prioritization |
| 8 — Universality | RFC-0016, 0018 | Domain independence; universal model |
| 9 — Understanding & Navigation | RFC-0019, 0023, 0024, 0028 | Indexes; maps; regions |
| 10 — Knowledge Lifecycle | RFC-0020, 0027, 0031, 0021, 0022 | Extraction; staging; epistemology |
| 11 — Evolution & Work | RFC-0025, 0026, 0029, 0030 | Tasks; execution; scheduling |

**Source:** RFC-9999 §"Recommended Reading Order".

## Why There Is No Security RFC Yet

The spec currently treats security as an application-layer concern. The
prioritization decision (implicit in RFC-9999) is that the foundational
knowledge model must be correct before access control is layered on top.
The correct object model for leaves, beliefs, and evidence makes it much
easier to reason about what should be visible to whom. Building security
into a flawed model would mean re-designing it twice.

This is consistent with RFC-0000 (Constitution) §"Evolution First" — the
spec evolves in the order that maximizes correctness of the foundational
model before adding complexity.

**Source:** RFC-9999 §"Known open areas"; RFC-0000 §"Evolution First".

## What the Spec Answers vs What It Defers

| Question | Answered By | Deferred |
|---|---|---|
| What is a belief? | RFC-0003 | — |
| How is confidence calculated? | RFC-0003 | Decay rates per domain |
| How are candidates staged? | RFC-0031 | UI for stewards |
| How do regions form? | RFC-0028 | Graph-community detection (post-MVP) |
| How do brains federate? | RFC-0009, 0014 | Trust enforcement |
| How are temporal queries expressed? | — | RFC-0024 future extension |
| Who can see which leaves? | — | Security RFC (planned) |

## Canonical Questions This Answers

- *Are there known gaps in the Delphi specification?* — Yes. Three areas
  have no covering RFC: Security & Access Control, Human Review UI surface,
  and Temporal Queries.
- *Is security out of scope for Delphi?* — No, it is deferred. RFC-9999
  acknowledges it as an open area. The prioritization is correctness of the
  foundational model before layering access control.
- *What order should the spec be read in?* — RFC-9999's eleven-phase reading
  order, starting with RFC-0000 (Constitution) and RFC-0001 (Meta Model).
- *What is the build order for a new Delphi implementation?* — Eight phases
  per RFC-9999: storage → knowledge/evidence → evaluation → ontology →
  search → agents → decision making → federation.
- *Are the RFCs complete?* — All RFCs through RFC-0031 are written (status:
  Draft). The three known open areas have no RFC yet.
- *What are temporal queries?* — As-of-time traversal of the knowledge
  graph (e.g., "What did the Brain believe on 2025-01-01?"). Listed as a
  future extension in RFC-0024 with no covering RFC yet.
- *What is the final goal of the Delphi specification?* — Per RFC-9999:
  "a system for continuously improving an intelligent model of reality."
  The goal is not to answer questions; the goal is to continuously improve
  understanding.
