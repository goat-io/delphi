# RFC-0002 — Leaf Protocol
## Canonical Data Model for Delphi

Status: Draft (Rewritten after RFC-0019)

Depends On:
- RFC-0000
- RFC-0001

---

# Purpose

The Leaf Protocol defines the canonical storage model of Delphi.

Everything in Delphi is represented as a Leaf.

Examples:

- Object
- Evidence
- Belief
- Decision
- Task
- Rubric
- Ontology Type
- Relationship Type

Leaves are canonical.

Everything else is generated.

---

# Core Principle

Leaves store knowledge.

Indexes explain knowledge.

Leaves are truth.

Indexes are understanding.

---

# Design Principles

1. Everything canonical is a Leaf.
2. Leaves are immutable snapshots.
3. Changes create events.
4. Provenance is mandatory.
5. Confidence is explicit.
6. Scope is explicit.
7. Knowledge Indexes are generated.
8. Search is generated.
9. Embeddings are generated.
10. Agents read indexes before leaves.

---

# Canonical Identity

Every leaf must have a globally unique ID.

Format:

delphi://{brain}/{namespace}/{kind}/{slug}@{version}

Examples:

delphi://goatlab/company/decision/use-tigerbeetle@1.0.0

delphi://world/law/concept/roman-law@2.1.0

---

# Leaf Schema

```ts
export interface DelphiLeaf {
  id: string

  protocolVersion: string
  ontologyVersion: string

  namespace: string
  brainId: string

  kind: LeafKind
  status: LeafStatus

  title: string
  summary: string
  statement?: string

  aliases: string[]
  tags: string[]

  scope: LeafScope

  confidence?: Confidence

  provenance: Provenance

  evidence: EvidenceRef[]

  edges: Edge[]

  quality?: KnowledgeQuality

  lifecycle: Lifecycle

  content?: Record<string, unknown>

  createdAt: string
  updatedAt: string
}
```

---

# Leaf Kinds

```ts
type LeafKind =
  | "OBJECT"
  | "EVIDENCE"
  | "BELIEF"
  | "QUESTION"
  | "DECISION"
  | "TASK"
  | "RUBRIC"
  | "CAPABILITY"
  | "METHODOLOGY"
  | "WORK"
  | "EXPRESSION"
  | "ASSET"
  | "ONTOLOGY_TYPE"
  | "RELATIONSHIP_TYPE"
  | "VALIDATION_RULE"
```

Everything else extends these.

Notes:

- QUESTION is first-class per RFC-0008 and RFC-0026.
- CAPABILITY and METHODOLOGY are first-class per RFC-0013.
- WORK, EXPRESSION and ASSET are first-class per RFC-0020.
  Asset leaves store metadata only; the artifact itself remains external.
- Concepts are stored as OBJECT leaves.
  Concept vs entity distinctions belong to the ontology layer, not LeafKind.

---

# Knowledge Regions

Leaves may belong to one or more knowledge regions.

A knowledge region is a collection of leaves summarized by an index.

Example:

Roman Empire

contains:

- People
- Events
- Laws
- Economics
- Military

---

# Index Membership

Leaves should expose index membership.

```ts
interface IndexMembership {
  indexId: string

  relationship:
    | "PRIMARY"
    | "SECONDARY"

  path: string[]
}
```

Example:

World
→ History
→ Roman Empire
→ Economy

---

# Scope

Truth is scoped.

```ts
interface LeafScope {
  visibility: "PUBLIC" | "ORG" | "PRIVATE"

  jurisdiction?: string[]
  language?: string[]

  temporal?: {
    validFrom?: string
    validUntil?: string
    observedAt?: string
    verifiedAt?: string
  }

  organizationId?: string

  context?: string[]
}
```

---

# Status

```ts
type LeafStatus =
  | "DRAFT"
  | "PROPOSED"
  | "ACTIVE"
  | "DISPUTED"
  | "REFUTED"
  | "SUPERSEDED"
  | "ARCHIVED"
```

---

# Confidence

```ts
interface Confidence {
  value: number

  evidenceStrength: number
  sourceReliability: number
  sourceDiversity: number
  freshness: number
  consensus: number
  contradictionRisk: number

  explanation?: string
}
```

---

# Provenance

```ts
interface Provenance {
  createdBy: string

  createdAt: string

  derivedFrom: string[]

  reviewedBy?: string[]

  lastReviewedAt?: string

  sourceSystem?: string
}
```

Mandatory.

---

# Evidence References

```ts
interface EvidenceRef {
  sourceLeafId: string

  relation:
    | "SUPPORTS"
    | "CONTRADICTS"
    | "MENTIONS"
    | "INTERPRETS"

  strength: number
}
```

---

# Relationships

```ts
interface Edge {
  type: string

  targetId: string

  confidence?: number

  qualifiers?: Record<string, unknown>
}
```

Core relationships:

SUPPORTS

CONTRADICTS

DEPENDS_ON

DERIVED_FROM

CITES

REFERENCES

EVALUATES

REQUIRES_RESEARCH

SUPERSEDES

IS_A

PART_OF

---

# Edges vs Evidence References

EvidenceRef and Edge overlap on SUPPORTS and CONTRADICTS.

The rule:

Use an EvidenceRef when the source is an EVIDENCE or ASSET leaf.

EvidenceRefs carry citation detail:
passage, extraction confidence, strength.

Use an Edge for knowledge-to-knowledge structure.

Examples:

A belief backed by a research paper
→ EvidenceRef

Two competing beliefs
→ CONTRADICTS Edge

A belief that logically requires another belief
→ DEPENDS_ON Edge

Extraction pipelines must never represent citations as plain edges.

---

# Versioning & Mutability

Leaves are immutable snapshots.

An update:

1. Creates a new leaf version (slug unchanged, @version incremented)
2. Emits a LeafEvent
3. Keeps prior versions readable

APIs that "update" a leaf (PATCH in RFC-0014) perform this version bump.

Leaves are never hard-deleted.

Retirement happens through status:
ARCHIVED or lifecycle RETIRED.

---

# Lifecycle

```ts
interface Lifecycle {
  state:
    | "CREATED"
    | "LINKED"
    | "VALIDATED"
    | "PUBLISHED"
    | "STALE"
    | "NEEDS_RESEARCH"
    | "RETIRED"

  nextReviewAt?: string
}
```

---

# Quality Model

```ts
interface KnowledgeQuality {
  completeness: number

  evidenceQuality: number

  provenanceQuality: number

  freshness: number

  ontologyFit: number
}
```

---

# Events

Leaves are snapshots.

Events are history.

```ts
interface LeafEvent {
  id: string

  leafId: string

  type: string

  payload: Record<string, unknown>

  createdAt: string
}
```

---

# Generated Projections

Generated:

- Knowledge Indexes
- Knowledge Maps
- Search Indexes
- Embeddings
- Graph Indexes
- Dependency Graphs
- Impact Graphs

Never edit directly.

---

# Knowledge Indexes

Knowledge Indexes are not leaves.

Knowledge Indexes are generated projections.

Indexes may reference thousands of leaves.

Leaves never depend on indexes for validity.

Indexes depend on leaves.

---

# Progressive Compression

Indexes should expose:

Tiny

Short

Medium

Long

representations.

Leaves only store canonical knowledge.

---

# Agent Retrieval Model

Recommended:

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

Agents should avoid brute-force retrieval.

---

# Canonical Rules

1. Leaves are canonical.
2. Everything canonical is a Leaf.
3. Events are immutable.
4. Knowledge Indexes are generated.
5. Search is generated.
6. Embeddings are generated.
7. Every Leaf requires provenance.
8. Every Belief requires confidence.
9. Every Decision should reference beliefs.
10. Every Task should reduce uncertainty.
11. Agents should navigate through indexes.
12. Every change creates an event.

---

# MVP Implementation

Storage:

- PostgreSQL
- JSONB
- Event Table
- Edge Table

Generated:

- Knowledge Indexes
- Search Projections
- Embeddings

No graph database required.

---

# Success Criteria

A valid Leaf must answer:

What is this?

Why do we believe it?

How confident are we?

What supports it?

What contradicts it?

What depends on it?

How was it evaluated?

When was it reviewed?

Which indexes contain it?
