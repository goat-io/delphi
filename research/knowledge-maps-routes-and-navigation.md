---
name: knowledge-maps-routes-and-navigation
type: research
status: closed
region: Spec
topics:
  - knowledge maps
  - navigation
  - learning paths
  - routes
  - knowledge distance
  - RFC-0023
sources:
  - rfcs/RFC-0023-Knowledge-Maps.md
  - rfcs/RFC-0019-Knowledge-Indexes-and-Hierarchical-Summaries.md
  - rfcs/RFC-0007-Search-Navigation-and-Knowledge-Discovery.md
---

# Knowledge Maps: Routes and Navigation in Delphi

## The Distinction: Indexes vs Maps

RFC-0023 defines the critical separation between Indexes (RFC-0019) and Maps:

- **Indexes** answer: *What exists here?* — they describe places.
- **Maps** answer: *Where should I go next?* — they describe routes.

Both are generated artifacts, not canonical leaves. Knowing what exists in a
knowledge region (an Index) is necessary but insufficient. Knowing which region
to visit next and in what order (a Map) is what enables efficient navigation.

**Source:** RFC-0023 §"Core Principle" (lines 34–39) and §"Indexes vs Maps" (lines 141–149).

## The Navigation Problem

An agent investigating "Why did Rome collapse?" may know that five sub-regions
exist (Government, Military, Economy, Religion, Collapse). But which should be
explored first? In what order? Which topics are prerequisites for which? Maps
answer these questions. Without maps, agents default to arbitrary or exhaustive
traversal — wasting context.

**Source:** RFC-0023 §"The Navigation Problem" (lines 41–57).

## Knowledge Map Schema

```ts
interface KnowledgeMap {
  id: string
  title: string
  description: string
  startNode: string
  routes: MapRoute[]
  generatedAt: string
}

interface MapRoute {
  id: string
  title: string
  purpose: string
  nodes: string[]      // ordered list of leaf IDs or region IDs
  difficulty?: number  // 1–10 scale
  estimatedTokens?: number
}
```

**Source:** RFC-0023 §"Map Schema" (lines 154–195).

## Six Route Types

RFC-0023 defines six canonical route types:

| Type | Purpose | Example |
|---|---|---|
| Learning Map | Acquire understanding | Arithmetic → Algebra → Calculus |
| Research Map | Investigate uncertainty | Collapse → Economy → Military → Politics |
| Decision Map | Support decisions | Requirements → Alternatives → Benchmarks → Decision |
| Dependency Map | Understand impact | Gravity → Orbital Mechanics → GPS |
| Exploration Map | Discover adjacent knowledge | PostgreSQL → related topics |
| Curriculum Map | Structured learning programs | Variables → Functions → Data Structures |

**Source:** RFC-0023 §"Learning Maps" through §"Curriculum Maps" (lines 196–326).

## Knowledge Journeys

A **Journey** is an agent traversal of a Map — the path an agent actually takes
when navigating from a question to an answer. Example:

```
Question: "Why did Rome collapse?"
Journey:
  History Index → Roman Empire Index → Collapse Index → Economic Theory → Evidence
```

Journeys are the runtime counterpart of Maps (design-time). Recording journeys
enables Maps to evolve based on actual agent traversal patterns.

**Source:** RFC-0023 §"Knowledge Journeys" (lines 328–349).

## Multiple Routes and Route Ranking

A single Map may expose multiple valid routes to the same destination. Example:
"Learn Databases" can follow Theory First (ACID → Transactions → PostgreSQL),
PostgreSQL First (PostgreSQL → Transactions → Theory), or Distributed Systems
First. Routes are preserved as alternatives.

Routes may be ranked by:
- Confidence (how well-validated is this path?)
- Popularity (how often do agents use it?)
- Completeness (does it cover the full topic?)
- Difficulty (1–10 scale)
- Research Value (does this route surface high-uncertainty topics?)

**Source:** RFC-0023 §"Multiple Routes" (lines 351–369) and §"Route Ranking" (lines 371–384).

## Context Cost Estimation

Maps expose estimated context consumption (token cost) per route. This enables
agents to make cost-aware navigation decisions — choosing a shorter, lower-cost
route when context budget is constrained, or a more thorough route when depth
is required.

```
Database Fundamentals Route: ~5,000 tokens
Full Roman Empire Collapse Route: ~18,000 tokens
```

**Source:** RFC-0023 §"Context Cost" (lines 406–418).

## Knowledge Distance

Knowledge Distance measures how far two concepts are from each other in the
knowledge graph:
- PostgreSQL → TigerBeetle: small distance (adjacent domain)
- PostgreSQL → Roman Empire: large distance (unrelated domain)

Distance enables shortest-path queries: "What is the shortest path between
Roman Law and European Union Law?"

**Source:** RFC-0023 §"Knowledge Distance" (lines 420–445) and §"Shortest Path" (lines 447–460).

## Discovery Paths

Maps support three discovery queries:
1. "What should I learn next?" (frontier expansion)
2. "What is related?" (adjacency exploration)
3. "What am I missing?" (gap detection)

**Source:** RFC-0023 §"Discovery Paths" (lines 462–471).

## Research Agent Integration

Research agents (RFC-0008) must use Maps as the primary navigation instrument:

```
Question → Map Selection → Route Selection → Index Navigation → Leaf Retrieval → Evidence
```

This is the full navigation-before-retrieval principle from RFC-0007 extended
to include the Map layer before the Index layer.

**Source:** RFC-0023 §"Research Guidance" (lines 473–489).

## Federation Maps

Maps may span Brain boundaries. A History Brain, a Law Brain, and a Political
Science Brain may be connected by a single federated Map that routes through
all three. Cross-brain navigation remains coherent as long as federation
contracts (RFC-0009, RFC-0015) are maintained.

**Source:** RFC-0023 §"Federation Maps" (lines 491–503).

## Map Generation

Maps are generated from multiple sources:
- Dependency relationships between leaves (RFC-0022)
- Ontology structure (RFC-0006)
- Existing Indexes (RFC-0019)
- Historical agent traversal patterns (Journeys)
- Evaluations (high-scoring leaves surface as navigation targets)

Maps are regenerated as knowledge evolves — new leaves create new routes, new
dependencies create new paths, completed research creates new journeys.

**Source:** RFC-0023 §"Map Generation" (lines 505–526).

## Map Health

Brains must expose Map Health metrics:
- **Broken Routes**: routes where intermediate nodes have been deleted.
- **Dead Ends**: routes that terminate without useful continuation.
- **Orphan Regions**: knowledge regions with no inbound routes.
- **Unused Paths**: routes that agents never traverse (low value).

Dead ends create tasks — the Brain identifies them and generates work to
extend or repair navigation.

**Source:** RFC-0023 §"Map Health" (lines 528–547) and §"Dead Ends" (lines 549–561).

## Navigation Efficiency Goal

Maps must minimize context consumption while maximizing understanding. This is
the navigation efficiency principle — every unnecessary hop in a route costs
tokens; every missed prerequisite causes backtracking. Well-designed Maps
reduce total context consumption per answered question.

**Source:** RFC-0023 §"Navigation Efficiency" (lines 563–571).

## Ten Canonical Rules

1. Indexes describe places.
2. Maps describe routes.
3. Every significant domain should expose maps.
4. Maps should support multiple routes.
5. Maps should evolve.
6. Maps should minimize context usage.
7. Research should follow maps.
8. Learning should follow maps.
9. Maps may cross Brain boundaries.
10. Navigation should be explainable.

**Source:** RFC-0023 §"Canonical Rules" (lines 595–609).

## Success Criteria

RFC-0023 defines ten success criteria. The system succeeds when:
1. Knowledge regions are navigable.
2. Multiple learning paths exist.
3. Research routes exist.
4. Dependency routes exist.
5. Shortest-path traversal works.
6. Maps evolve automatically.
7. Dead ends are visible.
8. Navigation efficiency improves.
9. Agents can explain their journeys.
10. Brains answer: "Where should I go next?"

**Source:** RFC-0023 §"Success Criteria" (lines 611–624).

## Answered Questions

**Q: What is the difference between a Knowledge Index and a Knowledge Map?**
An Index (RFC-0019) describes what knowledge exists in a region — it is a
structural inventory. A Map (RFC-0023) describes how to navigate between regions
— it is a routing guide. An Index answers "What is here?" A Map answers
"Where should I go next?" Both are generated artifacts updated as knowledge evolves.

**Q: How do Maps prevent agents from wasting context?**
Routes include `estimatedTokens` so agents can select the cheapest sufficient
path. Maps also sequence nodes in dependency order — if Concept A is a
prerequisite for Concept B, the route visits A before B, preventing the agent
from loading B without the foundation needed to understand it.

**Q: How are Maps kept up to date as knowledge evolves?**
Maps are dynamic — they are regenerated from leaf dependencies, ontology
structure, and agent journeys whenever the knowledge graph changes significantly.
The indexer scheduler (RFC-0028, delphi-indexer package) triggers map
regeneration as part of the index lifecycle.

**Q: Can a Map route span multiple Brains?**
Yes. RFC-0023 §"Federation Maps" explicitly supports cross-Brain routes.
A route may traverse leaves and indexes in a History Brain, a Law Brain,
and a Political Science Brain sequentially, as long as the Brains' federation
contracts are compatible. Navigation remains explainable because each hop
cites the Brain and region being traversed.

**Q: What creates a Dead End in a Knowledge Map?**
A Dead End occurs when a route reaches a leaf or region from which no further
meaningful navigation exists — there are no related topics, no dependency
descendants, and no research routes leading forward. Dead Ends are a form of
navigation debt: they indicate that the knowledge graph has a gap the Brain
cannot currently bridge. Dead Ends automatically generate tasks.
