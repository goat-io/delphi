---
name: leaf-schema-kinds-status-and-scope
type: research
status: closed
region: Spec
topics:
  - leaf
  - leaf-schema
  - leaf-kinds
  - leaf-status
  - leaf-scope
  - canonical-identity
  - index-membership
  - RFC-0002
  - RFC-0001
sources:
  - rfcs/RFC-0002-Leaf-Protocol.md
  - rfcs/RFC-0001-Delphi-Meta-Model.md
---

# Leaf Schema, Kinds, Status, and Scope

## The Leaf as the Universal Canonical Unit

RFC-0002 §"Core Principle": Leaves store knowledge; Indexes explain
knowledge. Leaves are canonical; everything else is generated (indexes,
embeddings, search projections, maps).

RFC-0002 §"Design Principles" lists the ten design principles:

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

**Source:** RFC-0002 §"Core Principle" and §"Design Principles".

## Canonical Identity Format

Every leaf must have a globally unique ID:

```
delphi://{brain}/{namespace}/{kind}/{slug}@{version}
```

Examples:
```
delphi://goatlab/company/decision/use-tigerbeetle@1.0.0
delphi://world/law/concept/roman-law@2.1.0
```

The `@{version}` component is a semantic version. When a leaf is
updated, the version is incremented and the prior version remains
accessible in the event log.

**Source:** RFC-0002 §"Canonical Identity".

## The Full Leaf Schema

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
  statement?: string    // for BELIEF/QUESTION leaves

  aliases: string[]
  tags: string[]

  scope: LeafScope

  confidence?: Confidence    // present on BELIEF leaves

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

**Source:** RFC-0002 §"Leaf Schema".

## Leaf Kinds

RFC-0002 §"Leaf Kinds" defines sixteen kinds:

| Kind | Purpose |
|------|---------|
| `OBJECT` | A concept, entity, or named thing. Concepts are stored as OBJECT leaves; concept vs. entity distinctions belong to the ontology layer. |
| `EVIDENCE` | A claim of support or contradiction backed by a source. |
| `BELIEF` | An assertion with confidence (0.0–1.0). The primary knowledge primitive. |
| `QUESTION` | An open uncertainty. First-class per RFC-0008 and RFC-0026. |
| `DECISION` | A resolved choice with rationale and evidence. |
| `TASK` | A unit of future work with closure criteria. |
| `RUBRIC` | An evaluation framework (RFC-0005). |
| `CAPABILITY` | A named skill or competency a Brain or agent possesses (RFC-0013). |
| `METHODOLOGY` | A structured process for achieving a goal (RFC-0013). |
| `WORK` | A real-world creative or intellectual output (RFC-0020). |
| `EXPRESSION` | A specific manifestation of a Work (RFC-0020). |
| `ASSET` | Metadata about an ingested file; the artifact itself remains external (RFC-0020). |
| `ONTOLOGY_TYPE` | A type definition in the ontology (RFC-0006). |
| `RELATIONSHIP_TYPE` | A named relationship between leaves (RFC-0006). |
| `VALIDATION_RULE` | A constraint rule in the ontology (RFC-0006). |
| `EVALUATION` | A per-criterion rubric assessment with finalScore, verdict, and EVALUATES edge. |

**Source:** RFC-0002 §"Leaf Kinds".

## Leaf Status

```ts
type LeafStatus =
  | "DRAFT"       // being authored; not yet active
  | "PROPOSED"    // submitted for review; awaiting promotion
  | "ACTIVE"      // in use; the canonical current version
  | "DISPUTED"    // confidence < threshold OR active contradictions
  | "REFUTED"     // sufficient contradicting evidence; treated as false
  | "SUPERSEDED"  // replaced by a newer version of this leaf
```

Only ACTIVE leaves contribute to confidence propagation and index generation.
DISPUTED leaves are included in indexes with a warning. REFUTED and SUPERSEDED
leaves are archived but retained for audit and dependency tracing.

**Source:** RFC-0002 §"Status".

## Leaf Scope

Truth is scoped. The `LeafScope` captures the conditions under which a
belief is valid:

```ts
interface LeafScope {
  visibility: "PUBLIC" | "ORG" | "PRIVATE"

  jurisdiction?: string[]    // e.g., ["US", "EU"]
  language?: string[]        // e.g., ["en", "es"]

  temporal?: {
    validFrom?: string        // ISO-8601: when belief became valid
    validUntil?: string       // ISO-8601: when belief expires
    observedAt?: string       // ISO-8601: when observation was made
    verifiedAt?: string       // ISO-8601: when verification occurred
  }

  organizationId?: string    // ORG-scoped beliefs

  context?: string[]         // additional scoping tags
}
```

Example: A legal belief about GDPR scope would carry
`jurisdiction: ["EU"]` and a `temporal.validFrom` of the regulation's
effective date. An organization-specific belief would carry
`visibility: "ORG"` and the relevant `organizationId`.

**Source:** RFC-0002 §"Scope".

## Index Membership

Leaves expose their region membership via `IndexMembership`:

```ts
interface IndexMembership {
  indexId: string
  relationship: "PRIMARY" | "SECONDARY"
  path: string[]    // e.g., ["World", "History", "Roman Empire", "Economy"]
}
```

Every leaf has exactly one PRIMARY region membership and unlimited
SECONDARY memberships. The path array traces the hierarchical position
within the 4-tier index tree.

**Source:** RFC-0002 §"Index Membership"; RFC-0028 §"Region Membership".

## Why Leaves Are Immutable Snapshots

RFC-0002 §"Design Principles" principle 2: Leaves are immutable snapshots.
Changes create events.

This means:
- A leaf's content at any given version is permanently readable
- The event log provides a complete audit trail of all changes
- Confidence propagation can compare the current version with prior versions
- The `importBrain` / `exportBrain` round-trip preserves the full history

Immutability enables the dependency propagation (RFC-0022) to reliably
detect what changed and cascade re-evaluations.

**Source:** RFC-0002 §"Design Principles" principles 2–3.

## Canonical Questions This Answers

- *What is a leaf?* — The canonical storage unit of Delphi. Everything
  canonical (knowledge, decisions, tasks, ontology definitions) is a leaf.
- *What are the sixteen leaf kinds?* — OBJECT, EVIDENCE, BELIEF, QUESTION,
  DECISION, TASK, RUBRIC, CAPABILITY, METHODOLOGY, WORK, EXPRESSION, ASSET,
  ONTOLOGY_TYPE, RELATIONSHIP_TYPE, VALIDATION_RULE, EVALUATION.
- *Where is a concept stored?* — As an OBJECT leaf. The concept vs. entity
  distinction is in the ontology layer, not LeafKind.
- *What leaf kind stores rubrics?* — RUBRIC leaves (RFC-0005).
- *What is the format of a leaf's canonical ID?* —
  `delphi://{brain}/{namespace}/{kind}/{slug}@{version}`.
- *What does DISPUTED status mean?* — The leaf's confidence is below the
  threshold OR there are active contradicting leaves.
- *Can a leaf belong to multiple regions?* — Yes; one PRIMARY and unlimited
  SECONDARY memberships.
- *Why are leaves immutable?* — To preserve audit history and enable
  dependency propagation to detect exactly what changed.
- *What is scope in a leaf?* — The conditions under which a belief is valid:
  jurisdiction, language, temporal range, visibility, and organizational context.
