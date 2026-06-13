---
name: contradiction-handling-and-belief-revision
type: research
status: closed
region: Spec
topics:
  - contradictions
  - belief-revision
  - confidence-impact
  - contradiction-risk
  - epistemic-humility
  - RFC-0003
  - RFC-0021
  - RFC-0022
sources:
  - rfcs/RFC-0003-Knowledge-and-Confidence-Theory.md
  - rfcs/RFC-0021-Epistemology-and-Truth-Model.md
  - rfcs/RFC-0022-Dependency-and-Impact-Propagation.md
  - rfcs/RFC-0004-Evidence-and-Provenance.md
---

# Contradiction Handling and Belief Revision in Delphi

## Core Principle: Contradictions Are First-Class Citizens

Delphi does not hide disagreement. When two sources disagree, both remain
visible in the Brain. This is not a bug — it is the system's epistemic design.

Per RFC-0003:

> Contradictions are first-class citizens.
> Both should remain visible.
> Delphi does not hide disagreement.

A real-world example from RFC-0003:
- Paper A: supports a claim
- Paper B: contradicts the same claim
Both are stored as Evidence. The contradiction reduces the belief's confidence
via the Contradiction Risk component, but neither source is discarded.

**Source:** RFC-0003 §"Contradictions".

---

## How Contradictions Affect Confidence

The Delphi confidence formula (RFC-0003) has six components:

```
confidence =
  (0.30 × evidenceStrength)
+ (0.20 × sourceReliability)
+ (0.15 × sourceDiversity)
+ (0.15 × freshness)
+ (0.20 × consensus)
- (0.20 × contradictionRisk)
```

Contradiction Risk is the only NEGATIVE component. A belief with perfect
positive components but a contradictionRisk of 1.0 reaches a maximum
confidence of 0.80 — it can never reach 1.0 while contradictions exist.

Contradiction Risk ranges from 0.0 (no contradictions) to 1.0 (strong
contradictions from reliable sources). The exact computation is domain-specific
but factors in:
- Number of contradicting sources
- Reliability of those sources
- Strength of the contradicting evidence

**Source:** RFC-0003 §"Initial Confidence Formula", §"Contradiction Risk".

---

## Why Consensus Alone Does Not Resolve Contradictions

RFC-0003 explicitly separates consensus from truth:

> Consensus influences confidence.
> Consensus is not truth.

100 sources agreeing raises confidence. But if even one highly reliable
source contradicts the claim, contradictionRisk > 0, and the formula
reflects genuine uncertainty. Majority vote does not override evidence
quality.

This prevents epistemic capture — a Brain that simply follows popular
opinion without weighing the reliability and source diversity of its evidence.

**Source:** RFC-0003 §"Consensus"; RFC-0021 §"Consensus and Confidence".

---

## Belief Lifecycle: How Beliefs Evolve

RFC-0003 defines a belief lifecycle with six stages:

```
Created → Supported → Accepted → Challenged → Revised → Superseded
```

A belief is never permanently final. Even high-confidence facts can be
challenged if new contradicting evidence arrives.

Key transitions:
- **Created**: assertion formed, initial confidence set
- **Supported**: evidence attached, confidence rises
- **Accepted**: confidence exceeds the operational threshold (≥0.75)
- **Challenged**: a contradicting source arrives; contradictionRisk increases,
  confidence drops; the leaf may enter `REVIEW_REQUIRED` status
- **Revised**: the belief is updated to reflect resolved contradiction
- **Superseded**: a new, higher-quality belief replaces this one; the old
  belief is marked stale and linked to its successor

**Source:** RFC-0003 §"Belief Lifecycle".

---

## Scoped Truth: When Contradictions Are Not Contradictions

RFC-0003 introduces the concept of Scoped Truth:

> Truth depends on context.
> Valid in Sweden.
> Valid in 2024.
> Valid under GDPR.
> Valid under Newtonian assumptions.

Two beliefs that appear contradictory may actually be scoped differently.
Example:
- "Minimum wage increases unemployment" (scope: standard economic model)
- "Minimum wage does not increase unemployment" (scope: monopsony labor market)

Both can coexist in the Brain without contradictionRisk if they carry
explicit truth contexts (RFC-0021). A Belief carries a `truthContext` field
that specifies the scope conditions under which the assertion holds.

**Source:** RFC-0003 §"Scoped Truth"; RFC-0021 §"Truth Contexts".

---

## Impact Propagation When a Contradiction Arrives

When a new piece of contradicting evidence is attached to a belief, RFC-0022
triggers dependency propagation:

1. The contradicted belief's confidence drops (contradictionRisk increases).
2. RFC-0022 traverses the dependency graph to find all leaves that depend on
   the contradicted belief.
3. Each dependent leaf's confidence is recalculated.
4. If a dependent leaf drops below the operational threshold, it enters
   `REVIEW_REQUIRED` status.
5. A research task is created to investigate the contradiction and either
   resolve it or adjust dependent beliefs.

This cascade ensures that a single new contradicting source propagates
correctly through the entire knowledge graph.

**Source:** RFC-0022 §"Propagation Triggers"; RFC-0003 §"Impact Analysis".

---

## Research Triggers Caused by Contradictions

RFC-0003 lists contradiction arrival as an automatic research trigger:

> Automatically create research tasks when:
> - Confidence decreases.
> - Contradictions appear.
> - Evidence becomes stale.
> - Dependencies change.
> - Ontology gaps appear.

Contradiction-triggered research tasks aim to:
1. Verify the reliability of the contradicting source.
2. Determine if the contradiction is genuine or scope-related.
3. If genuine: revise the belief or mark it `REVIEW_REQUIRED`.
4. If scope-related: update the `truthContext` to split the beliefs.

**Source:** RFC-0003 §"Research Triggers".

---

## What a Belief Cannot Do: Separate Decisions from Beliefs

RFC-0003 requires Decision Separation:

> Belief: TigerBeetle is suitable.
> Decision: Use TigerBeetle.
> The belief may remain true. The decision may still change.

A contradiction to a belief does NOT automatically invalidate the decision
based on that belief. Decisions are tracked separately (RFC-0012) with their
own rationale, context, and review process. This allows the Brain to maintain
intellectual honesty: a decision made on the basis of a now-contradicted
belief can be revisited, but the original belief and decision are both
preserved in the audit trail.

**Source:** RFC-0003 §"Decision Separation".

---

## Answers to Open Questions

**Q: Does Delphi automatically resolve contradictions?**
No. Delphi records contradictions and reduces confidence accordingly.
Automatic resolution would require the Brain to decide which source is
more correct — a judgment that belongs to either a research task (for
agent review) or a human steward (for HITL review). The Brain's job is
to surface the contradiction accurately, not to hide it.
**Source:** RFC-0003 §"Contradictions".

**Q: Can a fact-level belief (confidence 0.999) be contradicted?**
Yes. Any belief can be challenged. RFC-0003 states: "A belief is never
permanently final." New contradicting evidence reduces confidenceRisk >0,
pulling the belief below 0.999. Whether it drops below the operational
threshold (0.75) depends on the strength and reliability of the contradicting
source.
**Source:** RFC-0003 §"Belief Lifecycle".

**Q: How does the Brain distinguish a genuine contradiction from a scope difference?**
Via the `truthContext` field on the Belief leaf (RFC-0021). If two beliefs
carry different truth contexts (different jurisdictions, time periods, or
model assumptions), they do not contradict each other — they are parallel
beliefs that apply in different contexts. Only beliefs with overlapping
truth contexts are flagged as contradictory.
**Source:** RFC-0021 §"Truth Contexts"; RFC-0003 §"Scoped Truth".

**Q: What happens to beliefs that depend on a now-refuted belief?**
RFC-0022 propagates the confidence change through the dependency graph. Each
dependent leaf's confidence is recalculated. Dependents that fall below the
operational threshold enter `REVIEW_REQUIRED`. A research task is created to
investigate whether those dependents need revision, replacement, or can
survive at their reduced confidence level.
**Source:** RFC-0022 §"Propagation"; RFC-0003 §"Impact Analysis".
