# RFC-0028 — Knowledge Regions & Index Lifecycle
## How Regions Form and When Indexes Regenerate

Status: Draft

Depends On:
- RFC-0002
- RFC-0019
- RFC-0022
- RFC-0023
- RFC-0026

---

# Purpose

RFC-0019 defines what a Knowledge Index is.

It does not define:

1. How the system decides what a knowledge region IS.

2. When indexes regenerate — and what that costs.

Both are left open, and both are where an implementation
lives or dies:

Without region formation rules,
there is nothing to index.

Without a regeneration policy,
"leaf changes trigger regeneration" (RFC-0019, RFC-0022)
means thousands of LLM calls during a single ingestion run.

This RFC defines:

- Region Formation
- Region Membership
- Region Splitting
- Index Staleness
- Regeneration Policy
- Generation Budgets

---

# Core Principle

Regions are discovered, then maintained.

Indexes are eventually consistent.

Staleness is acceptable.

Unbounded regeneration cost is not.

---

# What Is A Region?

A knowledge region is a set of leaves
that share a meaningful summary.

A region is good when:

An agent reading its index can decide
whether to descend into it.

A region is bad when:

It is too broad to summarize
or too small to be worth a summary.

---

# Region Formation Sources

Regions form from four sources, in priority order:

## 1. Seeded Regions

Humans declare top-level domains at Brain creation.

Example:

Goatlab Brain
→ Products
→ Architecture
→ Operations
→ Research

Seeding is cheap and removes the hardest clustering problem.

Every MVP Brain starts seeded.

## 2. Hub Regions

An OBJECT leaf with high degree
(many edges, many evidence references)
becomes a region anchor.

Example:

TigerBeetle accumulates 50 beliefs
→ "TigerBeetle" becomes a topic region

Suggested MVP threshold:
degree ≥ 15 creates a region task.

## 3. Ontology Regions

Ontology types with many instances form regions.

Example:

200 leaves classified as Court Decision
→ "Court Decisions" region

## 4. Graph Communities (post-MVP)

Community detection over the edge graph
proposes regions no one anticipated.

Proposals go to the review queue —
they are never auto-created.

---

# MVP Rule

MVP region formation =

Seeded domains
+
Hub regions

Nothing else.

Ontology regions and community detection come later.

---

# Region Membership

Per RFC-0002 IndexMembership:

Every leaf has exactly ONE primary region.

Assigned at resolution time (RFC-0027):

A merged leaf keeps its region.

A created leaf inherits the region of its
strongest-connected neighbor,
else the seeded domain of its source asset.

Secondary memberships are unlimited.

---

# Region Sizing

Suggested bounds:

A region with fewer than 5 leaves
→ fold into parent

A region with more than ~150 leaves
→ split task created

Splitting uses hub detection inside the region.

These bounds are configuration, not protocol.

---

# Index Staleness

Indexes carry staleness metadata:

```ts
interface IndexStaleness {
  staleSince?: string

  changedLeafCount: number

  changeWeight: number

  lastGeneratedAt: string
}
```

changeWeight reflects importance:

A confidence change on a high-impact belief
weighs more than a typo fix.

---

# The Regeneration Policy

Events do NOT trigger regeneration.

Events mark indexes dirty.

A scheduler regenerates dirty indexes by priority:

Priority
=
Region Importance × Staleness Weight

---

# Debouncing Rules

Suggested MVP policy:

1. An index regenerates at most once per 15 minutes.

2. Regeneration waits for quiet:
   no changes in the region for 2 minutes
   OR the 15-minute ceiling is reached.

3. During bulk ingestion, regeneration is suspended
   for affected regions until the ingest batch completes.

4. A full-staleness sweep runs daily
   regardless of activity.

Result:

Ingesting 100 PDFs produces
ONE regeneration per affected region —
not one per leaf change.

---

# Generation Inputs

Per RFC-0019, generation reads:

- Region leaves (titles, summaries, confidence)
- Edges within the region
- Open questions in the region
- Decisions in the region
- Child region indexes

Generation produces the four tiers:

Tiny / Short / Medium / Long

Child indexes regenerate before parents.

Parents summarize child indexes,
never raw grandchild leaves.

This makes cost proportional to tree depth,
not Brain size.

---

# Generation Budgets

Every Brain sets:

Max regenerations per hour

Max tokens per regeneration

Max total generation tokens per day

When the budget is exhausted:

Indexes stay stale.

Staleness is exposed to agents
(an agent reading a stale index should know it is stale).

A stale index with a warning
beats a fresh index that bankrupted the Brain.

---

# Staleness Exposure

Every index response includes:

```ts
{
  generatedAt: string
  stale: boolean
  changedLeafCount: number
}
```

Agents may request regeneration
for critical queries.

Such requests respect the budget.

---

# Map Lifecycle

Knowledge Maps (RFC-0023) follow the same policy:

Generated from region indexes and edges.

Marked dirty by region changes.

Regenerated by the same scheduler,
at lower priority than indexes.

Indexes before maps:

Orientation matters more than routing.

---

# Metrics

Track:

Average index staleness

Regenerations per day

Generation token spend

Stale reads
(agent reads of stale indexes)

Region count and size distribution

Split/fold backlog

---

# Canonical Rules

1. Regions are seeded first, discovered second.
2. Every leaf has one primary region.
3. Events mark dirty; schedulers regenerate.
4. Regeneration is debounced.
5. Bulk ingestion suspends regeneration.
6. Parents summarize children, not grandchildren.
7. Generation has budgets.
8. Staleness is visible to agents.
9. Oversized regions split; undersized regions fold.
10. Maps regenerate after indexes.

---

# Success Criteria

1. A new Brain has navigable regions from day one (seeding).
2. Hot topics become regions automatically (hubs).
3. Ingesting 100 documents triggers a bounded,
   predictable number of regenerations.
4. Generation cost grows with change volume,
   not Brain size.
5. Agents can see index staleness.
6. No region is too large to summarize.
7. No region is too small to matter.
8. Budgets prevent runaway spend.
9. Daily sweeps bound worst-case staleness.
10. The Brain remains navigable AND affordable.
