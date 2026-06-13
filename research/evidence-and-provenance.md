---
name: evidence-and-provenance
type: research
status: closed
region: Spec
topics:
  - evidence
  - provenance
  - assets
  - passages
  - source-reliability
  - citation
  - RFC-0004
sources:
  - rfcs/RFC-0004-Evidence-and-Provenance.md
  - rfcs/RFC-0002-Leaf-Protocol.md
  - rfcs/RFC-0003-Knowledge-and-Confidence-Theory.md
---

# Evidence and Provenance: Why We Believe Things

## Core Principle

Knowledge without evidence is opinion. Confidence without provenance is
meaningless. RFC-0004 defines how Delphi answers the question: "Why do we
believe this?"

Evidence is not truth. Evidence contributes to beliefs. Sources do not become
true because they exist — evidence influences confidence through the
RFC-0003 confidence formula.

**Source:** RFC-0004 §"Core Principle" (lines 38–46) and
§"Purpose" (lines 17–34).

## The Evidence Hierarchy

```
Reality → Observation → Evidence → Assertion → Belief → Fact-like Belief
```

Delphi stores the entire chain, not just the terminal belief. This makes
reasoning traceable: any belief can be traced back to the observations and
evidence that support it.

**Source:** RFC-0004 §"Evidence Hierarchy" (lines 49–58).

## Four Evidence Types

RFC-0004 defines a reliability hierarchy across four evidence types:

| Type | Examples | Reliability |
|---|---|---|
| **Direct Observation** | Benchmark, experiment, sensor reading, user interview | Highest when reproducible |
| **Primary Sources** | Laws, court decisions, research papers, official specs | High authority |
| **Secondary Sources** | Books, reviews, summaries, commentary | Interpret primary sources |
| **Tertiary Sources** | Blog posts, wikis, AI summaries | Useful for discovery; lower trust |

**Source:** RFC-0004 §"Evidence Types" (lines 63–113).

## Source Reliability Scores (Reference Values)

RFC-0004 provides reference reliability values for common source types:

| Source Type | Reliability Score |
|---|---|
| Official Specification | 0.95 |
| Peer Reviewed Paper | 0.90 |
| Government Publication | 0.85 |
| Industry Benchmark | 0.80 |
| Expert Interview | 0.75 |

These feed into the `sourceReliability` component of the RFC-0003 confidence
formula.

**Source:** RFC-0004 §"Source Reliability" (lines 299–320).

## Assets: Containers of Evidence

Assets are the digital artifacts that contain evidence — PDFs, videos, audio,
repositories, web pages, datasets, emails, presentations. Assets are leaves
(kind: ASSET) but store metadata only; the artifact itself remains external.

```ts
interface Asset {
  id: string
  assetType: "PDF" | "VIDEO" | "AUDIO" | "WEBPAGE" | "REPOSITORY"
             | "DATASET" | "EMAIL" | "PRESENTATION"
  title: string
  author?: string
  publishedAt?: string
  sourceUrl?: string
}
```

**Source:** RFC-0004 §"Assets" (lines 115–159).

## Passages: The Smallest Citation Unit

Evidence does not reference an entire PDF — it references a specific passage
within it. A Passage is a precise location within an Asset:

```ts
interface Passage {
  assetId: string
  location: {
    page?: number
    section?: string
    timestamp?: string   // for audio/video
    charStart?: number
    charEnd?: number
  }
  text?: string          // the actual quoted text
}
```

Passages enable precise citation. An evidence leaf backed by a court decision
cites a specific paragraph, not the entire document.

**Source:** RFC-0004 §"Passages" (lines 162–196).

## Evidence References

Evidence links beliefs to sources:

```ts
interface EvidenceRef {
  sourceLeafId: string
  relation: "SUPPORTS" | "CONTRADICTS" | "MENTIONS" | "INTERPRETS" | "DERIVES_FROM"
  strength: number               // 0.0–1.0
  extractionConfidence: number   // how confident the extractor was
  passage?: Passage              // precise location in the source asset
}
```

The `relation` field makes the relationship semantic: evidence can support,
contradict, merely mention, interpret, or derive from a belief.

**Source:** RFC-0004 §"Evidence References" (lines 200–221).

## How Much Evidence Supports a Belief?

The amount and quality of evidence supporting a belief is captured through
three RFC-0003 confidence components:

1. **`evidenceStrength`** (weight 0.30) — how well the evidence supports
   the specific assertion
2. **`sourceDiversity`** (weight 0.15) — how many independent sources exist
3. **`contradictionRisk`** (−0.20) — strength of contradicting evidence

A belief backed by ten independent primary sources has high sourceDiversity
and strong evidenceStrength. A belief backed by one blog post has low values
in both.

**Source:** RFC-0003 §"Initial Confidence Formula" (lines 192–210).

## Provenance: Who Created It and How?

Every leaf requires provenance. Provenance answers:
- Who created this?
- How was it created?
- What source material was used?
- When was it created?
- Who reviewed it?

```ts
interface Provenance {
  createdBy: AgentRef            // HUMAN, AGENT, SYSTEM, or IMPORT
  createdAt: string              // ISO-8601
  generatedBy?: ActivityRef      // which activity produced it
  derivedFrom: string[]          // parent leaf IDs
  importedFrom?: ImportRef
  reviewedBy?: AgentRef[]
  lastReviewedAt?: string
}
```

**Source:** RFC-0004 §"Provenance Schema" (lines 237–255).

## Activity Types

Knowledge should explain how it was produced:

```ts
type ActivityType =
  | "MANUAL_ENTRY"         // human wrote it directly
  | "DOCUMENT_EXTRACTION"  // extracted from an asset
  | "RESEARCH_TASK"        // produced by a research agent
  | "EVALUATION"           // produced during an evaluation
  | "IMPORT"               // imported from another Brain
  | "MERGE"                // produced by entity resolution
  | "MIGRATION"            // moved from another system
```

**Source:** RFC-0004 §"Activities" (lines 279–293).

## Canonical Questions This Answers

- *Why do we believe a specific claim in Delphi?* — Follow the evidence chain:
  Belief → EvidenceRef → Passage → Asset. The passage quotes the specific text
  that supports the belief.
- *How much evidence supports a belief?* — Check `evidenceStrength`,
  `sourceDiversity`, and `contradictionRisk` in the confidence breakdown.
- *What is a Passage in Delphi?* — The smallest citation unit: a precise
  location within an Asset (page, character offset, or timestamp range).
- *Are Assets leaves?* — Yes, ASSET is a LeafKind. Asset leaves store
  metadata only; the artifact itself is external.
- *What does provenance record?* — Who created a leaf, how (which activity),
  when, from what source material, and who reviewed it.
- *What evidence contradicts a belief?* — EvidenceRefs with
  `relation: "CONTRADICTS"` on the belief leaf, surfaced through the
  `contradictionRisk` confidence component.
