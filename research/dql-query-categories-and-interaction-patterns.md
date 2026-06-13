---
name: dql-query-categories-and-interaction-patterns
type: research
status: closed
region: Spec
topics:
  - dql
  - query-categories
  - knowledge-queries
  - impact-queries
  - federation-queries
  - debt-queries
  - query-execution-model
  - RFC-0024
  - RFC-0007
sources:
  - rfcs/RFC-0024-Delphi-Query-Language-DQL.md
  - rfcs/RFC-0007-Search-Navigation-and-Knowledge-Discovery.md
  - rfcs/RFC-0022-Dependency-and-Impact-Propagation.md
---

# DQL Query Categories and Knowledge Interaction Patterns

## What DQL Is

DQL (Delphi Query Language) is a universal language for querying a Brain.
It is designed for humans, agents, workflows, and Brains to interact with
knowledge consistently. The core design distinction from SQL:

> DQL does not query tables. DQL queries knowledge.

SQL operates on rows. GraphQL operates on APIs. DQL operates on Beliefs,
Evidence, Decisions, Evaluations, Tasks, Indexes, Maps, Dependencies, and
knowledge-graph concepts.

DQL is human-first: queries resemble natural language (`SHOW beliefs ABOUT`)
rather than structured query predicates.

**Source:** RFC-0024 §"Purpose", §"Human First".

---

## The 14 Query Categories

RFC-0024 defines 14 named query categories, each mapping to a distinct
interaction intent. Below is the complete taxonomy with canonical examples.

---

### 1. Discovery Queries
Find what exists in the Brain about a topic.

```sql
SHOW beliefs ABOUT "Roman Empire"
SHOW concepts RELATED TO "TigerBeetle"
```

Discovery is the entry point for exploration. No prior knowledge of the
Brain's structure is required.

---

### 2. Navigation Queries
Traverse the index hierarchy to orient within a topic.

```sql
START AT "Roman Empire" SHOW next topics
SHOW map FOR "Databases"
SHOW index FOR "Roman Empire"
SHOW child indexes FOR "History"
```

Navigation queries implement the Navigation-First principle (RFC-0007):
agents navigate the index hierarchy before retrieving raw leaf content.

---

### 3. Route Queries
Find paths between topics across the knowledge graph.

```sql
SHOW route FROM "Roman Law" TO "European Union Law"
SHOW shortest path FROM "PostgreSQL" TO "TigerBeetle"
```

Route queries use Knowledge Maps (RFC-0023) to find conceptual traversal
paths. They answer "How does A relate to B through the knowledge graph?"

---

### 4. Dependency Queries
Trace what a belief depends on and what depends on it.

```sql
SHOW dependencies FOR belief "Gravity"
SHOW consumers FOR belief "Gravity"
```

Dependency queries expose the dependency graph (RFC-0022). They identify
upstream supports (what must be true for this belief to hold) and downstream
consumers (what would be affected if this belief changed).

---

### 5. Impact Queries
Determine what breaks if a belief becomes false.

```sql
WHAT BREAKS IF belief "Gravity" BECOMES FALSE
SHOW affected decisions FOR belief "TigerBeetle Reliability"
```

Impact queries are one of Delphi's most important capabilities (RFC-0003).
They traverse the dependency graph and identify all leaves and decisions
whose confidence would be affected by a change to the target belief.

---

### 6. Confidence Queries
Surface beliefs by confidence level; identify weak spots.

```sql
SHOW beliefs WHERE confidence < 0.60
SHOW weakest beliefs ORDER BY impact DESC
```

Confidence queries expose Knowledge Debt directly — the beliefs with the
lowest confidence and highest impact are the research agenda.

---

### 7. Contradiction Queries
Find where the Brain holds conflicting beliefs.

```sql
SHOW contradictions FOR "Minimum Wage"
SHOW competing theories FOR "Roman Empire Collapse"
```

Contradictions are first-class in Delphi (RFC-0003). These queries surface
disagreements so they can be investigated, scoped, or resolved.

---

### 8. Consensus Queries
Measure agreement across sources for a belief.

```sql
SHOW consensus FOR belief "Climate Change"
```

Consensus queries expose the Consensus component of the confidence formula
(RFC-0003). A high consensus score with low source diversity is different
from the same score with many independent sources — both are visible.

---

### 9. Evidence Queries
Retrieve the provenance behind a belief.

```sql
SHOW evidence FOR belief "Roman Economic Decline"
SHOW strongest evidence FOR belief "TigerBeetle Reliability"
SHOW evidence FROM asset "roman-history.pdf"
```

Evidence queries expose the EvidenceRef records (RFC-0004) attached to
beliefs, including source citations, reliability scores, and timestamps.

---

### 10. Research Queries
Identify unanswered questions and next steps for the research agenda.

```sql
SHOW open questions FOR domain "Databases"
WHAT SHOULD WE LEARN NEXT?
```

Research queries expose the QUESTION leaves (RFC-0026) in a region or
domain. `WHAT SHOULD WE LEARN NEXT?` uses the Knowledge Economics priority
formula (RFC-0011) to rank open questions by impact × confidence gap ÷ cost.

---

### 11. Knowledge Debt Queries
Surface accumulated debt across types.

```sql
SHOW highest knowledge debt
SHOW navigation debt
```

These expose all three debt types: Knowledge Debt (missing evidence, low
confidence), Navigation Debt (stale indexes, oversized regions), and
Ontology Debt (unclassifiable beliefs). See AGENTS.md for the three-debt
taxonomy.

---

### 12. Evaluation Queries
Retrieve quality scores for leaves.

```sql
SHOW evaluations FOR "System Architecture"
SHOW lowest scoring evaluations
```

Evaluation queries expose the Evaluation records (RFC-0005) produced by
rubric scoring. They answer "How good is the knowledge in this area?"

---

### 13. Decision Queries
Trace decisions and their rationale.

```sql
SHOW decisions AFFECTED BY belief "Gravity"
WHY WAS decision "Use PostgreSQL" MADE?
```

Decision queries expose the Decision leaves (RFC-0012) and their belief
dependencies. `WHY WAS X MADE?` reconstructs the full rationale chain:
which beliefs supported the decision, what their confidence was at the time,
and whether that evidence has since changed.

---

### 14. Federation Queries
Query across multiple Brains simultaneously.

```sql
SEARCH all brains FOR "Roman Law"
SHOW route FROM brain "History" TO brain "Law"
```

Federation queries traverse the multi-brain network (RFC-0009, RFC-0014).
They respect Brain sovereignty: a federated Brain may decline to share certain
leaves based on its access policy.

---

## Ontology and Asset Queries (Additional Categories)

RFC-0024 also defines:

```sql
SHOW ontology FOR domain "Law"
SHOW missing ontology coverage
SHOW assets FOR work "The Bible"
SHOW expressions FOR work "The Bible"
```

These expose the type system (RFC-0006) and the Works/Assets hierarchy
(RFC-0020), useful for understanding the structural coverage of knowledge.

**Source:** RFC-0024 §"Ontology Queries", §"Asset Queries", §"Work Queries".

---

## The Query Execution Model

All DQL queries follow a common execution path per RFC-0024:

```
Question
  ↓
DQL Parser → Abstract Query Plan
  ↓
Index Navigation (RFC-0007)
  ↓
Leaf / Evidence Retrieval
  ↓
Confidence-Aware Ranking
  ↓
Response with Provenance
```

The critical step is Index Navigation before retrieval. Agents reading
a Brain via DQL always navigate the index hierarchy first — they never
jump directly to leaf content without orientation. This implements the
Navigation-First Principle (RFC-0007).

**Source:** RFC-0024 §"Query Execution Model".

---

## Answers to Open Questions

**Q: Is DQL a formal language with a grammar, or natural language?**
DQL is a formal language with a natural-language-style syntax. It is NOT
a natural language interface — queries must match the defined syntax.
The human-readability is intentional (verbs like SHOW, WHAT BREAKS IF,
WHY WAS) but the structure is specified and parseable. RFC-0024 defines
the full syntax; implementations are expected to build a formal parser.
**Source:** RFC-0024 §"Human First", §"Query Execution Model".

**Q: How does DQL handle queries about beliefs that don't exist yet?**
DQL returns empty result sets for non-existent beliefs. The Research query
category (`SHOW open questions`) can surface related QUESTION leaves that
signal the Brain knows the topic is under-researched. The query `WHAT
SHOULD WE LEARN NEXT?` uses the Knowledge Economics formula to recommend
what to research based on existing gaps.
**Source:** RFC-0024 §"Research Queries"; RFC-0011 §"Priority Formula".

**Q: Can an agent execute DQL queries autonomously?**
Yes. DQL is designed for agents as the primary consumer, not just humans.
The Agent architecture (RFC-0008) uses DQL as the primary interface to
navigate and interrogate the Brain. An agent's research loop: navigate_index
→ search → get_leaf → (DQL impact/dependency queries) → propose_knowledge.
**Source:** RFC-0024 §"Purpose"; RFC-0008 §"Agent Query Protocol".

**Q: What is the relationship between DQL and the MCP tools?**
The delphi MCP server (navigate_index, search, get_leaf, ask, trace_dependencies,
what_breaks_if) implements DQL semantics over the HTTP/MCP protocol surface.
These MCP tools are the production interface to DQL operations. DQL is the
language; MCP tools are the execution surface exposed to Claude agents.
**Source:** AGENTS.md §"Delphi In Delphi — USE THE BRAIN".
