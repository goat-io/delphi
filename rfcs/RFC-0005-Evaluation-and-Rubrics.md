# RFC-0005 — Evaluation & Rubrics
## Defining What Good Looks Like

Status: Draft
Depends On:
- RFC-0000
- RFC-0001
- RFC-0002
- RFC-0003
- RFC-0004

---

# Purpose

Knowledge answers:

What do we believe?

Evaluation answers:

How good is it?

This RFC defines:

- Rubrics
- Criteria
- Scores
- Evaluations
- Consensus
- Reviewer Agreement
- Quality Gates
- Evaluation Debt

This RFC is one of the most important differentiators of Delphi.

---

# Core Principle

Knowledge is not Evaluation.

Belief:

TigerBeetle is suitable.

Evaluation:

TigerBeetle scores 87/100 against our ledger architecture rubric.

These are different concepts.

---

# Why Evaluation Exists

Agents need a repeatable way to determine quality.

Without rubrics:

Evaluation is subjective.

With rubrics:

Evaluation becomes explainable and reproducible.

---

# Rubrics

A Rubric defines what good looks like.

Examples:

- Design Rubric
- Architecture Rubric
- Legal Argument Rubric
- Research Quality Rubric
- Product Strategy Rubric
- Code Review Rubric

Rubrics are first-class leaves.

---

# Rubric Schema

```ts
interface Rubric {
  id: string

  name: string

  version: string

  description: string

  criteria: Criterion[]

  scoringMethod:
    | "WEIGHTED"
    | "PASS_FAIL"
    | "CONSENSUS"
    | "PAIRWISE"
}
```

---

# Criterion

A Criterion represents a measurable dimension.

Example:

Architecture Rubric

Criteria:

- Reliability
- Scalability
- Security
- Observability
- Maintainability
- Cost

---

# Criterion Schema

```ts
interface Criterion {
  id: string

  name: string

  description: string

  weight: number

  scoringRange: {
    min: number
    max: number
  }
}
```

---

# Evaluation Results

Evaluations are leaves.

```ts
interface EvaluationResult {
  rubricId: string

  targetLeafId: string

  evaluatorId: string

  scores: CriterionScore[]

  finalScore: number

  rationale: string
}
```

---

# Criterion Score

```ts
interface CriterionScore {
  criterionId: string

  score: number

  rationale: string
}
```

---

# Example

Architecture Evaluation

Reliability
9/10

Scalability
8/10

Security
7/10

Observability
10/10

Final
8.5/10

---

# Evaluation Confidence

Evaluations themselves require confidence.

Example:

Single evaluator
→ lower confidence

Ten independent evaluators
→ higher confidence

---

# Consensus

Consensus is not agreement.

Consensus is measured agreement.

Example:

10 evaluators

Scores:

86
88
89
87
87

High consensus.

---

# Reviewer Agreement

Measure variance.

Low variance:

High agreement.

High variance:

Review required.

---

# Evaluation Evidence

Evaluations should cite evidence.

Example:

Architecture Evaluation
→ Load Test Results
→ Security Assessment
→ Cost Analysis

---

# Rubric Provenance

Rubrics should explain where they came from.

Example:

Design Rubric

Derived From:

- WCAG
- Nielsen Heuristics
- Apple HIG
- Material Design

---

# Rubric Lineage

Rubrics evolve.

Example:

Design Rubric v1
→ Design Rubric v2
→ Design Rubric v3

History should be preserved.

---

# Rubric Confidence

Rubrics themselves can have confidence.

Questions:

How widely accepted is this rubric?

How much evidence supports it?

How successful have outcomes been?

---

# Quality Gates

Evaluations may enforce thresholds.

Examples:

Architecture Score
≥ 80

Accessibility Score
≥ 90

Security Score
≥ 85

Failing a gate creates work.

---

# Evaluation Debt

Evaluation debt occurs when:

- No rubric exists
- Rubric is outdated
- Evaluation is stale
- Evaluator disagreement is high
- Criteria are ambiguous

Evaluation debt generates tasks.

---

# Multi-Agent Evaluation

Multiple agents should evaluate independently.

Benefits:

- Reduced bias
- Better consensus
- More robust results

---

# Human Review

Some evaluations require humans.

Examples:

Legal Arguments

Medical Decisions

Hiring Decisions

Critical Architecture Choices

---

# Evaluation Lifecycle

Rubric Created
→ Applied
→ Reviewed
→ Improved
→ Versioned

---

# Self-Improving Outputs

Agent Workflow:

Generate
→ Evaluate
→ Identify Weaknesses
→ Improve
→ Reevaluate

Repeat until target score.

---

# Evaluation Graph

Relationships:

Rubric
→ Evaluates
→ Target

Evaluation
→ Uses
→ Rubric

Evaluation
→ References
→ Evidence

---

# Canonical Questions

What rubric was used?

What criteria were applied?

What score was assigned?

Why?

Which evidence supports the score?

How much agreement exists?

What should improve?

---

# Success Criteria

A Delphi system successfully implements this RFC when:

1. Quality is explicit.
2. Rubrics are versioned.
3. Evaluations are reproducible.
4. Consensus is measurable.
5. Evaluations cite evidence.
6. Quality gates are enforceable.
7. Multi-agent evaluation is supported.
8. Evaluation debt is measurable.
9. Rubrics evolve.
10. Agents can improve outputs through evaluation loops.
