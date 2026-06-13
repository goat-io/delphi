---
name: knowledge-economics-research-roi-and-priority-formula
type: research
status: closed
region: Spec
topics:
  - knowledge-economics
  - research-ROI
  - priority-formula
  - knowledge-debt
  - knowledge-value
  - cost-of-uncertainty
  - dependency-economics
  - RFC-0011
  - RFC-0029
  - RFC-0030
sources:
  - rfcs/RFC-0011-Knowledge-Economics.md
  - rfcs/RFC-0029-Task-Execution-Protocol.md
  - rfcs/RFC-0030-Task-Scheduling-and-Priority-Queue.md
---

# Knowledge Economics: Research ROI and the Priority Formula

## The Fundamental Problem

RFC-0011 §"Purpose": A Brain can never learn everything. Time, attention,
compute, and research capacity are all limited. Therefore Delphi requires
a system that determines: **What should be researched next?**

Not all unknowns are equally important. Knowledge Economics answers the
question: given 1000 unanswered questions, which one should be investigated
first?

**Source:** RFC-0011 §"Purpose" and §"The Central Question".

## Core Principle

RFC-0011 §"Core Principle": The purpose of Knowledge Economics is to
maximize **Knowledge Value Created per Unit of Effort**.

Knowledge is treated as an asset:
- It increases confidence
- It improves decisions
- It reduces risk
- It improves evaluations
- It reduces future work

**Source:** RFC-0011 §"Core Principle" and §"Knowledge As An Asset".

## Knowledge Debt

RFC-0011 §"Knowledge Debt": Knowledge Debt represents accumulated
uncertainty. Forms of Knowledge Debt:

- Missing evidence (beliefs with no backing)
- Weak confidence (confidence < 0.40)
- Missing evaluations
- Ontology gaps (reality that cannot be represented)
- Open contradictions (two high-confidence opposing beliefs)
- Unreviewed assumptions

Knowledge Debt Formula:

```
Knowledge Debt ≈ Importance × Uncertainty
```

A high-importance belief with high uncertainty generates more debt
than a low-importance belief with the same uncertainty.

**Source:** RFC-0011 §"Knowledge Debt" and §"Debt Formula".

## Research ROI

Research should be treated as investment:

```
Research ROI = Knowledge Value Created ÷ Research Cost
```

Example from RFC-0011 §"Example":

```
Question: Can TigerBeetle survive region failure?
Potential Impact: Very High
Research Cost: Medium
ROI: High → Prioritize
```

A question with low potential impact but high research cost has low ROI
and should be deprioritized.

**Source:** RFC-0011 §"Research ROI" and §"Example".

## Cost of Uncertainty

RFC-0011 §"Cost Of Uncertainty": Every uncertainty has a cost.

```
Cost of Uncertainty ≈ Probability of Being Wrong × Impact of Being Wrong
```

Examples:
- Medical diagnosis: HIGH cost (wrong diagnosis → patient harm)
- Button color preference: LOW cost (wrong choice → minor UX friction)

This formula determines when it is worth investing in resolving
uncertainty: high-impact, high-probability-of-error uncertainties
should be resolved before low-impact ones.

**Source:** RFC-0011 §"Cost Of Uncertainty" and §"Cost Formula".

## Knowledge Value Dimensions

RFC-0011 §"Knowledge Value Dimensions" lists six suggested dimensions
for computing Knowledge Value:

1. **Decision Impact** — how many decisions depend on this belief
2. **Risk Reduction** — how much resolved uncertainty reduces operational risk
3. **Revenue Impact** — direct business value contribution
4. **Cost Reduction** — operational cost savings from improved knowledge
5. **Strategic Importance** — alignment with organizational priorities
6. **Research Reusability** — whether resolved knowledge answers multiple
   questions simultaneously

**Source:** RFC-0011 §"Knowledge Value Dimensions".

## Dependency Economics

RFC-0011 §"Decision Impact" and §"Dependency Economics":

A belief supporting 100 decisions is more valuable than a belief
supporting 1 decision — because resolving the former improves the
quality of 100 downstream choices simultaneously.

This is why RFC-0022 (Dependency & Impact Propagation) is a dependency
of RFC-0011: the impact score requires traversing the dependency graph
to count transitive consumers.

**Source:** RFC-0011 §"Dependency Economics".

## The Priority Formula (Used in RFC-0029 and RFC-0030)

The Knowledge Economics formula is operationalized in the task queue
(RFC-0029 §"Task Selection Protocol"; RFC-0030 §"Priority Score"):

```
Priority =
  (Impact × ConfidenceGap × DependencyCount × RiskReduction)
  ÷ EstimatedCost
```

Component definitions:

| Component | Source | Meaning |
|-----------|---------|---------|
| `Impact` | RFC-0022 transitive dependency count | How many leaves/decisions are affected |
| `ConfidenceGap` | DesiredConfidence − CurrentConfidence | How much the belief needs improvement |
| `DependencyCount` | Direct consumer count | Immediate downstream dependents |
| `RiskReduction` | P(prevents cascade) | Probability this task averts a confidence shockwave |
| `EstimatedCost` | Token-equivalent effort | Default by task type; updated post-execution |

Higher score = higher priority in the task queue.

**Source:** RFC-0029 §"Task Selection Protocol"; RFC-0030 §"Priority Score";
RFC-0011 §"Prioritization".

## Effective Priority with Urgency

RFC-0030 §"Urgency Modifier" adds a time-based multiplier:

```
EffectivePriority = Priority × UrgencyModifier
```

Urgency increases with task age and external deadline signals. This
prevents tasks with high base priority but expensive cost from permanently
blocking urgent lower-priority tasks.

**Source:** RFC-0030 §"Urgency Modifier".

## Resource Allocation

RFC-0011 §"Resource Allocation": Agents should allocate their capacity
in proportion to the expected ROI of each potential task, subject to
budget constraints. The task scheduler (RFC-0030) implements this by
ordering the queue by EffectivePriority and enforcing work budgets.

**Source:** RFC-0011 §"Resource Allocation"; RFC-0030 §"Work Budgets".

## Canonical Questions This Answers

- *What is Knowledge Economics?* — A system for prioritizing which
  uncertainties to resolve, based on knowledge value and research cost.
- *How is knowledge debt computed?* — Importance × Uncertainty.
  High-importance beliefs with weak confidence generate the most debt.
- *What is the Research ROI formula?* — Knowledge Value Created ÷
  Research Cost.
- *What is the cost of uncertainty?* — Probability of Being Wrong ×
  Impact of Being Wrong.
- *What is the priority formula used by the task queue?* —
  (Impact × ConfidenceGap × DependencyCount × RiskReduction) ÷ EstimatedCost.
- *Why does a belief supporting 100 decisions rank higher than one
  supporting 1?* — Because resolving it improves 100 downstream decisions
  simultaneously (Dependency Economics).
- *How does urgency interact with base priority?* — EffectivePriority =
  Priority × UrgencyModifier, where urgency grows with task age.
- *What are the six knowledge value dimensions?* — Decision Impact, Risk
  Reduction, Revenue Impact, Cost Reduction, Strategic Importance,
  Research Reusability.
