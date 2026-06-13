---
name: confidence-components-implementation-mapping
type: research
status: closed
region: Spec
topics:
  - confidence
  - confidence-formula
  - belief-strength
  - evidence-strength
  - source-reliability
  - source-diversity
  - freshness
  - consensus
  - contradiction-risk
  - RFC-0003
  - RFC-0004
  - RFC-0005
sources:
  - rfcs/RFC-0003-Knowledge-and-Confidence-Theory.md
  - rfcs/RFC-0004-Evidence-and-Provenance.md
  - rfcs/RFC-0005-Evaluation-and-Rubrics.md
---

# Confidence Components: Implementation Mapping

## The Six-Component Formula

RFC-0003 §"Initial Confidence Formula" defines confidence as a weighted
sum of six components, not a single heuristic number:

```
confidence =
  (0.30 × evidenceStrength)
+ (0.20 × sourceReliability)
+ (0.15 × sourceDiversity)
+ (0.15 × freshness)
+ (0.20 × consensus)
- (0.20 × contradictionRisk)

Clamp: 0 ≤ confidence ≤ 1
```

The positive weights sum to 1.0. A belief with perfect positive
components and zero contradiction risk reaches confidence exactly 1.0.

**Source:** RFC-0003 §"Initial Confidence Formula" and §"Confidence Components".

## Component Definitions and Data Sources

### 1. Evidence Strength (weight: 0.30)

Evidence Strength is the most heavily weighted component. It measures
the quality and directness of the evidence backing an assertion.

How it is computed:
- Count of evidence items attached to the leaf (RFC-0004 §"Evidence Items")
- The `evidenceType` of each item (DIRECT > INDIRECT > CIRCUMSTANTIAL)
- The `reliability` score of the evidence source

A belief backed by three direct citations from peer-reviewed sources
scores far higher on this component than a belief backed by a single
indirect inference.

**Source:** RFC-0003 §"Confidence Components" → Evidence Strength;
RFC-0004 §"Evidence Types".

### 2. Source Reliability (weight: 0.20)

Source Reliability reflects how trustworthy the origin of the evidence
is, independent of the evidence content itself.

Each evidence item carries a `sourceType`:
- PRIMARY_SOURCE (highest: original documents, datasets, court decisions)
- SECONDARY_SOURCE (intermediate: papers, books, analysis)
- TERTIARY_SOURCE (lowest: summaries, encyclopedias)

An asset's reliability score is set at ingestion time and attached to
every evidence item derived from it.

**Source:** RFC-0004 §"Source Types" and §"Source Reliability Scoring".

### 3. Source Diversity (weight: 0.15)

Source Diversity penalizes beliefs that are supported by many pieces
of evidence but from a single source. A belief backed by ten papers
from one lab is less reliable than one backed by three papers from
three independent labs.

Implementation: count of distinct `sourceId` values across the evidence
items of a leaf. Normalized to [0, 1] by a configured cap (default: 5
distinct sources = 1.0).

**Source:** RFC-0003 §"Source Diversity".

### 4. Freshness (weight: 0.15)

Freshness reflects temporal validity. Evidence ages; knowledge domains
have different decay rates.

Decay model:
- Each evidence item has `observedAt` (when the real-world event occurred)
  and `citedAt` (when it was added to the Brain)
- Freshness decays as a function of `now - observedAt`
- Domain-specific decay constants: legal citations decay slowly;
  benchmark results may decay quickly as hardware/software changes

MVP default: linear decay over a configurable half-life (default 365 days).

**Source:** RFC-0003 §"Freshness" and §"Confidence Decay".

### 5. Consensus (weight: 0.20)

Consensus reflects agreement across independent agents, sources,
and evaluation passes. High consensus means multiple independent
observers reached the same conclusion.

Sources of consensus signal:
- Multi-agent evaluation passes (RFC-0005 §"Consensus Scoring")
- Multiple independent evidence items reaching the same assertion
- RFC-0008 research agent corroboration

Consensus is normalized to [0, 1] based on the proportion of
independent observers who agree.

**Source:** RFC-0003 §"Consensus"; RFC-0005 §"Consensus Scoring".

### 6. Contradiction Risk (weight: -0.20)

Contradiction Risk is the only negative term. It SUBTRACTS from
confidence, reflecting active evidence that opposes the assertion.

A `contradictionRisk` of 0.0 means no contradicting evidence exists.
A `contradictionRisk` of 1.0 means there is strong opposing evidence,
making the assertion net-negative in confidence.

Computed from:
- Count and strength of CONTRADICTS relationships in the knowledge graph
- Quality of the contradicting evidence (same components as above)

This ensures a belief cannot reach high confidence if it is
actively contradicted by strong opposing evidence.

**Source:** RFC-0003 §"Contradiction Risk"; RFC-0022 §"Contradiction Modeling".

## Confidence Levels: Interpretation Table

RFC-0003 §"Confidence Levels" defines how confidence scores are interpreted:

| Score Range | Label      | Interpretation |
|-------------|------------|----------------|
| 0.00–0.20   | Very Weak  | Barely supported; treat as unknown |
| 0.20–0.40   | Weak       | Some support but not reliable |
| 0.40–0.60   | Moderate   | Mixed evidence; the Spec region's current average |
| 0.60–0.80   | Strong     | Well-supported with reasonable diversity |
| 0.80–0.95   | Very Strong| High-quality, diverse, fresh evidence |
| 0.95–1.00   | Fact-Like  | Operationally treated as fact |

The Spec region's current average confidence is 0.50 (Moderate).

**Source:** RFC-0003 §"Confidence Levels".

## Why Confidence Is Not a Single Number

RFC-0003 §"Confidence Components" explains: "Confidence should not be a
single number." The decomposition serves three functions:

1. **Debuggability** — agents can identify WHICH component is low and
   generate targeted research tasks (e.g., "add more source diversity").

2. **Propagation tracing** — RFC-0022 impact propagation operates on
   the confidence value. Knowing which component drove a change explains
   why downstream beliefs were affected.

3. **Rubric alignment** — RFC-0005 rubrics can score evidence along the
   same axes (strength, reliability, diversity), creating a closed loop
   between evaluation and confidence scoring.

**Source:** RFC-0003 §"Why Components, Not A Single Score".

## Canonical Questions This Answers

- *What are the six confidence components?* — Evidence Strength (0.30),
  Source Reliability (0.20), Source Diversity (0.15), Freshness (0.15),
  Consensus (0.20), and Contradiction Risk (−0.20).
- *Which component has the highest weight?* — Evidence Strength at 0.30.
- *Can confidence exceed 1.0?* — No; the formula is clamped to [0, 1].
- *What makes contradiction risk different from the other components?* —
  It is a negative term; it subtracts from confidence rather than adding.
- *How does freshness work?* — Evidence decays over time from its
  `observedAt` timestamp using a domain-specific half-life (default: 365 days).
- *Why does Delphi use a weighted formula rather than a lookup table?* —
  To make confidence continuously updatable as evidence changes and to
  enable targeted gap-filling via research tasks.
- *What is source diversity?* — The count of distinct evidence sources.
  A belief backed by many items from one source is penalized relative to
  one backed by fewer items from many independent sources.
