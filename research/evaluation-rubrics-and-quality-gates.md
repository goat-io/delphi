---
name: evaluation-rubrics-and-quality-gates
type: research
status: closed
region: Spec
topics:
  - evaluation
  - rubrics
  - quality gates
  - consensus
  - evaluation debt
  - RFC-0005
sources:
  - rfcs/RFC-0005-Evaluation-and-Rubrics.md
  - rfcs/RFC-0000-Delphi-Constitution.md
---

# Evaluation, Rubrics, and Quality Gates in Delphi

## Core Separation: Knowledge vs Evaluation

RFC-0005 establishes the most important separation in Delphi after the
Leaf/Evidence split: **Knowledge ≠ Evaluation**.

- A *belief* says: "TigerBeetle is suitable for Walliver."
- An *evaluation* says: "TigerBeetle scores 87/100 against our ledger architecture rubric."

These are different primitives. Beliefs carry confidence about *what is true*.
Evaluations carry scores about *how good something is*. Both are first-class
leaves, but they serve entirely different purposes.

**Source:** RFC-0005 §"Core Principle" (lines 40–51).

## Why Evaluation Exists

Without rubrics, evaluation is subjective and non-reproducible. With rubrics,
evaluation becomes explainable, reproducible, and auditable. Agents need a
repeatable way to determine quality that produces consistent scores across
different evaluators and across time.

**Source:** RFC-0005 §"Why Evaluation Exists" (lines 53–66).

## Rubric Schema

A Rubric defines what good looks like. RFC-0005 specifies its structure:

```ts
interface Rubric {
  id: string
  name: string
  version: string
  description: string
  criteria: Criterion[]
  scoringMethod: "WEIGHTED" | "PASS_FAIL" | "CONSENSUS" | "PAIRWISE"
}
```

Rubrics are first-class leaves — they carry version history, provenance,
evidence, and confidence like any other leaf. Examples include Design Rubrics,
Architecture Rubrics, Legal Argument Rubrics, Research Quality Rubrics.

**Source:** RFC-0005 §"Rubric Schema" (lines 88–106).

## Criterion Schema

Each Rubric contains one or more Criteria, which are measurable dimensions:

```ts
interface Criterion {
  id: string
  name: string
  description: string
  weight: number
  scoringRange: { min: number; max: number }
}
```

An Architecture Rubric, for example, might contain Reliability, Scalability,
Security, Observability, Maintainability, and Cost as criteria.

**Source:** RFC-0005 §"Criterion Schema" (lines 128–148).

## EvaluationResult Schema

Evaluations are themselves leaves:

```ts
interface EvaluationResult {
  rubricId: string
  targetLeafId: string
  evaluatorId: string
  scores: CriterionScore[]
  finalScore: number
  rationale: string
}

interface CriterionScore {
  criterionId: string
  score: number
  rationale: string
}
```

Each criterion score carries a rationale string, ensuring evaluations are
explainable rather than opaque numerical outputs.

**Source:** RFC-0005 §"Evaluation Results" (lines 150–179).

## Evaluation Confidence

Evaluations themselves require confidence scores. A single evaluator produces
lower-confidence results than ten independent evaluators. This mirrors the
general confidence theory (RFC-0003) — diversity and volume of evaluators
increases confidence in the evaluation outcome.

**Source:** RFC-0005 §"Evaluation Confidence" (lines 206–218).

## Consensus and Reviewer Agreement

RFC-0005 distinguishes consensus from simple agreement:
- **Consensus** is *measured* agreement — the statistical distribution of scores
  across multiple evaluators.
- **Reviewer Agreement** is measured by variance. Low variance → high agreement.
  High variance → the evaluation requires human review.

Example: ten evaluators scoring 86, 88, 89, 87, 87 show high consensus. Ten
evaluators scoring 40, 55, 90, 72, 88 show high variance and low consensus.

**Source:** RFC-0005 §"Consensus" (lines 220–239) and §"Reviewer Agreement" (lines 241–254).

## Evaluation Evidence

Evaluations must cite evidence. An Architecture Evaluation should reference Load
Test Results, Security Assessments, and Cost Analyses — not merely assert a
score. This evidence-linking requirement parallels the evidence requirement for
beliefs (RFC-0004).

**Source:** RFC-0005 §"Evaluation Evidence" (lines 256–268).

## Rubric Provenance and Lineage

Rubrics must document their origins and version history:
- **Provenance**: Where the rubric came from (e.g., WCAG, Nielsen Heuristics,
  Apple HIG, Material Design for a Design Rubric).
- **Lineage**: The version chain (Design Rubric v1 → v2 → v3). History is
  preserved, not discarded.
- **Rubric Confidence**: Rubrics themselves carry confidence, reflecting how
  widely accepted the rubric is and how well outcomes have validated it.

**Source:** RFC-0005 §"Rubric Provenance" (lines 270–285) and §"Rubric Confidence" (lines 300–312).

## Quality Gates

Evaluations may enforce threshold requirements. Examples from RFC-0005:
- Architecture Score ≥ 80
- Accessibility Score ≥ 90
- Security Score ≥ 85

Failing a quality gate **creates work** — a task is generated to address the
deficiency. Quality gates are therefore a bridge from evaluation into the task
and agent execution system.

**Source:** RFC-0005 §"Quality Gates" (lines 314–329).

## Evaluation Debt

Evaluation debt accumulates when:
- No rubric exists for an important domain.
- An existing rubric is outdated.
- An evaluation is stale (the target leaf has evolved).
- Evaluator disagreement is high.
- Criteria are ambiguous.

Like knowledge debt (RFC-0003) and navigation debt (RFC-0007), evaluation debt
generates tasks that agents must resolve.

**Source:** RFC-0005 §"Evaluation Debt" (lines 331–342).

## Multi-Agent Evaluation

RFC-0005 mandates support for multiple agents evaluating independently. Benefits:
reduced bias, better consensus, more robust results. This is the evaluation
counterpart to the multi-perspective research approach in RFC-0008.

**Source:** RFC-0005 §"Multi-Agent Evaluation" (lines 344–353).

## Human Review Triggers

Some evaluations require human review: legal arguments, medical decisions, hiring
decisions, critical architecture choices. RFC-0005 identifies these as cases
where agent consensus alone is insufficient — the HITL (Human In The Loop) gate
defined in the execution plane applies.

**Source:** RFC-0005 §"Human Review" (lines 355–371).

## Self-Improving Evaluation Loop

Agents can improve outputs through iterative evaluation:

```
Generate → Evaluate → Identify Weaknesses → Improve → Re-evaluate
```

Repeat until the target score is reached. This loop is the operational
realisation of the constitution's goal (RFC-0000) of continuously improving a
model of reality.

**Source:** RFC-0005 §"Self-Improving Outputs" (lines 385–398).

## Evaluation Graph

RFC-0005 defines three canonical relationships:
- Rubric `→ Evaluates →` Target Leaf
- EvaluationResult `→ Uses →` Rubric
- EvaluationResult `→ References →` Evidence

**Source:** RFC-0005 §"Evaluation Graph" (lines 400–414).

## Success Criteria

RFC-0005 lists ten success criteria. The system succeeds when:
1. Quality is explicit (not implicit or subjective).
2. Rubrics are versioned.
3. Evaluations are reproducible.
4. Consensus is measurable.
5. Evaluations cite evidence.
6. Quality gates are enforceable.
7. Multi-agent evaluation is supported.
8. Evaluation debt is measurable.
9. Rubrics evolve.
10. Agents can improve outputs through evaluation loops.

**Source:** RFC-0005 §"Success Criteria" (lines 436–449).

## Answered Questions

**Q: What is the difference between a belief's confidence and an evaluation score?**
Confidence (RFC-0003) quantifies how well-supported a belief is by evidence.
An evaluation score (RFC-0005) quantifies how good something is against a rubric.
A belief about TigerBeetle's reliability (confidence 0.9) and an evaluation of
TigerBeetle against an architecture rubric (score 87/100) are distinct leaves
serving different analytical purposes.

**Q: How are rubrics validated?**
Rubrics carry their own confidence score, reflecting acceptance breadth and
outcome history. Rubric confidence is distinct from the confidence of beliefs
evaluated under the rubric. A widely accepted, outcome-validated rubric has high
confidence; a novel internal rubric has lower confidence until outcomes validate it.

**Q: What happens when evaluators disagree?**
High variance across evaluator scores triggers a review requirement. RFC-0005
§"Reviewer Agreement" specifies that high variance means the evaluation cannot
be treated as settled — either the rubric criteria are ambiguous (evaluation
debt) or the target has genuine qualities that make scoring context-dependent.

**Q: Can a belief fail a quality gate without being false?**
Yes. A quality gate enforces that a belief (or design, architecture, etc.) meets
a minimum standard. A belief can be true ("TigerBeetle is suitable") with high
confidence but still fail an Architecture Rubric quality gate (score 72 < 80)
because it does not meet the team's quality bar. The gate creates a task to
close the gap.
