---
name: evaluation-rubrics-quality-gates-and-consensus
type: research
status: closed
region: Spec
topics:
  - evaluation
  - rubrics
  - quality-gates
  - scoring
  - consensus
  - evaluation-debt
  - RFC-0005
  - RFC-0003
  - RFC-0026
sources:
  - rfcs/RFC-0005-Evaluation-and-Rubrics.md
  - rfcs/RFC-0003-Knowledge-and-Confidence-Theory.md
  - rfcs/RFC-0026-Tasks-and-Questions.md
  - rfcs/RFC-0011-Knowledge-Economics.md
---

# Evaluation, Rubrics, Quality Gates, and Consensus in Delphi

## The Fundamental Distinction

Knowledge and Evaluation are separate concepts in Delphi.

- **Knowledge**: What do we believe? → stored in Leaves with Confidence
- **Evaluation**: How good is this belief or output? → stored in Evaluation records

A belief about TigerBeetle's suitability for financial ledger workloads is
knowledge. Scoring TigerBeetle 87/100 against an architecture rubric is
evaluation. They are not the same, and they should not be conflated.

**Source:** RFC-0005 §"Core Principle".

---

## What a Rubric Is

A Rubric defines what "good" looks like for a specific type of knowledge or
output. Rubrics are first-class Leaves (`LeafKind: RUBRIC`), so they are
versioned, linked to evidence, and subject to the same confidence and
evaluation lifecycle as any other knowledge.

### Rubric Schema

```ts
interface Rubric {
  id: string
  name: string
  version: string
  description: string
  criteria: Criterion[]
  scoringMethod:
    | "WEIGHTED"      // weighted sum of criterion scores
    | "PASS_FAIL"     // each criterion must pass independently
    | "CONSENSUS"     // multiple evaluators; aggregate score
    | "PAIRWISE"      // A vs B comparisons
}
```

### Criterion Schema

```ts
interface Criterion {
  id: string
  name: string
  description: string
  weight: number            // fraction of total score (sum to 1.0)
  scoringGuidance: string   // how to score 0–10 on this dimension
}
```

Examples of rubric types:
- Design Rubric (clarity, coherence, coverage, novelty)
- Architecture Rubric (reliability, scalability, simplicity, security)
- Research Quality Rubric (evidence strength, source diversity, recency, rigor)
- Legal Argument Rubric (precedent, jurisdiction, logical validity)

**Source:** RFC-0005 §"Rubric Schema" and §"Criterion".

---

## How Evaluations Are Structured

An Evaluation is a record linking a Rubric to a target (a Leaf, a candidate, a
document) with scores per criterion and an overall verdict.

```ts
interface Evaluation {
  id: string
  rubricId: string
  targetId: string           // the leaf or candidate being evaluated
  targetType: string
  evaluatorId: string        // agent ref or human steward ID
  criterionScores: Record<string, number>   // criterion ID → score [0, 10]
  overallScore: number       // weighted aggregate, [0.0, 1.0]
  verdict: "PASS" | "FAIL" | "REVIEW_REQUIRED"
  notes?: string
  evaluatedAt: string        // ISO-8601
}
```

The `verdict` is determined by comparing `overallScore` against the rubric's
`passingScore` threshold. A `FAIL` sets the target leaf's `status` to
`REVIEW_REQUIRED` and triggers a `REVIEW` task.

**Source:** RFC-0005 §"Evaluation Record".

---

## Scoring Methods

### WEIGHTED

The most common method. Each criterion contributes to the overall score
proportionally to its weight. A leaf scoring 0.90 on evidence strength
(weight 0.40) and 0.60 on recency (weight 0.20) contributes `0.36 + 0.12 = 0.48`
from those two criteria.

### PASS_FAIL

Used for rubrics with hard requirements: each criterion must independently
meet a threshold. A single failing criterion fails the evaluation, regardless
of other scores. Appropriate for legal compliance checks or security audits.

### CONSENSUS

Multiple independent evaluators score the same target. The aggregate score
is computed from their individual scores. Consensus evaluation is more
expensive (more agents required) but more reliable — it reduces single-evaluator
bias.

### PAIRWISE

Used for comparative evaluation: "Is A better than B?" rather than absolute
scoring. Produces a ranking rather than a score. Appropriate for choosing between
candidate architectures or competing research summaries.

**Source:** RFC-0005 §"Scoring Methods".

---

## Evaluation Consensus: Reviewer Agreement

For `CONSENSUS` scoring, RFC-0005 defines reviewer agreement as a quality
signal. When evaluators' scores diverge significantly (standard deviation > 0.20),
the evaluation is flagged as contested. Contested evaluations:

1. Do not immediately produce a `PASS` or `FAIL` verdict.
2. Are queued for a tiebreaker evaluation or human review.
3. Contribute lower weight to the target leaf's confidence (because the
   evaluators themselves disagree).

High reviewer agreement increases the confidence contribution of evaluation
evidence. Low agreement signals genuine uncertainty about the quality of the
belief.

**Source:** RFC-0005 §"Consensus" and §"Reviewer Agreement".

---

## Quality Gates

A Quality Gate is a rubric applied at a transition point in the pipeline:

| Gate | Where Applied | Rubric Type |
|---|---|---|
| Extraction gate | After candidate extraction | Research Quality Rubric |
| Promotion gate | Before candidate → leaf | Evidence Quality Rubric |
| Publication gate | Before index regeneration | Coverage Rubric |
| Federation gate | Before exporting beliefs | Export Quality Rubric |

If a candidate fails the extraction gate, it is `REJECTED` immediately. If it
fails the promotion gate, it is `FLAGGED` for human review. The MVP implements
the extraction and promotion gates only.

**Source:** RFC-0005 §"Quality Gates".

---

## Evaluation Debt

Evaluation Debt accumulates when:

1. Leaves exist without any Evaluation records.
2. Evaluations are stale (the rubric version has changed since the last evaluation).
3. Leaf content has changed since the last evaluation.

Evaluation Debt is a first-class concern because it means the Brain does not
know whether its existing beliefs meet quality standards. The knowledge economics
system (RFC-0011) assigns priority to clearing Evaluation Debt based on the
impact score of the un-evaluated leaves.

**Source:** RFC-0005 §"Evaluation Debt" and RFC-0011 §"Debt Prioritization".

---

## How Rubric Validity Is Assessed

RFC-0005 §"Rubric Quality" addresses the meta-question: who evaluates the
evaluator? Rubrics themselves are Leaves with evidence. A rubric's validity
is assessed through:

1. **Source citation**: Is the rubric based on established standards (ISO, IEEE,
   academic consensus, domain authority)?
2. **Application history**: Has the rubric produced consistent verdicts across
   multiple evaluations? High variance = rubric is ambiguous.
3. **Peer review**: Has the rubric been evaluated by domain experts?
4. **Version control**: Rubric updates are versioned. Old evaluations remain
   linked to the rubric version that produced them.

A rubric with weak sourcing and high variance is itself a Hypothesis — it may
guide evaluation, but the evaluation results carry a confidence discount.

**Source:** RFC-0005 §"Rubric Quality" and §"Rubric Versioning".

---

## The Relationship Between Evaluation and Confidence

Evaluation outcomes feed directly into the RFC-0003 confidence formula.
An evaluation record is a form of Evidence:

- A PASS verdict increases `evidenceStrength` and `consensus` components.
- A FAIL verdict increases `contradictionRisk`.
- Multiple independent PASS verdicts from different evaluators increase
  `sourceDiversity`.

This means evaluation is not a separate quality channel — it is integrated
into the core confidence model. A belief with strong evidence but repeated
FAIL evaluations will have its confidence reduced by the contradiction signal.

**Source:** RFC-0005 §"Evaluation as Evidence" and RFC-0003 §"Confidence Formula".

---

## Answers to Open Questions

**Q: How widely accepted are Delphi's default rubrics?**
The default rubrics (Research Quality, Evidence Quality) are defined by the
Delphi specification itself. They are not external standards. Their validity
rests on their internal consistency and the degree to which their application
produces useful quality distinctions in practice. RFC-0005 §"Rubric Quality"
acknowledges this: initial rubrics are hypotheses that gain validity through
demonstrated application history.
**Source:** RFC-0005 §"Rubric Quality".

**Q: Can a rubric be disputed?**
Yes. Because Rubrics are Leaves, they can be challenged with contradicting
evidence just like any belief. A `CONTRADICTS` relationship between a research
finding and a rubric criterion signals that the criterion's scoring guidance
may be wrong. This creates an `ONTOLOGY` task to revise the rubric.
**Source:** RFC-0005 §"Rubric Disputes" and RFC-0025 §"Ontology Revision".

**Q: Who can create a rubric?**
Any agent or human with write access to the Brain. Rubrics enter the same
extraction and promotion pipeline as other candidates. Creating a rubric
requires providing evidence for its criteria (why these dimensions? why these
weights?). An unsupported rubric will have low confidence, limiting how much
weight its evaluations carry.
**Source:** RFC-0005 §"Rubric Creation".

**Q: Does the MVP ship with any rubrics pre-installed?**
RFC-0005 specifies three seed rubrics for the MVP:
1. Research Quality Rubric (for evaluating research output)
2. Evidence Quality Rubric (for evaluating evidence records)
3. Specification Coverage Rubric (for evaluating spec completeness — used by
   the self-evolution loop to score this region)
**Source:** RFC-0005 §"MVP Seed Rubrics".
