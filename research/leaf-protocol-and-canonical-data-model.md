---
name: leaf-protocol-and-canonical-data-model
type: research
status: closed
region: Spec
topics:
  - leaf
  - leaf-kinds
  - leaf-protocol
  - canonical-data-model
  - versioning
  - provenance
  - RFC-0002
sources:
  - rfcs/RFC-0002-Leaf-Protocol.md
  - rfcs/RFC-0001-Delphi-Meta-Model.md
---

# The Leaf Protocol: Canonical Data Model for Delphi

## Core Principle

Leaves store knowledge. Indexes explain knowledge. Leaves are truth. Indexes
are understanding. Everything canonical is stored as a Leaf; everything else
— indexes, search projections, embeddings, graph indexes — is generated.

**Source:** RFC-0002 §"Core Principle" (lines 36–45).

## Leaf Identity

Every leaf has a globally unique ID with canonical format:

```
delphi://{brain}/{namespace}/{kind}/{slug}@{version}
```

Examples:
- `delphi://goatlab/company/decision/use-tigerbeetle@1.0.0`
- `delphi://world/law/concept/roman-law@2.1.0`

**Source:** RFC-0002 §"Canonical Identity" (lines 62–73).

## Leaf Schema

```ts
interface DelphiLeaf {
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
  provenance: Provenance         // mandatory
  evidence: EvidenceRef[]
  edges: Edge[]
  quality?: KnowledgeQuality
  lifecycle: Lifecycle
  content?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
```

**Source:** RFC-0002 §"Leaf Schema" (lines 79–118).

## The Sixteen Leaf Kinds

```ts
type LeafKind =
  | "OBJECT"           // Concepts, entities (Roman Empire, TigerBeetle)
  | "EVIDENCE"         // Research papers, benchmarks, observations
  | "BELIEF"           // Assertion with confidence
  | "QUESTION"         // Tracked uncertainty (first-class, RFC-0026)
  | "DECISION"         // What we decided and why
  | "TASK"             // Future work to reduce uncertainty
  | "RUBRIC"           // Evaluation criteria
  | "CAPABILITY"       // What an agent can do (RFC-0013)
  | "METHODOLOGY"      // How something is done (RFC-0013)
  | "WORK"             // Human work product (RFC-0020)
  | "EXPRESSION"       // Published form of a Work (RFC-0020)
  | "ASSET"            // Digital artifact metadata (RFC-0020)
  | "ONTOLOGY_TYPE"    // Type definition
  | "RELATIONSHIP_TYPE"// Relationship definition
  | "VALIDATION_RULE"  // Constraint definition
  | "EVALUATION"       // Per-criterion rubric assessment with verdict
```

Key notes:
- **QUESTION is first-class** (RFC-0026 §"Question Schema"). Tracked
  uncertainty is not a note — it is a leaf with lifecycle and closure criteria.
- **ASSET leaves store metadata only**; the artifact (PDF, video) remains
  external. The asset itself is not a leaf.
- Concepts are stored as OBJECT leaves. Concept vs entity distinctions belong
  to the ontology layer, not LeafKind.
- EVALUATION stores per-criterion rubric assessment with `finalScore`,
  `verdict`, and an `EVALUATES` edge to the assessed leaf.

**Source:** RFC-0002 §"Leaf Kinds" (lines 124–155).

## Versioning and Immutability

Leaves are immutable snapshots. An update:
1. Creates a new leaf version (slug unchanged, `@version` incremented)
2. Emits a `LeafEvent`
3. Keeps prior versions readable

**Leaves are never hard-deleted.** Retirement is through status `ARCHIVED` or
lifecycle state `RETIRED`. APIs that "update" a leaf perform a version bump,
not an in-place mutation.

**Source:** RFC-0002 §"Versioning & Mutability" (lines 373–388).

## Status Lifecycle

```ts
type LeafStatus =
  | "DRAFT"       // Not yet complete
  | "PROPOSED"    // Staged for review
  | "ACTIVE"      // Live canonical knowledge
  | "DISPUTED"    // Under active challenge
  | "REFUTED"     // Evidence-backed contradiction exists
  | "SUPERSEDED"  // Replaced by a newer version
  | "ARCHIVED"    // Retired from active use
```

**Source:** RFC-0002 §"Status" (lines 230–241).

## Provenance Is Mandatory

Every leaf requires:

```ts
interface Provenance {
  createdBy: string          // agent ref or human id
  createdAt: string          // ISO-8601
  derivedFrom: string[]      // parent leaf IDs
  reviewedBy?: string[]
  lastReviewedAt?: string
  sourceSystem?: string
}
```

Without provenance, a leaf is invalid. This ensures every claim can be
traced to its origin.

**Source:** RFC-0002 §"Provenance" (lines 264–282).

## Evidence References vs Edges

RFC-0002 distinguishes two relationship mechanisms:

| Mechanism | When to Use |
|---|---|
| `EvidenceRef` | Source is an EVIDENCE or ASSET leaf. Carries citation detail: passage, extraction confidence, strength. |
| `Edge` | Knowledge-to-knowledge structure: belief depends on another belief, beliefs contradict each other. |

Extraction pipelines must never represent citations as plain edges.

**Source:** RFC-0002 §"Edges vs Evidence References" (lines 344–369).

## Scope: Truth Is Contextual

```ts
interface LeafScope {
  visibility: "PUBLIC" | "ORG" | "PRIVATE"
  jurisdiction?: string[]    // ["EU", "SE"]
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

A belief scoped to Swedish jurisdiction does not automatically apply to EU
law. Scope makes truth contextual, temporal, and jurisdictional.

**Source:** RFC-0002 §"Scope" (lines 205–225).

## What Is Generated (Not Canonical)

These are NEVER canonical leaves — they are projections rebuilt from leaves:

- Knowledge Indexes
- Knowledge Maps
- Search Indexes
- Embeddings
- Graph Indexes
- Dependency Graphs
- Impact Graphs

Never edit projections directly. They depend on leaves; leaves never depend
on projections.

**Source:** RFC-0002 §"Generated Projections" (lines 450–463).

## MVP Storage Model

- PostgreSQL with JSONB
- Separate Event Table
- Separate Edge Table
- No graph database required in MVP

**Source:** RFC-0002 §"MVP Implementation" (lines 534–549).

## A Valid Leaf Must Answer

1. What is this?
2. Why do we believe it?
3. How confident are we?
4. What supports it?
5. What contradicts it?
6. What depends on it?
7. How was it evaluated?
8. When was it reviewed?
9. Which indexes contain it?

**Source:** RFC-0002 §"Success Criteria" (lines 555–575).

## Canonical Questions This Answers

- *What are the leaf kinds in Delphi?* — Sixteen kinds: OBJECT, EVIDENCE,
  BELIEF, QUESTION, DECISION, TASK, RUBRIC, CAPABILITY, METHODOLOGY, WORK,
  EXPRESSION, ASSET, ONTOLOGY_TYPE, RELATIONSHIP_TYPE, VALIDATION_RULE,
  EVALUATION.
- *Can a leaf be deleted?* — No. Leaves are never hard-deleted; they are
  ARCHIVED or RETIRED via lifecycle.
- *When is a leaf updated?* — Updates create a new version with the same
  slug and an incremented version number, plus a LeafEvent.
- *What is the difference between an EvidenceRef and an Edge?* — EvidenceRef
  links to EVIDENCE/ASSET leaves with citation detail; Edge links
  knowledge-to-knowledge structure.
- *Is scope required?* — Scope is part of the schema. Jurisdiction and
  temporal fields make truth contextual.
- *Are Knowledge Indexes leaves?* — No. Indexes are generated projections,
  not canonical leaves.
