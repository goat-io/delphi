---
name: knowledge-regions-and-index-lifecycle
type: research
status: closed
region: Spec
topics:
  - regions
  - indexes
  - index-lifecycle
  - staleness
  - RFC-0028
  - RFC-0019
sources:
  - rfcs/RFC-0028-Knowledge-Regions-and-Index-Lifecycle.md
  - rfcs/RFC-0019-Knowledge-Indexes-and-Hierarchical-Summaries.md
---

# Knowledge Regions and Index Lifecycle in Delphi

## What Is a Region?

A knowledge region is a set of leaves that share a meaningful summary. A
region is good when an agent reading its index can decide whether to descend
into it. A region is bad when it is either too broad to summarize or too
small to be worth a summary.

Suggested sizing bounds (RFC-0028 §"Region Sizing", lines 163–175):
- Fewer than 5 leaves → fold into parent
- More than ~150 leaves → create a split task

These bounds are configuration, not protocol.

**Source:** RFC-0028 §"What Is A Region?" (lines 59–73).

## Region Formation: Four Sources

RFC-0028 §"Region Formation Sources" (lines 76–127) defines four sources in
priority order:

### 1. Seeded Regions (MVP, highest priority)
Humans declare top-level domains at Brain creation. Seeding is cheap and
eliminates the hardest clustering problem. Every MVP Brain starts seeded.

Example: `Goatlab Brain → Products, Architecture, Operations, Research`

### 2. Hub Regions (MVP)
An OBJECT leaf with high degree (many edges, many evidence references)
automatically becomes a region anchor when it exceeds the threshold.

MVP threshold: **degree ≥ 15** triggers a region creation task.

Example: TigerBeetle accumulates 50 beliefs → "TigerBeetle" becomes a topic
region.

### 3. Ontology Regions (post-MVP)
Ontology types with many instances form regions. Example: 200 leaves
classified as "Court Decision" → "Court Decisions" region.

### 4. Graph Communities (post-MVP)
Community detection over the edge graph proposes unexpected regions. These
proposals go to the review queue and are never auto-created.

**MVP rule:** Seeded domains + hub regions only. Everything else comes later.

## Region Membership

Every leaf has exactly **one** primary region, assigned at resolution time
(RFC-0027). A merged leaf keeps its existing region. A new leaf inherits the
region of its strongest-connected neighbor, else the seeded domain of its
source asset. Secondary region memberships are unlimited.

**Source:** RFC-0028 §"Region Membership" (lines 143–159).

## Index Staleness

Indexes carry staleness metadata (RFC-0028 §"Index Staleness", lines 177–199):

```ts
interface IndexStaleness {
  staleSince?: string
  changedLeafCount: number
  changeWeight: number    // importance-weighted, not raw count
  lastGeneratedAt: string
}
```

`changeWeight` is importance-weighted: a confidence change on a high-impact
belief weighs more than a typo fix. This prevents noisy regenerations.

## Regeneration Policy: Events Mark Dirty, Schedulers Regenerate

Events do **not** trigger regeneration directly. Events mark indexes dirty.
A scheduler regenerates dirty indexes by priority:

```
Priority = Region Importance × Staleness Weight
```

**Source:** RFC-0028 §"The Regeneration Policy" (lines 200–215).

## Debouncing Rules (MVP)

RFC-0028 §"Debouncing Rules" (lines 217–235) specifies:

1. An index regenerates at most **once per 15 minutes**.
2. Regeneration waits for quiet: no changes for **2 minutes**, or the 15-minute
   ceiling is reached.
3. During **bulk ingestion**, regeneration is suspended for affected regions
   until the batch completes.
4. A **full-staleness sweep** runs daily regardless of activity.

Practical result: ingesting 100 PDFs produces ONE regeneration per affected
region — not one per leaf change.

## Generation Inputs and Hierarchy

Per RFC-0019, generation reads: region leaves (titles, summaries, confidence),
edges within the region, open questions, decisions, and child region indexes.
Generation produces four index tiers: **Tiny / Short / Medium / Long**.

Child indexes regenerate **before** parents. Parents summarize child indexes,
never raw grandchild leaves. This keeps cost proportional to tree depth, not
Brain size.

**Source:** RFC-0028 §"Generation Inputs" (lines 238–257).

## Generation Budgets

Every Brain configures (RFC-0028 §"Generation Budgets", lines 259–280):
- Max regenerations per hour
- Max tokens per regeneration
- Max total generation tokens per day

When the budget is exhausted, indexes stay stale. Staleness is exposed to
agents via the index response:

```ts
{ generatedAt: string; stale: boolean; changedLeafCount: number }
```

A stale index with a warning beats a fresh index that bankrupted the Brain.

## Map Lifecycle

Knowledge Maps (RFC-0023) follow the same dirty-mark → scheduler pattern, at
**lower priority** than indexes. Indexes regenerate before maps because
orientation (what exists here?) matters more than routing (where should I go?).

**Source:** RFC-0028 §"Map Lifecycle" (lines 305–319).

## Canonical Questions This Answers

- *How does a region form?* — Seeded by humans first; hub detection second;
  ontology and graph communities in later phases.
- *When does an index regenerate?* — Scheduled, debounced (≤1/15 min), after
  quiet period, suspended during bulk ingestion.
- *What happens when the generation budget is exhausted?* — Indexes stay stale;
  staleness is surfaced to agents; the Brain does not become unusable.
- *Can a leaf belong to multiple regions?* — Yes: one primary region, unlimited
  secondary memberships.
- *How does Delphi prevent regeneration storms during ingestion?* — Bulk
  ingestion suspends regeneration until the batch completes; the debounce
  window collapses thousands of change events into one regeneration call.
