---
name: search-navigation-and-knowledge-discovery
type: research
status: closed
region: Spec
topics:
  - search
  - navigation
  - knowledge-discovery
  - traversal
  - context-budgeting
  - knowledge-maps
  - RFC-0007
sources:
  - rfcs/RFC-0007-Search-Navigation-and-Knowledge-Discovery.md
  - rfcs/RFC-0019-Knowledge-Indexes-and-Hierarchical-Summaries.md
  - rfcs/RFC-0023-Knowledge-Maps.md
---

# Search, Navigation, and Knowledge Discovery in Delphi

## Core Principle: Navigation Before Retrieval

Traditional RAG retrieves chunks. Delphi navigates understanding.

```
Traditional RAG:
Question → Vector Search → Chunks → Answer

Delphi:
Question → Brain Index → Domain Index → Topic Index → Leaf → Evidence → Answer
```

Agents MUST orient themselves first. Understanding precedes retrieval. Context
is a scarce resource; navigation protects it.

**Source:** RFC-0007 §"Core Principle" (lines 44–50) and
§"The Navigation Principle" (lines 53–69).

## Search vs Navigation

These are distinct concepts that serve different purposes:

| Concept | Answers | Use When |
|---|---|---|
| **Search** | Where might this exist? | You know what you're looking for |
| **Navigation** | Where should I go next? | You need to orient before diving |

Search and navigation work together. Navigation should always happen before
deep leaf retrieval.

**Source:** RFC-0007 §"Search vs Navigation" (lines 73–87).

## The Five-Level Knowledge Hierarchy

Every Brain exposes a traversable hierarchy:

```
Level 0: Brain Index        (first thing agents read)
Level 1: Domain Indexes     (History, Engineering, Law…)
Level 2: Topic Indexes      (Roman Empire, TigerBeetle…)
Level 3: Subtopic Indexes
Level 4: Leaf Collections
Level 5: Leaves
```

Agents traverse progressively. They stop as soon as sufficient understanding
exists. They never load thousands of leaves without navigating first.

**Source:** RFC-0007 §"Knowledge Hierarchy" (lines 89–106) and
§"Context Budgeting" (lines 217–248).

## Progressive Compression: Four Tiers

Every significant knowledge region exposes four summary tiers:

| Tier | Approx Size | Use |
|---|---|---|
| Tiny | ~10 tokens | Quick orientation |
| Short | ~100 tokens | Overview |
| Medium | ~1 000 tokens | Detailed understanding |
| Long | ~10 000 tokens | Deep analysis |

Agents choose the smallest representation that satisfies the task. This is not
a style preference — it is the protocol for managing context budgets.

**Source:** RFC-0007 §"Progressive Compression" (lines 188–214).

## Knowledge Maps: Where Should I Go Next?

Indexes describe what exists in a region. Maps describe routes between regions.

A Knowledge Map answers: "Where should I go next?"

Example (Roman Empire Map):
```
Related Topics: Republic, Augustus, Military, Collapse, Economy
Suggested Paths:
  - Political History
  - Economic History
  - Military History
```

Maps are generated projections (not canonical leaves). They regenerate when
the dependency graph changes.

**Source:** RFC-0007 §"Knowledge Maps" (lines 437–461).

## Four Search Types

| Type | Useful For |
|---|---|
| **Keyword Search** | Names, identifiers, references |
| **Semantic Search** | Related concepts, similar ideas, discovery |
| **Graph Search** | Dependencies, lineage, impact analysis |
| **Index Search** | Orientation, topic discovery, exploration (recommended first step) |

**Hybrid Search** combines all four and is the recommended default.

**Source:** RFC-0007 §"Search Types" (lines 291–354).

## Traversal Patterns

RFC-0007 defines four traversal patterns by question type:

**Dependency Traversal** — "What supports this?"
`Belief → Evidence`

**Impact Traversal** — "What breaks if this changes?"
`Belief → Decision → Task → Outcome`

**Evaluation Traversal** — "How good is this?"
`Object → Evaluation → Rubric`

**Lineage Traversal** — "Where did this originate?"
`Leaf → Source → Source → … (until root)`

**Source:** RFC-0007 §"Dependency Traversal" (lines 379–388),
§"Impact Traversal" (lines 390–400), §"Evaluation Traversal" (lines 402–410),
§"Lineage Traversal" (lines 412–424).

## Search Debt

Search Debt occurs when knowledge cannot be discovered efficiently:
- Indexes are stale
- Navigation paths are broken
- Duplicate concepts exist
- Search quality degrades

Search Debt creates tasks (TYPE: NAVIGATION_DEBT) in RFC-0026.

**Source:** RFC-0007 §"Search Debt" (lines 540–550).

## Ranking Signals

Results are ranked by:
1. Confidence
2. Evidence Quality
3. Relevance
4. Relationship Strength
5. Freshness
6. Usage Frequency
7. Ontology Match

**Source:** RFC-0007 §"Ranking Signals" (lines 476–489).

## The Search-by-Question Workflow

Example: "Should Walliver use TigerBeetle?"

```
Brain Index → Engineering Index → Databases Index
→ TigerBeetle (leaf) → Evidence → Evaluations → Contradictions → Answer
```

The agent never jumps to a vector search against raw leaves. It orients
first, then dives.

**Source:** RFC-0007 §"Search By Question" (lines 492–508).

## Canonical Questions This Answers

- *What is the difference between search and navigation in Delphi?* — Search
  answers "where might this exist?"; navigation answers "where should I go
  next?" Navigation precedes retrieval.
- *What does a Knowledge Map answer?* — "Where should I go next?" Maps
  describe routes; indexes describe what exists.
- *What are the four index tiers?* — Tiny (~10 tokens), Short (~100 tokens),
  Medium (~1 000 tokens), Long (~10 000 tokens). Agents use the smallest
  sufficient tier.
- *What is Search Debt?* — Knowledge exists but cannot be discovered
  efficiently; triggers NAVIGATION_DEBT tasks.
- *In what order should an agent approach a question?* — Brain Index →
  Domain Index → Topic Index → Leaf → Evidence. Never start with vector
  search over raw chunks.
- *What are the five navigation levels?* — Brain Index, Domain Indexes,
  Topic Indexes, Subtopic Indexes, Leaf Collections, Leaves (six levels,
  0–5).
