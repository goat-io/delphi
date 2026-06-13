---
name: implementation-roadmap-and-phases
type: research
status: closed
region: Spec
topics:
  - implementation-roadmap
  - phases
  - mvp
  - technical-stack
  - risks
  - success-criteria
  - RFC-0017
sources:
  - rfcs/RFC-0017-Implementation-Roadmap.md
  - rfcs/DELPHI-MVP-0001-First-Implementation-Plan.md
  - rfcs/DELPHI-MVP-0002-Prior-Art-and-Reuse.md
---

# Delphi Implementation Roadmap

## Guiding Principle

RFC-0017 translates the Delphi specification into an executable engineering plan.
Its governing heuristic is deliberate incrementalism: "Do not build Delphi all at
once. Build the smallest possible Brain. Prove assumptions. Expand incrementally."
The goal is to minimize risk, deliver value early, avoid over-engineering, and
enable continuous evolution.

**Source:** RFC-0017 §"Guiding Principle" (lines 26–35).

## MVP Definition

RFC-0017 §"MVP Definition" (lines 55–73) scopes the minimum viable Brain to six
capabilities:

1. Leaves
2. Evidence
3. Relationships
4. Search
5. Confidence
6. Tasks

Explicitly **not** in MVP: federation, ontology evolution, autonomous research,
complex agents. This scope discipline prevents the most common failure mode —
building infrastructure before proving the knowledge model.

## The North Star

The final vision — what the roadmap is building toward — is a continuously
operating loop:

```
Question → Research → Evidence → Beliefs → Evaluation
→ Decisions → Tasks → Observation → Knowledge Update
```

Continuously. This is the closed-loop system the implementation phases approach
incrementally.

**Source:** RFC-0017 §"North Star" (lines 37–52).

## Ten Implementation Phases

RFC-0017 §"Phase 0" through §"Phase 10" (lines 74–375) defines the delivery
sequence, each phase tied to specific RFCs:

| Phase | Duration | RFCs | Deliverable | Success Signal |
|-------|----------|------|-------------|----------------|
| 0 — Bootstrap | 1–2 wk | — | Monorepo, CI/CD, DB migrations, API skeleton | Repo runs locally |
| 1 — Core Brain | 2–4 wk | RFC-0002, RFC-0010 | Brain model, leaves, events, edges, CRUD, audit trail | Can create and retrieve leaves |
| 2 — Knowledge Layer | 2–4 wk | RFC-0003, RFC-0004 | Beliefs, evidence, provenance, confidence, contradictions | Every belief can explain itself |
| 3 — Search Layer | 2–3 wk | RFC-0007 | Full-text search, pgvector, graph traversal APIs | Agent can discover relevant knowledge |
| 4 — Evaluation Layer | 2–4 wk | RFC-0005 | Rubrics, evaluations, scoring, quality gates | Outputs become measurable |
| 5 — Decision Layer | 2–3 wk | RFC-0012 | Decision leaves, alternatives, risks, consequences | Decisions become traceable |
| 6 — Ontology Layer | 3–5 wk | RFC-0006, RFC-0015 | Ontology packs, relationship types, validation rules, migrations | Brains become extensible |
| 7 — Research Engine | 4–8 wk | RFC-0008, RFC-0013 | Research tasks, agent runtime, capability registry, methodologies | Agents can improve knowledge |
| 8 — Knowledge Economics | 2–4 wk | RFC-0011 | Knowledge debt engine, research ROI, prioritization scores | Brain knows what to learn next |
| 9 — Federation | 4–8 wk | RFC-0009, RFC-0014 | Brain manifests, import/export, references, synchronization | Brains collaborate |
| 10 — Universal Brain | Ongoing | RFC-0016, RFC-0018 | World/Company/Personal/Research Brains | Protocol works across domains |

## Technical Stack

RFC-0017 §"Technical Stack" (lines 377–427) specifies the canonical implementation
choices:

| Layer | Choice | Notes |
|-------|--------|-------|
| Backend | TypeScript / Node.js (strict mode) | Zod schemas as single source of truth |
| Schemas | Zod in delphi-protocol | Maps 1:1 to RFC schema notation |
| Extraction sidecar | sodium ai-service (Python/FastAPI) | BGE-M3 1024-dim, PaddleOCR, faster-whisper — reused as-is over HTTP, never reimplemented |
| Database | PostgreSQL + Drizzle ORM | — |
| Vector search | pgvector | — |
| LLM (extraction, high volume) | claude-haiku-4-5 via Batch API | — |
| LLM (entity resolution) | claude-sonnet-4-6 | — |
| LLM (index/map generation, research) | claude-opus-4-8 | — |
| Structured outputs | Zod validation | — |
| Queue | pg-boss (Postgres-backed) → SQS later | — |
| Optional search | Typesense | — |

## First Production Brain

RFC-0017 recommends the **Goatlab Brain** as the first real-world target because it
offers a known domain, existing knowledge and ADRs, existing projects, and real users.
This is the safest first brain — the team can validate the protocol against knowledge
they already understand.

**Source:** RFC-0017 §"First Production Brain" (lines 450–463).

## First Ontology Packs

Build first: `@delphi/core`, then `@delphi/company` (ported from the careium-brain
kind taxonomy and JSON Schemas — see DELPHI-MVP-0002, do not redesign). Deferred:
`@delphi/legal`, `@delphi/research`, `@delphi/design`.

**Source:** RFC-0017 §"First Ontology Packs" (lines 465–482).

## First Metrics to Track

RFC-0017 §"First Metrics" (lines 484–499) defines the health indicators to monitor
from the start:

- Leaf count
- Evidence coverage
- Confidence distribution
- Knowledge Debt level
- Research throughput
- Decision coverage
- Evaluation coverage

## Four Major Risks

RFC-0017 §"Major Risks" (lines 516–549) identifies the four risks most likely to
derail implementation:

| Risk | Mitigation |
|------|-----------|
| Ontology Explosion | Ontology governance (RFC-0025) |
| Knowledge Debt Growth | Knowledge economics (RFC-0011) |
| Agent Hallucinations | Evidence requirements (RFC-0004) |
| Federation Complexity | Delay federation to Phase 9 |

## Anti-Goals

RFC-0017 §"Anti-Goals" (lines 504–513) explicitly prohibits building these first:
Neo4j, distributed systems, federation, autonomous agents. Build foundations first.
The fastest path to a useful Brain is through simplicity.

## Agent Runtime Principle

Agents should remain stateless. Brains own memory. Workflow-driven agents come first;
a persistent agent ecosystem is a later phase. This keeps the system verifiable and
avoids hidden state that prevents reproducibility.

**Source:** RFC-0017 §"Agent Runtime" (lines 434–447).

## MVP and V1 Success Criteria

**MVP (within six months):** store knowledge, link evidence, calculate confidence,
execute evaluations, track decisions, search effectively, run research tasks.

**V1 (within twelve months):** ontology evolution, knowledge economics, agent runtime,
federation, multi-brain ecosystem.

**Long-term vision:** "A distributed network of brains that continuously improve
their understanding of reality through evidence, evaluation, decision-making, and
research."

**Source:** RFC-0017 §"MVP Success Criteria" and §"V1 Success Criteria" (lines 567–597).
