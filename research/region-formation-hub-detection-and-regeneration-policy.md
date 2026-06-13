---
name: region-formation-hub-detection-and-regeneration-policy
type: research
status: closed
region: Spec
topics:
  - regions
  - region-formation
  - hub-detection
  - index-staleness
  - index-regeneration
  - debouncing
  - generation-budgets
  - RFC-0028
  - RFC-0019
sources:
  - rfcs/RFC-0028-Knowledge-Regions-and-Index-Lifecycle.md
  - rfcs/RFC-0019-Knowledge-Indexes-and-Hierarchical-Summaries.md
---

# Region Formation, Hub Detection, and Index Regeneration Policy

## What Is A Region?

RFC-0028 §"What Is A Region?" defines: A knowledge region is a set of
leaves that share a meaningful summary. A region is good when an agent
reading its index can decide whether to descend into it. A region is
bad when it is too broad to summarize, or too small to be worth a summary.

The purpose of regions is navigability: they are the chunks the 4-tier
index (RFC-0019) compresses and presents to agents.

**Source:** RFC-0028 §"What Is A Region?".

## The Four Sources of Region Formation

RFC-0028 §"Region Formation Sources" defines regions forming from four
sources in priority order:

### 1. Seeded Regions (Highest Priority, MVP-Required)

Humans declare top-level domains at Brain creation. For the Delphi
self-brain these are: Spec, Knowledge Plane, Execution Plane, Decisions,
Operations. Seeding removes the hardest clustering problem. Every MVP
Brain starts seeded.

**Source:** RFC-0028 §"Seeded Regions".

### 2. Hub Regions (MVP-Required)

An OBJECT leaf with high degree (many edges, many evidence references)
becomes a region anchor. The MVP threshold: degree ≥ 15 creates a
region task. Example: TigerBeetle accumulating 50 beliefs → "TigerBeetle"
becomes a topic region.

Hub detection runs:
- After each ingestion batch
- Triggered by the indexer scheduler
- On leaves of type OBJECT with the highest edge count

The detection does not auto-create regions. It creates a TASK of type
`REGION_FORMATION` that an agent executes.

**Source:** RFC-0028 §"Hub Regions".

### 3. Ontology Regions (Post-MVP)

Ontology types with many instances form regions. Example: 200 leaves
classified as `Court Decision` → "Court Decisions" region.

**Source:** RFC-0028 §"Ontology Regions".

### 4. Graph Communities (Post-MVP)

Community detection over the edge graph proposes regions no one
anticipated. Proposals go to the review queue — they are never
auto-created.

**Source:** RFC-0028 §"Graph Communities".

## MVP Rule

```
MVP region formation = Seeded domains + Hub regions
```

Nothing else in MVP. Ontology and community detection come post-MVP.

**Source:** RFC-0028 §"MVP Rule".

## Region Membership Rules

Per RFC-0002 IndexMembership, every leaf has exactly ONE primary region.

Assignment at resolution time (RFC-0027):
- A merged leaf keeps its existing region.
- A created leaf inherits the region of its strongest-connected neighbor;
  if no neighbor has a region, it inherits the seeded domain of its
  source asset.

Secondary memberships are unlimited: a leaf may appear in many indexes
but belongs to one primary region for health metrics.

**Source:** RFC-0028 §"Region Membership"; RFC-0002 §"IndexMembership".

## Region Sizing Bounds

RFC-0028 §"Region Sizing" defines configuration (not protocol) bounds:

- Fewer than 5 leaves → fold into parent
- More than ~150 leaves → split task created

Splitting uses hub detection inside the region to find natural sub-anchors.

These bounds are configurable, not hardcoded protocol.

**Source:** RFC-0028 §"Region Sizing".

## Index Staleness

Every index carries staleness metadata:

```ts
interface IndexStaleness {
  staleSince?: string       // ISO-8601 when first dirtied
  changedLeafCount: number  // how many leaves changed
  changeWeight: number      // importance-weighted change magnitude
  lastGeneratedAt: string   // when index was last rebuilt
}
```

`changeWeight` reflects importance: a confidence change on a high-impact
belief weighs more than a typo fix. A low-weight change accumulates
slowly; a high-impact confidence drop immediately elevates priority.

**Source:** RFC-0028 §"Index Staleness".

## The Regeneration Policy: Events Mark Dirty, Scheduler Regenerates

The critical architectural decision in RFC-0028 §"The Regeneration Policy":

**Events do NOT trigger regeneration.**

Events mark indexes dirty. A scheduler regenerates dirty indexes by
priority:

```
Priority = Region Importance × Staleness Weight
```

This prevents the unbounded regeneration cost that would result from
"leaf changes trigger regeneration" if applied naively during ingestion.

**Source:** RFC-0028 §"The Regeneration Policy".

## Debouncing Rules

RFC-0028 §"Debouncing Rules" defines the MVP policy to prevent
regeneration storms:

1. An index regenerates at most once per 15 minutes.
2. Regeneration waits for quiet: no changes in the region for 2 minutes,
   OR the 15-minute ceiling is reached.
3. During bulk ingestion, regeneration is suspended for affected regions
   until the ingest batch completes.
4. A full-staleness sweep runs daily regardless of activity.

Result: ingesting 100 PDFs produces ONE regeneration per affected region,
not one per leaf change.

**Source:** RFC-0028 §"Debouncing Rules".

## Generation Inputs

RFC-0028 §"Generation Inputs" specifies what the index generator reads:

- Region leaves (titles, summaries, confidence)
- Edges within the region
- Open questions in the region
- Decisions in the region
- Child region indexes

Child indexes regenerate before parents. Parents summarize child indexes,
never raw grandchild leaves. This makes cost proportional to tree depth,
not Brain size.

**Source:** RFC-0028 §"Generation Inputs".

## Generation Budgets

Every Brain sets per RFC-0028 §"Generation Budgets":

- Max regenerations per hour
- Max tokens per regeneration
- Max total generation tokens per day

These budgets prevent runaway LLM costs during periods of high activity.
When a budget is exhausted, dirty indexes wait until the next budget period.

**Source:** RFC-0028 §"Generation Budgets".

## Why Index Staleness Is Acceptable

RFC-0028 §"Core Principle" states explicitly:

> Indexes are eventually consistent. Staleness is acceptable.
> Unbounded regeneration cost is not.

An agent reading a stale index receives a slightly out-of-date
description of a region. An agent triggering a regeneration per leaf
change during a bulk ingestion would consume thousands of LLM calls for
what amounts to one meaningful content change.

**Source:** RFC-0028 §"Core Principle".

## Canonical Questions This Answers

- *How do regions form in a Delphi Brain?* — From four sources in order:
  seeded domains (human-declared at creation), hub regions (high-degree
  OBJECT leaves), ontology regions (post-MVP), graph communities (post-MVP).
- *What is the MVP rule for region formation?* — Seeded domains plus
  hub regions only. Nothing else until post-MVP.
- *Does a leaf change trigger an immediate index regeneration?* — No.
  Events mark indexes dirty; a scheduler regenerates dirty indexes
  on priority order with debouncing.
- *What is the debouncing policy?* — At most one regeneration per region
  per 15 minutes; wait for 2 minutes of quiet or hit the ceiling.
- *How many primary regions does a leaf belong to?* — Exactly one.
- *When is a region considered too large?* — More than ~150 leaves;
  a split task is then created.
- *What determines regeneration priority?* — Region Importance ×
  Staleness Weight.
- *Why are indexes eventually consistent rather than immediately
  consistent?* — Immediate consistency would make ingestion cost
  proportional to document count times LLM calls; eventual consistency
  makes it proportional to tree depth.
