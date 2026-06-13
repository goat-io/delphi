---
name: belief-types-lifecycle-and-scoped-truth
type: research
status: closed
region: Spec
topics:
  - beliefs
  - belief-types
  - assumptions
  - hypotheses
  - scoped-truth
  - knowledge-lineage
  - knowledge-debt
  - research-triggers
  - decision-separation
  - evaluation-separation
  - RFC-0003
  - RFC-0021
sources:
  - rfcs/RFC-0003-Knowledge-and-Confidence-Theory.md
  - rfcs/RFC-0021-Epistemology-and-Truth-Model.md
  - rfcs/RFC-0026-Tasks-and-Questions.md
---

# Belief Types, Lifecycle, and Scoped Truth in Delphi

## Why Delphi Has Belief Types

RFC-0003 defines five distinct epistemic primitives rather than a single
"knowledge" concept. The distinction matters because each type has different
confidence thresholds, verification requirements, and lifecycle behaviors.

**Source:** RFC-0003 §"Assertions" through §"Questions" (lines 59–160).

## The Five Belief Types

| Type | Definition | Confidence Range | Example |
|---|---|---|---|
| **Assertion** | A claim with no confidence attached; the raw epistemic unit | N/A (pre-belief) | "TigerBeetle is suitable for Walliver" |
| **Belief** | Assertion + confidence score in [0.0, 1.0] | 0.0–0.94 | Same claim @ 0.82 |
| **Fact** | High-confidence belief treated operationally as fact-like | ≥ 0.95 | "The Earth orbits the Sun" @ 0.999999 |
| **Assumption** | Belief accepted without sufficient evidence; explicitly marked | typically 0.20–0.50 | "User traffic will increase" |
| **Hypothesis** | Belief intended for testing; generates research tasks | typically 0.20–0.60 | "Architecture A reduces latency" |

Facts are not a separate primitive. They are beliefs that exceed the
fact-threshold. Assumptions and hypotheses are beliefs with explicit semantic
markers that trigger different handling by the task engine.

**Source:** RFC-0003 §"Facts" (lines 102–120), §"Assumptions" (lines 122–133),
§"Hypotheses" (lines 135–148), §"Questions" (lines 150–162).

## The Belief Lifecycle

Beliefs evolve through a defined lifecycle:

```
Created
→ Supported    (evidence attached)
→ Accepted     (confidence above threshold)
→ Challenged   (contradicting evidence appears)
→ Revised      (confidence recalculated)
→ Superseded   (replaced by a more accurate belief)
```

No belief is permanently final. Any belief may re-enter the Challenged state
when new contradicting evidence arrives. This is not a failure — it is the
mechanism by which the Brain improves over time.

**Source:** RFC-0003 §"Belief Lifecycle" (lines 295–313).

## Canonical Questions Every Belief Must Answer

RFC-0003 §"Canonical Questions" defines the required query set for any
knowledge object:

1. Why do we believe this? → `Evidence` links
2. How confident are we? → `confidence` field (RFC-0003 formula)
3. What supports it? → supporting `Evidence` references
4. What contradicts it? → `contradictionRisk` component + contradiction `Relationships`
5. What depends on it? → dependency graph (RFC-0022)
6. What depends on me? → reverse dependency edges
7. When was it last verified? → `verifiedAt` timestamp on Evidence
8. What should be researched next? → open `Questions` linked to the belief

These eight questions are not aspirational. They are the minimum completeness
standard for a belief in the Spec region.

**Source:** RFC-0003 §"Canonical Questions" (lines 385–410).

## Scoped Truth: Truth Is Contextual

One of RFC-0003's most important contributions is the Scoped Truth model.
Truth in Delphi is not universal — it is always qualified by a scope:

| Scope Dimension | Example |
|---|---|
| **Jurisdiction** | "Valid under Swedish law" |
| **Temporal** | "Valid in 2024" |
| **Regulatory** | "Valid under GDPR" |
| **Assumption set** | "Valid under Newtonian assumptions" |

Every belief should carry its scope. A belief that is true in one context
may be false in another, and Delphi must represent both simultaneously
rather than collapsing them into a single "truth value."

**Source:** RFC-0003 §"Scoped Truth" (lines 345–363).

## Knowledge Lineage

Knowledge has ancestry, and that ancestry must be recorded:

```
Roman Law
→ Civil Law
→ Chilean Civil Code

Research Paper
→ Theory
→ Best Practice
```

Lineage explains where a belief came from. Without lineage, when a
foundational belief changes, the system cannot identify which downstream
beliefs need recalculation.

**Source:** RFC-0003 §"Knowledge Lineage" (lines 365–382).

## Decision Separation and Evaluation Separation

RFC-0003 makes two critical separations that prevent conflation errors:

### Decision ≠ Belief

```
Belief:   "TigerBeetle is suitable for Walliver."
Decision: "Use TigerBeetle."
```

The belief may remain true. The decision may still change (cost, team
capability, migration risk). A decision is not a belief. Treating them as
the same erases the distinction between *what is true* and *what we chose*.

### Evaluation ≠ Belief

```
Belief:     "The design follows Material Design."
Evaluation: "Design quality score: 87%."
```

Evaluations measure quality against rubrics (RFC-0005). Beliefs describe
what exists. These are separate objects stored separately.

**Source:** RFC-0003 §"Decision Separation" (lines 371–382) and
§"Evaluation Separation" (lines 384–395).

## Knowledge Debt: What Accumulates Uncertainty

Knowledge Debt is the formal term for accumulated uncertainty in the Brain.
RFC-0003 defines six sources of knowledge debt:

1. Missing evidence (no evidence references on a belief)
2. Weak confidence (confidence < configured threshold)
3. Stale knowledge (evidence not verified within the freshness window)
4. Unreviewed beliefs (created but never evaluated)
5. Unsupported assumptions (assumptions with no supporting evidence)
6. Contradictions (conflicting evidence with no resolution)

Knowledge debt is not a failure condition. It is a measurable signal that
generates work. The system converts debt into Research, Review, and
Evaluation tasks automatically.

**Source:** RFC-0003 §"Knowledge Debt" (lines 397–418).

## Research Triggers: When Tasks Are Created Automatically

RFC-0003 §"Research Triggers" defines the conditions that automatically
create research tasks:

| Trigger | Automatic Task Type |
|---|---|
| Confidence decreases | RESEARCH |
| Contradiction appears | REVIEW |
| Evidence becomes stale | RESEARCH |
| Dependencies change | REVIEW on consumers |
| Ontology gap appears | ONTOLOGY |

These triggers are the mechanism by which the evolutionary loop is
self-sustaining: knowledge debt automatically becomes work, work produces
evidence, evidence updates confidence, and the cycle continues.

**Source:** RFC-0003 §"Research Triggers" (lines 320–340) and
RFC-0026 §"Automatic Task Generation" (lines 275–300).

## Contradictions Are First-Class Citizens

RFC-0003 takes an explicit position on contradictions:

> Delphi does not hide disagreement.

When Paper A supports a claim and Paper B contradicts it, both remain
visible. The `contradictionRisk` component of the confidence formula
decreases confidence. The contradiction itself is a first-class Relationship
that can be traced, evaluated, and eventually resolved by a REVIEW task.

**Source:** RFC-0003 §"Contradictions" (lines 321–338).

## Consensus Influences Confidence But Is Not Proof

When 100 sources agree, confidence increases. But consensus is evidence,
not truth. The history of science is full of high-consensus beliefs that
were later revised. Delphi models this correctly: consensus raises the
`consensus` component of the confidence formula, but the formula still
permits contradiction and revision.

**Source:** RFC-0003 §"Consensus" (lines 340–355).

## Canonical Questions This Answers

- *What is the difference between an assertion and a belief?* — An assertion
  is a claim with no confidence. A belief is an assertion with a confidence
  score in [0.0, 1.0].
- *What is a fact in Delphi?* — A belief with confidence ≥ 0.95. Not a
  separate object type.
- *What is an assumption?* — A belief accepted without sufficient evidence,
  explicitly marked to trigger different handling.
- *What is a hypothesis?* — A belief intended for testing; it automatically
  generates research tasks.
- *What is scoped truth?* — The principle that truth in Delphi is always
  qualified by jurisdiction, time, regulation, or assumption set. No belief
  is universally true across all contexts.
- *Why are decisions and beliefs separate?* — Because the truth of the belief
  and the correctness of the decision are independent. A decision may be
  reversed even when its supporting belief remains true.
- *What is knowledge debt?* — Accumulated uncertainty: missing evidence,
  weak confidence, stale knowledge, unreviewed beliefs, unsupported
  assumptions, or unresolved contradictions.
- *Does Delphi hide contradictions?* — No. Contradictions are first-class
  Relationships. Both supporting and contradicting evidence remain visible,
  and their net effect is expressed through the confidence score.
- *What happens when knowledge is stale?* — The `freshness` component of
  the confidence formula decreases, confidence drops, and a RESEARCH task
  is automatically created.
