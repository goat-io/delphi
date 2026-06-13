---
name: knowledge-debt-taxonomy-and-remediation
type: research
status: closed
region: Spec
topics:
  - knowledge-debt
  - navigation-debt
  - ontology-debt
  - debt-taxonomy
  - research-triggers
  - debt-remediation
  - RFC-0003
  - RFC-0011
  - RFC-0026
  - RFC-0028
sources:
  - rfcs/RFC-0003-Knowledge-and-Confidence-Theory.md
  - rfcs/RFC-0011-Knowledge-Economics.md
  - rfcs/RFC-0026-Tasks-and-Questions.md
  - rfcs/RFC-0028-Knowledge-Regions-and-Index-Lifecycle.md
  - rfcs/RFC-0031-Candidate-Staging-Protocol.md
  - rfcs/AGENTS.md
---

# Knowledge Debt Taxonomy and Remediation

## The Three Types of Debt

AGENTS.md defines three distinct types of debt that accumulate when a Brain
is under-maintained. Each is different in nature and requires different
remediation work.

---

## 1. Knowledge Debt

**Definition:** Knowledge debt exists when:
- Evidence is missing
- Confidence is weak
- Questions are unanswered

**Source:** AGENTS.md §"Knowledge Debt"; RFC-0003 §"Knowledge Debt".

Knowledge debt is the most fundamental type. It represents beliefs that exist
in the Brain but cannot be trusted — either because they have no supporting
evidence, because their confidence is too low to act on, or because they are
expressed as open Questions with no answer.

RFC-0003 enumerates the specific conditions:
- Missing evidence (belief exists but no EvidenceRef is attached)
- Weak confidence (confidence below operational threshold)
- Stale knowledge (freshness component has decayed)
- Unreviewed beliefs (no evaluation exists)
- Unsupported assumptions (marked ASSUMPTION with no evidence)
- Contradictions (contradictionRisk > 0, unresolved)

### How Knowledge Debt Creates Work

RFC-0003 §"Research Triggers" specifies that the following events
automatically generate research tasks:
- Confidence decreases below a threshold
- A contradiction appears
- Evidence becomes stale (freshness decays)
- A dependency changes
- An ontology gap appears

Knowledge debt drives the research agenda directly. The Knowledge Economics
formula (RFC-0011) prioritizes research tasks by impact × confidence gap ÷ cost,
so high-impact beliefs with low confidence get researched first.

**Source:** RFC-0003 §"Research Triggers"; RFC-0011 §"Priority Formula".

---

## 2. Navigation Debt

**Definition:** Navigation debt exists when knowledge exists but cannot be
discovered efficiently.

**Source:** AGENTS.md §"Navigation Debt".

A Brain with perfect knowledge but no navigable indexes is useless. Agents
that cannot find relevant leaves cannot use or improve the knowledge. Navigation
debt is distinct from knowledge debt: the facts are correct, but the paths to
them are broken or absent.

Navigation debt accumulates when:
- Region indexes are stale (RFC-0028)
- A region has grown beyond ~150 leaves without splitting (too broad to summarize)
- A topic accumulates enough cross-links to warrant a Hub Region but no hub region
  has been created yet (hub threshold: degree ≥ 15, RFC-0028)
- Knowledge Maps (RFC-0023) are stale or missing
- QUESTION leaves are unlinked from the research agenda

### How Navigation Debt Creates Work

RFC-0028 §"The Regeneration Policy" defines the scheduler's regeneration
priority as `Region Importance × Staleness Weight`. High-importance regions
with high staleness weight generate `INDEX_REFRESH` tasks (RFC-0026 task type).

Region Splitting tasks are generated when a region exceeds ~150 leaves.
Region Folding tasks are generated when a region drops below 5 leaves.

A growing review queue of FLAGGED candidates (RFC-0031) is also a Navigation
Debt signal: knowledge that should be in the Brain is blocked in the staging
area, unavailable for navigation.

**Source:** RFC-0028 §"The Regeneration Policy", §"Region Sizing".

---

## 3. Ontology Debt

**Definition:** Ontology debt exists when reality cannot be represented cleanly.

**Source:** AGENTS.md §"Ontology Debt".

The Delphi ontology system (RFC-0006) defines the type system: what kinds of
leaves exist, what relationships are valid between them, and what validation
rules govern the knowledge graph. Ontology debt accumulates when:
- A domain concept has no corresponding ontology type
- A relationship that exists in the domain has no edge type
- Extracted beliefs cannot be classified correctly because no category fits
- Overlapping or contradictory type definitions cause classification ambiguity

### How Ontology Debt Creates Work

RFC-0003 lists "ontology gaps" as an automatic research trigger. When an
extraction agent encounters a concept it cannot classify, it creates an
`ONTOLOGY` task (RFC-0026 task type) proposing a new type or relationship.

Ontology tasks go through the ontology governance process (RFC-0025): proposal
→ discussion → evaluation → acceptance or rejection. Accepted changes extend
the ontology and allow previously unclassifiable beliefs to be correctly typed.

**Source:** RFC-0003 §"Research Triggers"; RFC-0006 §"Ontology Types"; RFC-0025.

---

## Debt as a Driver of the Evolution Loop

All three debt types feed directly into the evolution loop (AGENTS.md):

| Debt Type | Loop Step | Task Type Generated |
|---|---|---|
| Knowledge Debt | Generate + Execute | RESEARCH, EXTRACTION |
| Knowledge Debt | Evaluate | EVALUATION |
| Navigation Debt | Understand | INDEX_REFRESH |
| Ontology Debt | Generate | ONTOLOGY |

The Knowledge Economics formula (RFC-0011) converts debt into task priority,
ensuring the most impactful debt is addressed first.

**Source:** AGENTS.md §"What Is Delphi?"; RFC-0011 §"Priority Formula".

---

## Measuring Debt

### Knowledge Debt Metrics
- Count of beliefs with confidence < threshold (e.g., < 0.50)
- Count of beliefs with zero evidence references
- Count of open (unresolved) QUESTION leaves
- Average confidence across region

### Navigation Debt Metrics
- Count of stale indexes
- Average index staleness (minutes since last generation)
- Count of regions above size bound (>150 leaves)
- Count of stale reads (agents reading stale indexes)
- Review queue depth (FLAGGED candidates, per RFC-0031)

### Ontology Debt Metrics
- Count of leaves with no ontology type assigned
- Count of open ONTOLOGY tasks
- Count of beliefs with classification confidence below threshold

**Source:** RFC-0028 §"Metrics"; RFC-0031 §"Candidate Metrics".

---

## The Relationship Between Debt Types

Debt types are not independent. Knowledge debt can create navigation debt
and vice versa:

- Stale indexes (navigation debt) mean agents cannot find relevant beliefs
  to support, so knowledge debt accumulates (evidence is not added to beliefs
  that could benefit from it).
- Unclassifiable beliefs (ontology debt) stay out of the correct regions,
  causing navigation debt in those regions.
- Low-confidence beliefs (knowledge debt) generate frequent research tasks,
  which may produce candidates that overwhelm the review queue, creating
  navigation debt.

The evolution loop handles all three simultaneously by dispatching tasks
of different types in priority order.

**Source:** RFC-0011 §"Knowledge Economics Overview".

---

## Answers to Open Questions

**Q: What is the difference between Knowledge Debt and a simple gap in knowledge?**
Knowledge Debt implies that a belief SLOT exists — the Brain knows it needs
this information (via a QUESTION leaf or a low-confidence belief) but has not
filled it. A simple gap is not represented at all. Knowledge Debt is tracked;
a gap is unknown. The distinction matters because tracked debt generates
research tasks; an unknown gap does not.
**Source:** AGENTS.md §"Knowledge Debt"; RFC-0026 §"Question Schema".

**Q: Can debt be resolved without agent work?**
Sometimes. Adding a new source asset (human-provided PDF, URL, document)
that contains high-quality evidence for a known low-confidence belief
reduces Knowledge Debt through extraction and promotion. But agent work
(RESEARCH, EXTRACTION, EVALUATION tasks) is required to process that asset.
Debt cannot be resolved purely by human action without the extraction pipeline.
**Source:** RFC-0003 §"Research Triggers"; RFC-0020 §"Asset Ingestion".

**Q: What happens if debt accumulates faster than the loop can resolve it?**
The Knowledge Economics formula (RFC-0011) ensures the highest-impact debt
is prioritized. Low-impact debt may persist indefinitely without being
resolved. The system does not guarantee complete debt elimination — it
guarantees optimal prioritization of debt resolution within available
agent capacity and token budget.
**Source:** RFC-0011 §"Priority Formula", §"Convergence".

**Q: Is Ontology Debt ever automatically resolved?**
No. Ontology changes require the governance process (RFC-0025): proposal,
evaluation, and acceptance. Auto-resolution of ontology debt would risk
creating an incoherent type system. The system can auto-detect ontology
debt (by counting unclassifiable beliefs) and auto-generate ONTOLOGY tasks,
but resolution requires deliberate human or agent review.
**Source:** RFC-0025 §"Governance Process".
