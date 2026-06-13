---
name: ingestion-to-leaf-pipeline-end-to-end
type: research
status: closed
region: Spec
topics:
  - ingestion
  - extraction
  - candidate-staging
  - entity-resolution
  - leaf-promotion
  - RFC-0020
  - RFC-0027
  - RFC-0031
  - RFC-0004
sources:
  - rfcs/RFC-0020-Works-Assets-and-Knowledge-Extraction.md
  - rfcs/RFC-0027-Extraction-and-Entity-Resolution.md
  - rfcs/RFC-0031-Candidate-Staging-Protocol.md
  - rfcs/RFC-0004-Evidence-and-Provenance.md
  - rfcs/RFC-0002-Leaf-Protocol.md
---

# Ingestion to Leaf: The Complete Pipeline

## Overview

A document enters Delphi as a file on disk and must exit as one or more
canonical Leaves with Evidence provenance. The pipeline has five stages:

```
File (Work)
  → Asset (ingestion)
    → Chunks (segmentation)
      → Candidates (extraction)
        → Resolution (entity-resolution + staging)
          → Leaf + Evidence (promotion)
```

**Source:** RFC-0020 §"Pipeline Overview" and RFC-0027 §"Extraction Pipeline".

---

## Stage 1 — Work and Asset Creation

A Work is the intellectual source: a research paper, a court decision, a
specification document. A Work is not stored directly in the Brain; it is
represented through Assets.

An Asset is the concrete, addressable artifact derived from a Work. One Work
may produce multiple Assets (e.g., a PDF produces a text Asset and an image
Asset per page). Assets carry:

- `contentHash`: SHA-256 of content (immutability anchor)
- `mimeType`: governs which extractor runs
- `storageUri`: where the bytes live (local path or object-store URL)
- `processingState`: `PENDING | PROCESSING | DONE | FAILED`

**Source:** RFC-0020 §"Work Schema" and §"Asset Schema".

## Stage 2 — Chunking

Assets are segmented into Chunks before extraction. Chunking strategy is
asset-type-specific:

| Asset type | Chunking strategy |
|---|---|
| PDF text | Paragraph + sentence boundaries |
| Video | Fixed-duration windows + transcript segments |
| Code | File-level + function-level AST nodes |
| Markdown | Section-boundary splits |

Chunks are ephemeral: they are not stored as canonical Leaves. They exist only
to bound the context window fed to the extraction model.

**Source:** RFC-0020 §"Chunking" and §"Extraction Context".

## Stage 3 — Candidate Extraction

The extraction model reads each Chunk and produces Candidates. A Candidate is a
proposed belief, object, or relationship that has not yet been canonicalized.

The Candidate schema (RFC-0027):

```ts
interface Candidate {
  id: string
  assetId: string
  chunkId: string
  proposedKind: LeafKind           // BELIEF | OBJECT | QUESTION | etc.
  proposedTitle: string
  proposedContent: string
  proposedConfidence: number       // [0.0, 1.0] — model's self-assessment
  proposedEvidence: EvidenceRef[]  // the chunk excerpt that supports this
  extractedAt: string              // ISO-8601
}
```

Candidates are always provisional. No Candidate is canonical until promoted.

**Source:** RFC-0027 §"Candidate Schema" and §"Extraction Contract".

## Stage 4 — Entity Resolution

Before a Candidate can be promoted, the resolution engine determines whether
it should create a new Leaf or update an existing one.

Resolution uses three matching strategies, applied in order:

1. **Exact ID match** — Candidate references a known leaf by ID; update that leaf.
2. **Semantic deduplication** — Embedding similarity to existing leaves above
   a threshold (MVP: 0.92 cosine) triggers merge consideration.
3. **New entity** — No match found; a new Leaf will be created on promotion.

Resolution is not a lookup: it is a judgment. When the resolution engine is
uncertain (similarity in range 0.85–0.92), the Candidate transitions to
`FLAGGED` state and enters the human review queue (RFC-0031).

**Source:** RFC-0027 §"Entity Resolution" and RFC-0031 §"FLAGGED State".

## Stage 5 — Candidate Staging and State Machine

RFC-0031 defines the full lifecycle of a Candidate once it leaves extraction:

```
PENDING → NORMALIZING → RESOLVING → PROMOTED
                                  ↘ REJECTED
                     ↘ FLAGGED → (HITL review) → PROMOTED | REJECTED
                                              ↘ EXPIRED (TTL elapsed)
```

State definitions:

| State | Meaning |
|---|---|
| `PENDING` | Created; awaiting normalization |
| `NORMALIZING` | Canonicalization of title/content in progress |
| `RESOLVING` | Entity resolution in progress |
| `PROMOTED` | Leaf or Evidence row created; Candidate archived |
| `REJECTED` | Human steward rejected; Candidate not promoted |
| `FLAGGED` | Needs human review before resolution |
| `EXPIRED` | TTL elapsed without resolution; retired as Knowledge Debt |

Every state transition is recorded in `stateHistory` with timestamp and actor
ID. This audit trail satisfies RFC-0004's provenance requirements.

**Source:** RFC-0031 §"State Machine" and §"Audit Trail".

## Stage 6 — Leaf and Evidence Creation on Promotion

When a Candidate is promoted, two canonical records are created:

1. **Leaf** — The belief, object, or relationship, stored with its RFC-0002
   schema fields (`id`, `kind`, `title`, `content`, `confidence`, `status`,
   `ontologyType`, `regionId`).

2. **Evidence** — The provenance record linking the Leaf to its source,
   satisfying RFC-0004's requirement that every belief have at least one
   Evidence row. Evidence carries:
   - `assetId` and `chunkId` (exact source location)
   - `excerpt` (the verbatim supporting text)
   - `reliabilityScore` (inherited from Asset's source reliability)
   - `role`: `SUPPORTS | CONTRADICTS | MENTIONS`

**Source:** RFC-0004 §"Evidence Schema" and RFC-0002 §"Leaf Schema".

## What Cannot Happen

The pipeline enforces three hard constraints:

1. **No Leaf without Evidence.** Promotion always creates at least one Evidence
   row. Leaves without Evidence are a data integrity violation (RFC-0004
   §"Evidence Requirement").

2. **No silent abandonment.** Every Candidate must reach a terminal state
   (`PROMOTED | REJECTED | EXPIRED`). Stale staging areas are Knowledge Debt
   (RFC-0031 §"Core Principle").

3. **No retroactive chunk deletion.** Chunks referenced by Evidence rows cannot
   be deleted; the content hash must remain resolvable (RFC-0004 §"Immutability").

## Answers to Open Questions

**Q: Can a single Chunk produce multiple Leaves?**
Yes. One Chunk may yield N Candidates, each resolved independently. Each
promoted Candidate creates its own Leaf + Evidence pair referencing the same
Chunk excerpt.
**Source:** RFC-0027 §"Extraction Contract".

**Q: What happens when two Candidates from different chunks describe the same
entity?**
Entity resolution merges them: the first Candidate to resolve creates the Leaf;
the second Candidate's Evidence is appended to that Leaf, increasing its
`sourceDiversity` confidence component.
**Source:** RFC-0027 §"Deduplication" and RFC-0003 §"sourceDiversity".

**Q: Who sets the initial confidence on a new Leaf?**
The extraction model provides `proposedConfidence` in the Candidate. After
promotion, the confidence engine recalculates using the RFC-0003 formula with
the actual Evidence attached. The model's self-assessment is an input to
`evidenceStrength`, not the final score.
**Source:** RFC-0003 §"Initial Confidence Formula" and RFC-0027 §"Confidence Seeding".

**Q: Where does the pipeline fail most often in practice?**
RFC-0031 §"Failure Modes" identifies entity resolution as the highest-risk
stage: ambiguous references cause FLAGGED backlogs. The TTL mechanism is the
safety valve — FLAGGED candidates that are not reviewed within the configured
TTL expire and become Knowledge Debt tasks.
**Source:** RFC-0031 §"Failure Modes" and §"TTL Semantics".
