---
title: Multi-Agent Consensus and Evaluation Scoring
region: Spec
kind: research
confidence: 0.76
sources:
  - rfcs/RFC-0005-Evaluation-and-Rubrics.md
  - rfcs/RFC-0003-Knowledge-and-Confidence-Theory.md
  - rfcs/RFC-0008-Agents-and-Research-Engine.md
  - rfcs/RFC-0012-Decision-Theory.md
---

# Multi-Agent Consensus and Evaluation Scoring

## Core Distinction (RFC-0005)

RFC-0005 § Consensus draws a critical distinction:

> "Consensus is not agreement. Consensus is measured agreement."

This matters because an evaluation system that reports "10 agents agreed" is less useful
than one that reports "10 agents scored [86, 88, 89, 87, 87] — variance 1.3, high consensus."

Delphi tracks consensus as a **statistical property** of a set of evaluations, not as a
binary agree/disagree flag.

---

## Rubric Structure (RFC-0005)

A Rubric is a first-class leaf with:
- A set of **Criteria** (each with a weight and scoring range)
- A **scoringMethod**: `WEIGHTED`, `PASS_FAIL`, `CONSENSUS`, or `PAIRWISE`

The `WEIGHTED` method produces a final score as a weighted average of criterion scores:

```
FinalScore = Σ(criterionScore[i] × weight[i]) / Σ(weight[i])
```

The `PASS_FAIL` method treats each criterion as a threshold; the leaf passes only if all
criteria meet their minimum score.

The `CONSENSUS` method requires multiple evaluators and computes agreement statistics
over their individual scores.

The `PAIRWISE` method compares two target leaves directly and surfaces relative ranks
rather than absolute scores.

---

## Evaluation Confidence (RFC-0005)

RFC-0005 § Evaluation Confidence states:

> "Single evaluator → lower confidence. Ten independent evaluators → higher confidence."

This links evaluation to the confidence model in RFC-0003. The evaluation system contributes
to a leaf's confidence through the following chain:

1. Multiple agents independently score the same leaf against a rubric.
2. The spread of scores (variance) determines reviewer agreement.
3. Low variance → high reviewer agreement → evaluation confidence rises.
4. High evaluation confidence feeds the leaf's `evaluationScore` confidence component.
5. Per RFC-0003, `evaluationScore` is one of the components of overall leaf confidence.

**Belief:** Evaluation confidence is not a separate field — it is the evaluationScore
component of the leaf's overall confidence, weighted against evidence and consensus
factors per RFC-0003.

---

## Multi-Agent Evaluation Workflow (RFC-0005, RFC-0012)

RFC-0005 § Multi-Agent Evaluation recommends:

> "Multiple agents should evaluate independently. Benefits: reduced bias, better consensus,
> more robust results."

RFC-0012 § Multi-Agent Decisions describes the recommended agent workflow for decisions:

```
Research Agent → Evaluator Agent → Critic Agent → Planner Agent → Decision Review
```

These two combine into the following pattern for evaluating a leaf or decision:

1. **Research Agent** — gathers evidence and belief support.
2. **Evaluator Agents (N ≥ 2)** — each independently scores against the rubric.
3. **Consensus Computation** — mean, variance, and agreement score computed over N scores.
4. **Critic Agent** — attempts to falsify the high-scoring consensus view.
5. **Human Review Gate** — triggered when variance exceeds a configured threshold or
   the Critic Agent flags a strong counter-argument.

---

## Reviewer Agreement Metric

RFC-0005 § Reviewer Agreement specifies: "Measure variance. Low variance: high agreement.
High variance: review required."

The concrete metric is:

```
ReviewerAgreement = 1 - (StdDev(scores) / ScaleRange)
```

Where `ScaleRange` is `criterion.scoringRange.max - criterion.scoringRange.min`.

A `ReviewerAgreement` of ≥ 0.90 is high consensus. Below 0.70 triggers a review task.

**Belief:** Reviewer agreement is computed per criterion, not only at the final score level.
High final-score agreement can mask criterion-level disagreement that matters for diagnosis.

---

## Quality Gates (RFC-0005)

RFC-0005 § Quality Gates defines that evaluations may enforce thresholds:

> "Architecture Score ≥ 80. Accessibility Score ≥ 90. Security Score ≥ 85. Failing a gate
> creates work."

The "creates work" means a **Task** is generated (RFC-0026) whose closure criterion is
satisfying the gate. This is the feedback loop that makes evaluations actionable:

```
Evaluation → Score below gate → Task generated → Agent improves target → Re-evaluation
```

This loop is the "self-improving output" pattern described in RFC-0005 § Self-Improving Outputs.

---

## Rubric Confidence (RFC-0005)

Rubrics themselves carry confidence, governed by questions:

> "How widely accepted is this rubric? How much evidence supports it? How successful have
> outcomes been?"

A rubric with low confidence should generate lower evaluation confidence even when evaluators
agree, because the measurement instrument itself is uncertain.

**Belief:** Evaluation confidence = f(rubric confidence, reviewer agreement, evidence coverage).
A highly agreed evaluation against a poorly evidenced rubric should not produce high confidence.

---

## Evaluation Debt (RFC-0005)

RFC-0005 § Evaluation Debt defines debt conditions:

| Condition               | Debt type             |
|-------------------------|-----------------------|
| No rubric exists        | Missing rubric        |
| Rubric is outdated      | Stale rubric          |
| Evaluation is stale     | Stale evaluation      |
| High evaluator variance | Unresolved disagreement |
| Ambiguous criteria      | Criterion debt        |

Each debt condition generates a Task (RFC-0026). The priority of that task is computed
per RFC-0011 (Knowledge Economics), where the impact is the count of decisions depending
on the under-evaluated leaf.

---

## Rubric Versioning and Lineage (RFC-0005)

RFC-0005 § Rubric Lineage:

> "Rubrics evolve. History should be preserved."

A rubric is versioned as `name:vN`. An evaluation stores a reference to the specific
rubric version used. This means historical evaluations are reproducible: given the same
version, the same criteria and weights apply.

When a rubric is upgraded (v1 → v2), existing evaluations against v1 become stale.
The staleness generates a re-evaluation Task for high-impact leaves.

---

## Canonical Beliefs

1. Consensus is measured agreement (variance over N independent scores), not binary.
2. Evaluation confidence feeds the `evaluationScore` component of leaf confidence (RFC-0003).
3. Multiple independent evaluators reduce bias; recommended minimum is 2.
4. Low reviewer agreement (< 0.70) triggers a human review task.
5. Quality gates produce Tasks when a leaf scores below threshold.
6. Rubric confidence modulates evaluation confidence.
7. Evaluations store a reference to the specific rubric version used.
8. Rubric upgrades make existing evaluations stale and generate re-evaluation tasks.
