---
name: prerequisite-topology-and-spec-reading-order
type: research
status: closed
region: Spec
topics:
  - reading-order
  - prerequisites
  - dependency-graph
  - specification-index
  - RFC-9999
  - RFC-0000
  - phase-ordering
sources:
  - rfcs/RFC-9999-Delphi-Specification-Index.md
  - rfcs/RFC-0017-Implementation-Roadmap.md
  - rfcs/RFC-0018-Universal-Knowledge-Model.md
---

# RFC Prerequisite Topology and Recommended Reading Order

## Which Topics Are Prerequisites for Which?

RFC-9999 §"Dependency Graph" is the authoritative source. The graph is a
directed acyclic tree rooted at RFC-0000 (Constitution):

```
RFC-0000 (Constitution)
│
└── RFC-0001 (Meta Model)
    │
    └── RFC-0002 (Leaf Protocol)
        ├── RFC-0003 (Knowledge & Confidence Theory)
        │   ├── RFC-0004 (Evidence & Provenance)
        │   │   ├── RFC-0020 (Works, Assets & Knowledge Extraction)
        │   │   │   └── RFC-0027 (Extraction & Entity Resolution)
        │   │   │       └── RFC-0031 (Candidate Staging Protocol)
        │   │   └── RFC-0021 (Epistemology & Truth Model)
        │   ├── RFC-0005 (Evaluation & Rubrics)
        │   ├── RFC-0012 (Decision Theory)
        │   ├── RFC-0011 (Knowledge Economics)
        │   └── RFC-0022 (Dependency & Impact Propagation)
        │
        ├── RFC-0006 (Ontology System)
        │   ├── RFC-0015 (Migration & Versioning)
        │   └── RFC-0025 (Ontology Evolution & Governance)
        │
        ├── RFC-0019 (Knowledge Indexes & Hierarchical Summaries)
        │   ├── RFC-0023 (Knowledge Maps)
        │   ├── RFC-0024 (Delphi Query Language)
        │   └── RFC-0028 (Knowledge Regions & Index Lifecycle)
        │
        ├── RFC-0007 (Search & Navigation)
        ├── RFC-0008 (Agents & Research Engine)
        │   └── RFC-0026 (Tasks & Questions)
        │       └── RFC-0029 (Task Execution Protocol)
        │           └── RFC-0030 (Task Scheduling & Priority Queue)
        ├── RFC-0013 (Capabilities & Methodologies)
        ├── RFC-0009 (Brains & Federation)
        ├── RFC-0014 (APIs & Contracts)
        ├── RFC-0010 (Infrastructure & Runtime)
        ├── RFC-0016 (Example Brains)
        └── RFC-0018 (Universal Knowledge Model)
```

**Source:** RFC-9999 §"Dependency Graph" (lines 168–218).

## Recommended Reading Order (11 Phases)

RFC-9999 §"Recommended Reading Order" organizes the 32 RFCs into 11 phases.
Each phase is a prerequisite for the next:

| Phase | RFCs | What It Teaches |
|-------|------|-----------------|
| 1 — Foundations | RFC-0000, RFC-0001, RFC-0002, RFC-0003 | What Delphi is; what a leaf is; what knowledge is |
| 2 — Trust | RFC-0004, RFC-0005 | Why we believe things; how we measure quality |
| 3 — Structure | RFC-0006, RFC-0015 | How knowledge is classified; how classification evolves |
| 4 — Intelligence | RFC-0007, RFC-0008, RFC-0013 | How agents navigate; how agents perform work |
| 5 — Networks | RFC-0009, RFC-0014 | How brains communicate and interoperate |
| 6 — Runtime | RFC-0010, RFC-0017 | How Delphi is built and deployed |
| 7 — Decision Making | RFC-0012, RFC-0011 | How decisions are made; how uncertainty is prioritized |
| 8 — Universality | RFC-0016, RFC-0018 | Why the protocol is domain-independent |
| 9 — Understanding & Navigation | RFC-0019, RFC-0023, RFC-0024, RFC-0028 | How knowledge is compressed and navigated |
| 10 — Knowledge Lifecycle | RFC-0020, RFC-0027, RFC-0031, RFC-0021, RFC-0022 | Extraction pipeline; truth model; impact propagation |
| 11 — Evolution & Work | RFC-0025, RFC-0026, RFC-0029, RFC-0030 | Ontology evolution; task lifecycle; scheduling |

**Source:** RFC-9999 §"Recommended Reading Order" (lines 55–180).

## Key Prerequisite Relationships

### Cannot understand RFC-0008 (Agents) without RFC-0007 (Navigation)
Agents must navigate first (RFC-0007). The rule "Navigation precedes
retrieval" is established in RFC-0007 and presupposed by RFC-0008.

### Cannot understand RFC-0011 (Economics) without RFC-0003 (Confidence)
Research ROI depends on the Confidence Gap formula. Confidence is defined
in RFC-0003. RFC-0011 depends on RFC-0003 through RFC-0010.

### Cannot understand RFC-0022 (Propagation) without RFC-0003 + RFC-0004
Dependency propagation moves confidence values and triggers re-evaluation
of evidence. Both RFC-0003 (confidence) and RFC-0004 (evidence) must be
understood first.

### Cannot understand RFC-0019 (Indexes) without RFC-0002 (Leaves)
Indexes are generated summaries of leaves. The leaf model (RFC-0002) is
the prerequisite for understanding what indexes compress.

### Cannot implement RFC-0027 (Extraction) without RFC-0020 (Assets)
Entity resolution (RFC-0027) operates on chunks produced by the
extraction pipeline defined in RFC-0020.

**Source:** RFC-9999 §"Dependency Graph" and §"Phase" sections.

## Architecture Layer Stack (Bottom-Up)

RFC-0018 §"Delphi Architecture Stack" names the 9 conceptual layers:

| Layer | RFC | Function |
|-------|-----|----------|
| 0 | RFC-0002 | Leaf Protocol (canonical storage unit) |
| 1 | RFC-0003 | Knowledge & Confidence |
| 2 | RFC-0004 | Evidence |
| 3 | RFC-0005 | Evaluation |
| 4 | RFC-0006 | Ontology |
| 5 | RFC-0007 | Search & Navigation |
| 6 | RFC-0008 | Agents & Research |
| 7 | RFC-0009 | Brains & Federation |
| 8 | RFC-0018 | Universal Knowledge Model |
| Foundation | RFC-0000 | Constitution |

Each layer depends on all layers below it. No shortcuts.

**Source:** RFC-0018 §"Delphi Architecture Stack" (lines 258–285),
RFC-9999 §"Delphi Architecture Stack" (lines 223–250).

## Build Order vs. Reading Order

Reading order follows conceptual prerequisites. Build order is different —
it follows deliverable dependencies:

RFC-0017 §"Suggested Build Order" prescribes 8 build phases:

1. Leaves + Events + Storage (RFC-0002, RFC-0010)
2. Knowledge + Evidence + Confidence (RFC-0003, RFC-0004)
3. Rubrics + Evaluations (RFC-0005)
4. Ontology Engine (RFC-0006)
5. Search + Navigation (RFC-0007)
6. Research Agents + Capabilities (RFC-0008, RFC-0013)
7. Decision Engine + Knowledge Economics (RFC-0012, RFC-0011)
8. Federation (RFC-0009, RFC-0014)

Federation is last because it requires every foundational layer to be
stable first.

**Source:** RFC-0017 §"Suggested Build Order" (lines 185–230).

## What the Specification Does Not Yet Cover

RFC-9999 §"Specification Status" names known open areas with no RFC:

1. **Security & Access Control** — visibility enforcement, PII handling,
   federation trust details. No RFC exists yet.
2. **Human Review Interface / UI Surface** — approval UI; review queue
   protocol covered by RFC-0031 but no UI RFC exists.
3. **Temporal Queries** — as-of-time traversal is listed as a DQL future
   extension in RFC-0024 but not formally specified.

**Source:** RFC-9999 §"Specification Status" (lines 252–268).
