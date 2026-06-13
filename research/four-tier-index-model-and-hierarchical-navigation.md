---
name: four-tier-index-model-and-hierarchical-navigation
type: research
status: closed
region: Spec
topics:
  - knowledge-indexes
  - four-tier-model
  - hierarchical-navigation
  - index-schema
  - context-budgeting
  - agent-navigation
  - RFC-0019
  - RFC-0007
  - RFC-0028
sources:
  - rfcs/RFC-0019-Knowledge-Indexes-and-Hierarchical-Summaries.md
  - rfcs/RFC-0007-Search-Navigation-and-Knowledge-Discovery.md
  - rfcs/RFC-0028-Knowledge-Regions-and-Index-Lifecycle.md
  - packages/delphi-indexer/src/generate.ts
---

# The Four-Tier Index Model and Hierarchical Navigation

## Why Indexes Exist: The Compression Problem

Knowledge is useless if it cannot be navigated. Agents have limited context
windows; humans have limited attention. Without compression, a Brain containing
millions of leaves forces agents to scan everything — which is both expensive
and ineffective.

RFC-0019's solution is the Knowledge Index: a generated, hierarchical
representation of a knowledge region that lets agents read summaries first
and descend into leaves only when needed.

**Source:** RFC-0019 §"Purpose" (lines 16–27) and §"Why This Exists" (lines 30–44).

## The Book Analogy

RFC-0019 formalizes the compression approach using the book analogy:

```
Book
→ Table of Contents
→ Chapter Summary
→ Section Summary
→ Paragraph
```

A Delphi Brain works the same way:

```
Brain Index
→ Domain Index
→ Topic Index
→ Subtopic Index
→ Individual Leaves
```

An agent reading the Brain starts at the Brain Index and descends only to the
level needed to answer the question. It never loads all leaves.

**Source:** RFC-0019 §"Core Principle" (lines 32–44) and §"Index Levels"
(lines 185–215).

## The Four Summary Tiers

Each Knowledge Index carries four parallel summaries of the same region,
at different token budgets. This allows the agent to pick the most efficient
summary for its current context budget:

| Tier | Field | Token Budget | Use Case |
|---|---|---|---|
| **Tiny** | `summaryTiny` | < 1 KB | Brain-level navigation; scanning many regions |
| **Short** | `summaryShort` | < 2 KB | Domain-level orientation |
| **Medium** | `summaryMedium` | < 4 KB | Topic-level exploration |
| **Long** | `summaryLong` | < 8 KB | Full regional context before leaf retrieval |

Only individual leaves may exceed 8 KB. All index tiers must remain within
these bounds.

**Source:** RFC-0019 §"Context Budgeting" (lines 336–360) and confirmed by
`packages/delphi-indexer/src/generate.ts` lines 86–89 (fields `summaryTiny`,
`summaryShort`, `summaryMedium`, `summaryLong`).

## The Complete Index Schema

```ts
interface KnowledgeIndex {
  id: string
  title: string

  // Four-tier summaries (parallel representations of the same region)
  summaryTiny:   string   // < 1 KB
  summaryShort:  string   // < 2 KB
  summaryMedium: string   // < 4 KB
  summaryLong:   string   // < 8 KB

  // Navigation pointers
  keyConcepts:           string[]   // top 10 concept leaf titles
  keyBeliefs:            string[]   // top 10 belief titles by confidence
  keyQuestions:          string[]   // top 10 open questions
  childIndexes:          string[]   // IDs of sub-region indexes
  representativeLeafIds: string[]   // top 10 leaf IDs for sampling

  // Staleness metadata (RFC-0028)
  generatedAt:     string
  stale:           boolean
  changedLeafCount: number
}
```

**Source:** RFC-0019 §"Knowledge Index Schema" (lines 94–130) and
`packages/delphi-indexer/src/generate.ts` lines 78–97.

## What Every Index Answers

RFC-0019 §"Discovery" defines the three canonical questions an index must answer:

1. **What exists here?** — `summaryTiny` / `summaryShort` orient the agent
2. **What matters most?** — `keyBeliefs`, `keyConcepts`, `keyQuestions` surface the most important content
3. **Where should I go next?** — `childIndexes` point to sub-regions;
   `representativeLeafIds` allow sampling

An index that fails to answer all three questions is incomplete.

**Source:** RFC-0019 §"Discovery" (lines 363–372) and §"Importance Ranking"
(lines 374–393).

## The Canonical Agent Navigation Pattern

RFC-0019 §"Agent Workflow" and RFC-0007 §"Navigation First" define the
mandatory agent navigation pattern:

```
Question
→ Brain Index (summaryTiny to identify relevant domain)
→ Domain Index (summaryShort to identify relevant topic)
→ Topic Index (summaryMedium to identify relevant subtopic)
→ Leaf retrieval (only for the specific subtopic that matches)
```

The anti-pattern — going directly from question to all leaves — is explicitly
prohibited by RFC-0007 §"The Anti-Pattern":

```
Bad:
Question → Vector Search → Chunks

Good:
Question → Brain Index → Domain Index → Topic Index → Leaf → Evidence
```

Navigation precedes retrieval. This is non-negotiable.

**Source:** RFC-0019 §"The Navigation Rule" (lines 217–229) and
RFC-0007 §"Navigation First" (lines 88–102).

## Indexes Are Generated, Not Authored

Indexes are projections, not canonical knowledge. The generation process
(`packages/delphi-indexer/src/generate.ts`) reads:
- Region leaves (titles, summaries, confidence scores)
- Object leaves and belief leaves ranked by confidence
- Open questions in the region
- Child region indexes

It produces the four summary tiers plus the `keyConcepts`, `keyBeliefs`,
and `keyQuestions` lists automatically.

Leaves remain canonical. Indexes are disposable. When an index is stale or
incorrect, it is regenerated — not manually corrected.

**Source:** RFC-0019 §"Generated Not Authored" (lines 231–241) and
`packages/delphi-indexer/src/generate.ts` lines 50–100.

## Hierarchy Rule: Parents Summarize Children, Not Grandchildren

The hierarchical rule is strict:

- Child region indexes are generated before their parent indexes.
- Parent indexes summarize child indexes — not raw leaf content from the
  child region.
- This means generation cost is proportional to tree depth, not Brain size.

A Brain with 10,000 leaves but shallow region hierarchy costs far less to
index than a flat Brain where every parent must read all leaves directly.

**Source:** RFC-0028 §"Generation Inputs" (lines 238–257): "Parents summarize
child indexes, never raw grandchild leaves."

## Staleness Is Visible to Agents

Every index response exposes staleness metadata:

```ts
{
  generatedAt:      string    // when the index was last generated
  stale:            boolean   // true if leaves have changed since generation
  changedLeafCount: number    // how many leaves changed since generation
}
```

An agent reading a stale index knows to weight its navigation decisions
accordingly. A stale index with a warning beats a fresh index that exhausted
the generation budget.

**Source:** RFC-0028 §"Staleness Exposure" (lines 291–307).

## What Indexes Explicitly Include

RFC-0019 requires that good indexes expose:

| Content | Why |
|---|---|
| Open questions | Surfaces what the Brain doesn't know yet |
| Contradictions | Agents should know when consensus is absent |
| Missing evidence | Signals Knowledge Debt (RFC-0003) |
| Major dependencies | Agents can trace impact chains |
| Major consumers | Agents know what depends on this region |

**Source:** RFC-0019 §"Open Questions" (lines 395–409),
§"Dependency Awareness" (lines 411–424).

## Context Budget Discipline

RFC-0019 is explicit: the goal of every index is:

> Maximum information, minimum context cost.

This is why the four tiers exist. An agent doing broad scanning (Brain Index
→ find the right domain) uses `summaryTiny`. An agent about to retrieve
leaves uses `summaryLong`. Correct tier selection prevents unnecessary token
expenditure.

**Source:** RFC-0019 §"Knowledge Density" (lines 313–325) and
§"Context Budgeting" (lines 336–360).

## Canonical Questions This Answers

- *What are the four index summary tiers?* — Tiny (< 1 KB), Short (< 2 KB),
  Medium (< 4 KB), Long (< 8 KB). Each is a parallel representation of the
  same region at a different token budget.
- *Why do indexes have four tiers instead of one?* — Different navigation
  contexts require different context budgets. Broad scanning uses Tiny;
  pre-retrieval uses Long.
- *Why should agents navigate indexes before searching leaves?* — RFC-0007's
  Navigation First rule; index-first navigation is mandatory per protocol.
  Direct leaf search bypasses the compression layer and wastes context.
- *Are indexes canonical knowledge?* — No. Leaves are canonical. Indexes are
  generated projections. An incorrect index is regenerated, not corrected.
- *What does an index include besides a summary?* — keyConcepts, keyBeliefs,
  keyQuestions, childIndexes, representativeLeafIds, and staleness metadata.
- *How many index levels exist?* — RFC-0019 suggests six levels (0 Brain → 5
  Individual Leaves). The practical implementation uses seeded regions as
  Level 1 with hub-detected sub-regions below.
- *What is the minimum content standard for a good index?* — It must answer:
  What exists here? What matters most? Where should I go next?
