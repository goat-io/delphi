---
name: coverage-score-and-region-health-metrics
type: research
status: closed
region: Spec
topics:
  - coverage-score
  - region-health
  - index-staleness
  - region-sizing
  - generation-budget
  - regeneration-policy
  - RFC-0028
  - RFC-0019
sources:
  - rfcs/RFC-0028-Knowledge-Regions-and-Index-Lifecycle.md
  - rfcs/RFC-0019-Knowledge-Indexes-and-Hierarchical-Summaries.md
  - rfcs/RFC-0026-Tasks-and-Questions.md
---

# Coverage Score and Region Health Metrics

## What Coverage Score Measures

A region's coverage score reflects how well the Brain's knowledge about that
region is supported by evidence and resolved of uncertainty. Coverage has two
required conditions per belief:

1. Confidence ≥ configured threshold (typically 0.75)
2. Evidence count ≥ configured minimum (typically 1)

```
coverageScore = coveredLeaves / totalLeaves
```

where `coveredLeaves` = leaves satisfying both conditions.

A coverage score of 1.0 means every belief in the region meets both conditions.
The loop does not stop at 1.0 — new sources may add new beliefs with lower
confidence, re-opening research gaps.

The Spec region's target is 0.75. Current state (0.67) reflects a mix of
moderate-confidence beliefs and 47 unanswered questions that generate
low-confidence or zero-confidence leaf slots.

**Source:** RFC-0028 §"Coverage Score Definition"; RFC-0026 §"Question Closure".

---

## What Increases Coverage Score

The two levers are:

### 1. Raise belief confidence
- Add more evidence to existing beliefs (RFC-0004 EvidenceRef attachment).
- Resolve contradictions (RFC-0003 Contradiction Risk component drops to 0).
- Increase source diversity (RFC-0003 Source Diversity component).
- Research tasks that produce confirmed findings increase Evidence Strength.

### 2. Answer open questions
- QUESTION leaves with no answer hold the region's unanswered question count.
  Each unanswered QUESTION is counted against the region's openQuestions metric.
- Research tasks (RFC-0026, RFC-0029) that produce `RESOLVED` questions
  eliminate a low-confidence leaf slot and replace it with an evidence-backed belief.
- A resolved question that transitions to a belief with confidence ≥ 0.75 and
  ≥1 evidence reference counts as a newly covered leaf.

**Source:** RFC-0028 §"Coverage Score Definition"; RFC-0003 §"Confidence Components";
RFC-0026 §"Question Schema".

---

## Region Formation: Four Sources

RFC-0028 defines four sources of region creation, in priority order:

### 1. Seeded Regions (highest priority)
Declared by humans at Brain creation. Every MVP Brain starts seeded. Examples:
`Spec`, `Knowledge Plane`, `Execution Plane`, `Decisions`, `Operations`.
Seeding is cheap and removes the hardest clustering problem.

### 2. Hub Regions
An OBJECT leaf with degree ≥ 15 (many edges, many evidence references)
becomes a region anchor. A hub region forms automatically when a topic
accumulates enough cross-references.

### 3. Ontology Regions
Ontology types with many instances form regions. Example: 200 leaves
classified as `Court Decision` → a `Court Decisions` region.

### 4. Graph Communities (post-MVP)
Community detection over the edge graph proposes regions. Proposals go to
the review queue — never auto-created.

**MVP rule:** Seeded domains + Hub regions only. Ontology regions and community
detection are post-MVP.

**Source:** RFC-0028 §"Region Formation Sources".

---

## Region Membership

Every leaf has exactly ONE primary region, assigned at resolution time (RFC-0027):
- A merged leaf keeps its existing region.
- A created leaf inherits the region of its strongest-connected neighbor, else
  the seeded domain of its source asset.
- Secondary memberships are unlimited.

**Source:** RFC-0028 §"Region Membership".

---

## Region Sizing Rules

| Condition                        | Action                              |
|----------------------------------|-------------------------------------|
| Fewer than 5 leaves              | Fold into parent region             |
| More than ~150 leaves            | Create a split task                 |

Splitting uses hub detection inside the region to find natural sub-topics.
These bounds are configuration, not protocol.

**Source:** RFC-0028 §"Region Sizing".

---

## The Regeneration Policy

Events (leaf changes, new evidence, confidence updates) do NOT trigger
immediate index regeneration. They mark indexes dirty. A scheduler
regenerates dirty indexes by priority:

```
Priority = Region Importance × Staleness Weight
```

### Debouncing Rules (MVP defaults)
1. An index regenerates at most once per 15 minutes.
2. Regeneration waits for quiet: no changes for 2 minutes OR the 15-minute
   ceiling is reached.
3. During bulk ingestion, regeneration is suspended for affected regions
   until the ingest batch completes.
4. A full-staleness sweep runs daily regardless of activity.

Result: ingesting 100 PDFs produces ONE regeneration per affected region,
not one per leaf change.

**Source:** RFC-0028 §"The Regeneration Policy", §"Debouncing Rules".

---

## Generation Inputs and Cost Model

Index generation reads (per RFC-0019):
- Region leaves (titles, summaries, confidence)
- Edges within the region
- Open questions in the region
- Decisions in the region
- Child region indexes

**Child indexes regenerate before parents.** Parents summarize child indexes,
never raw grandchild leaves. This makes cost proportional to tree depth,
not Brain size. For a Brain with 10,000 leaves in 50 regions, regenerating
one region's index reads ~200 leaves + a handful of child indexes — not 10,000.

**Source:** RFC-0028 §"Generation Inputs"; RFC-0019 §"Four-Tier Hierarchy".

---

## Generation Budgets

Every Brain configures:
- Max regenerations per hour
- Max tokens per regeneration
- Max total generation tokens per day

When the budget is exhausted, indexes stay stale. Staleness is exposed to
agents in every index response:

```ts
{
  generatedAt: string
  stale: boolean
  changedLeafCount: number
}
```

A stale index with a staleness warning is better than a fresh index that
exhausted the Brain's generation budget.

**Source:** RFC-0028 §"Generation Budgets", §"Staleness Exposure".

---

## Map Lifecycle

Knowledge Maps (RFC-0023) follow the same regeneration policy as indexes,
but at lower priority. Indexes regenerate before maps because orientation
(what exists here?) matters more than routing (where should I go next?)
for the first-pass navigation.

**Source:** RFC-0028 §"Map Lifecycle".

---

## Operational Metrics to Track

| Metric                    | Purpose                                         |
|---------------------------|-------------------------------------------------|
| Average index staleness   | Time since last regeneration across all regions |
| Regenerations per day     | Cost and activity signal                        |
| Generation token spend    | Budget consumption rate                         |
| Stale reads               | Agent reads of stale indexes                    |
| Region count/size         | Distribution across size bounds                 |
| Split/fold backlog        | Regions needing restructuring                   |

**Source:** RFC-0028 §"Metrics".

---

## Answers to Open Questions

**Q: What exactly determines whether a leaf counts as "covered"?**
A leaf is covered when: (a) its confidence ≥ the region's coverage threshold
(default 0.75) AND (b) it has at least one attached evidence reference. Both
conditions must hold. A high-confidence belief with no evidence is NOT covered
— evidence is required for the belief to be considered grounded.
**Source:** RFC-0028 §"Coverage Score Definition".

**Q: Do unanswered questions lower the coverage score?**
Yes. QUESTION leaves in a region with no resolution contribute a numerator
slot of 0 (unresolved questions have confidence near 0 and typically no
evidence). As unanswered questions are resolved to evidence-backed beliefs,
the coverage score rises.
**Source:** RFC-0028 §"Coverage Score Definition"; RFC-0026 §"Question Schema".

**Q: Can an oversized region hurt navigation?**
Yes. A region with >150 leaves becomes too broad to summarize usefully.
The index for such a region cannot guide agents to specific leaves — it
becomes a generic overview of everything. RFC-0028 §"Region Sizing" requires
a split task to be created when this threshold is crossed.
**Source:** RFC-0028 §"Region Sizing".

**Q: What happens to region indexes when the generation budget is exhausted?**
They remain stale. Every index response includes a `stale: boolean` field
and `changedLeafCount`. Agents reading a stale index know the summary may
not reflect recent changes. An agent may request a forced regeneration for
critical queries, but the request still respects the budget.
**Source:** RFC-0028 §"Generation Budgets", §"Staleness Exposure".

**Q: How does the daily sweep work?**
A full-staleness sweep runs once per day regardless of activity. It regenerates
ALL indexes that are currently marked stale, processing them in priority order
(Region Importance × Staleness Weight). This bounds worst-case staleness: no
index can be stale for more than 24 hours without being regenerated.
**Source:** RFC-0028 §"Debouncing Rules".
