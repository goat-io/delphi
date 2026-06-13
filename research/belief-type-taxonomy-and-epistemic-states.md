---
name: belief-type-taxonomy-and-epistemic-states
type: research
status: closed
region: Spec
topics:
  - beliefs
  - assertions
  - facts
  - hypotheses
  - theories
  - epistemic-states
  - assumptions
  - schools-of-thought
  - RFC-0003
  - RFC-0021
sources:
  - rfcs/RFC-0003-Knowledge-and-Confidence-Theory.md
  - rfcs/RFC-0021-Epistemology-and-Truth-Model.md
  - rfcs/RFC-0002-Leaf-Protocol.md
---

# Belief Type Taxonomy and Epistemic States

## The Epistemic Hierarchy

Delphi uses a precise vocabulary for epistemic units. From simplest to most
complex, the hierarchy is:

```
Reality
  ↓ (observed via)
Observation
  ↓ (generates)
Evidence
  ↓ (supports)
Assertion
  ↓ (+ confidence =)
Belief
  ↓ (aggregated =)
Theory
```

Each level is distinct and serves a different role in the knowledge model.

**Source:** RFC-0021 §"Reality vs Knowledge".

---

## Assertion

An Assertion is the smallest epistemic unit — a claim made without yet
attaching confidence.

Examples from RFC-0003:
- "TigerBeetle is suitable for Walliver."
- "Roman law influenced Chilean law."
- "Accessibility improves usability."

Assertions may be supported, contradicted, evaluated, or revised. They are
not truth — they are claims about reality.

**Source:** RFC-0003 §"Assertions"; RFC-0021 §"Assertion".

---

## Belief

A Belief is an Assertion with confidence attached.

```
Belief = Assertion + Confidence (0.0–1.0)
```

Example:
- Assertion: "TigerBeetle is suitable for Walliver."
- Confidence: 0.82
- Result: a Belief with confidence 0.82

Beliefs are the primary storage unit for knowledge claims in Delphi.
Everything in Delphi begins as a belief — there are no bare assertions in
canonical storage, only assertions with assigned confidence.

**Source:** RFC-0003 §"Beliefs"; RFC-0021 §"Belief".

---

## Fact

Facts are NOT a separate primitive in Delphi.

> Facts are beliefs that have exceeded an accepted confidence threshold.

Example:
- Belief: "The Earth orbits the Sun."
- Confidence: 0.999999
- Classification: Fact (operationally)

"Fact" is an operational label applied when confidence exceeds a configured
threshold (RFC-0003 suggests 0.95–1.00 as "Fact-Like"). Facts can be
challenged — RFC-0003 states that "a belief is never permanently final."

**Source:** RFC-0003 §"Facts"; RFC-0021 §"Fact".

---

## Hypothesis

A Hypothesis is a belief with insufficient evidence — it is intended for
testing.

Examples:
- "Users engage more with shorter forms." (Confidence: 0.35)
- "Dark Matter consists of undiscovered particles." (Confidence: 0.35)

Hypotheses generate research tasks. They differ from Beliefs operationally
only by confidence threshold. RFC-0003 suggests that beliefs with confidence
< 0.40 are operationally treated as Hypotheses.

**Source:** RFC-0003 §"Hypotheses"; RFC-0021 §"Hypothesis".

---

## Assumption

Assumptions are beliefs accepted without sufficient evidence.

Examples:
- "User traffic will increase."
- "Customers prefer simplicity."

Assumptions should be explicitly marked as such. They differ from Hypotheses
in that Hypotheses are intended for active testing, while Assumptions may be
operational necessities that are not being actively investigated. Both generate
Knowledge Debt.

**Source:** RFC-0003 §"Assumptions".

---

## Theory

A Theory is a coherent collection of beliefs — not a single claim, but
a structured model of how multiple beliefs relate.

Examples:
- Evolution (biology)
- General Relativity (physics)
- Plate Tectonics (geology)

Theories aggregate many beliefs. In Delphi, a Theory is represented as a
set of related Belief leaves with a parent CONCEPT leaf describing the
theory and edges connecting the constituent beliefs. The theory's overall
confidence is derived from the confidence of its constituent beliefs.

**Source:** RFC-0021 §"Theory".

---

## Epistemic States (RFC-0021)

RFC-0021 defines a formal `EpistemicState` type that classifies any belief:

```ts
type EpistemicState =
  | "HYPOTHESIS"      // belief with insufficient evidence (confidence < ~0.40)
  | "BELIEF"          // standard belief (confidence 0.40–0.74)
  | "STRONG_BELIEF"   // high-confidence belief (confidence 0.75–0.94)
  | "FACT"            // near-certain belief (confidence 0.95–1.00)
  | "DISPUTED"        // active contradictions exist; outcome unresolved
  | "REFUTED"         // evidence decisively contradicts the assertion
```

These states correspond approximately to the confidence bands from RFC-0003:

| Confidence Range | RFC-0003 Label     | EpistemicState   |
|------------------|--------------------|------------------|
| 0.00 – 0.20      | Very Weak          | HYPOTHESIS       |
| 0.20 – 0.40      | Weak               | HYPOTHESIS       |
| 0.40 – 0.60      | Moderate           | BELIEF           |
| 0.60 – 0.80      | Strong             | BELIEF/STRONG_BELIEF |
| 0.80 – 0.95      | Very Strong        | STRONG_BELIEF    |
| 0.95 – 1.00      | Fact-Like          | FACT             |
| Any (contested)  | —                  | DISPUTED         |
| Any (disproven)  | —                  | REFUTED          |

DISPUTED and REFUTED are status overrides — they take precedence over the
confidence-derived state when contradictions are active or resolution has occurred.

**Source:** RFC-0021 §"Epistemic States".

---

## Schools of Thought: Multiple Valid Beliefs

RFC-0021 explicitly supports multiple competing explanations coexisting for
the same topic. Example given in the RFC:

"Roman Empire Collapse" — four competing schools:
- School A: Economic Decline
- School B: Military Overstretch
- School C: Political Instability
- School D: Combination Theory

Delphi preserves all perspectives. Each school is stored as a separate Belief
leaf. Contradictions between them are explicit. No school is automatically
privileged — confidence is derived from supporting evidence, not from consensus
within the academic field alone.

**Source:** RFC-0021 §"Schools Of Thought".

---

## Truth Contexts: When Beliefs Are Not Contradictions

RFC-0021 identifies three critical truth-context dimensions:

### Jurisdictional Truth
Two beliefs may both be true under different legal jurisdictions:
- "Cannabis is illegal" (Sweden) — true
- "Cannabis may be legal" (Canada) — true

These are not contradictions. Each carries a jurisdictional truth context.

### Temporal Truth
A belief may be true in one time period and false in another:
- "Pluto is a planet." (1950) — true
- "Pluto is a planet." (2025) — false

Both beliefs are stored with temporal truth contexts. The 2006 IAU ruling
created a new belief that revised the earlier one, which is now marked STALE.

### Organizational Truth
Beliefs may depend on the organization's policies or standards:
- "Technology X is approved." (Company A)
- "Technology X is prohibited." (Company B)

Both are correct within their organizational scope.

**Source:** RFC-0021 §"Jurisdictional Truth", §"Temporal Truth", §"Organizational Truth".

---

## Observation vs Evidence

RFC-0021 distinguishes between Observations and Evidence:

**Observations** are direct measurements or recordings:
- Temperature reading
- Experiment result
- Court ruling
- Financial report

**Evidence** is a structured record in the Brain that links an Observation
(via an Asset) to a Belief. An Observation without a corresponding EvidenceRef
in the Brain does not affect any Belief's confidence. Evidence records the
relationship between source and belief; Observations are the raw reality that
generates the evidence.

**Source:** RFC-0021 §"Observation"; RFC-0004 §"Evidence Schema".

---

## Answers to Open Questions

**Q: What is the difference between a Hypothesis and an Assumption?**
A Hypothesis is actively under investigation — it has a research task or is
expected to be tested. An Assumption is a belief that has been accepted for
operational use without sufficient evidence and is NOT being actively tested.
Both have low confidence, but Assumptions are risks that generate Knowledge
Debt and should be flagged, while Hypotheses are part of the research agenda.
**Source:** RFC-0003 §"Assumptions", §"Hypotheses".

**Q: Can a REFUTED belief remain in the Brain?**
Yes. Refuted beliefs are not deleted. They are marked `REFUTED` (EpistemicState)
and their confidence approaches 0. They remain in the Brain as part of the
knowledge lineage — they explain why certain decisions were made before the
refutation, and they prevent the same belief from being re-extracted from
the same sources.
**Source:** RFC-0021 §"Epistemic States"; RFC-0003 §"Belief Lifecycle".

**Q: How does the system choose which epistemic state to assign?**
EpistemicState is derived from confidence level with DISPUTED and REFUTED
as override states. The extraction pipeline (RFC-0027) assigns initial
confidence. The confidence formula (RFC-0003) updates it as evidence changes.
DISPUTED is set when active contradictions exist without resolution.
REFUTED is set when an evaluation or research task definitively disproves
the assertion with high-confidence contradicting evidence.
**Source:** RFC-0021 §"Epistemic States"; RFC-0003 §"Confidence Components".

**Q: What happens to decisions that were made on the basis of a now-REFUTED belief?**
The decision itself is not automatically revised (RFC-0012 Decision Separation
principle). RFC-0022 propagates the confidence change through the dependency
graph: the decision leaf's confidence drops, it may enter REVIEW_REQUIRED
status, and a REVIEW task is generated. The decision can then be re-evaluated
in context of the new information. The historical record of the original decision
and its rationale is preserved.
**Source:** RFC-0003 §"Decision Separation"; RFC-0022 §"Propagation Triggers".

**Q: Is confidence the same as probability?**
No. RFC-0003 and RFC-0021 are explicit that confidence is a multi-component
score, not a raw probability. Confidence incorporates evidence strength,
source reliability, source diversity, freshness, consensus, and contradiction
risk. These components are not independent random variables; they are
orthogonal quality dimensions that are combined via a weighted formula.
Confidence is not P(belief is true) — it is a structured measure of how well
the available evidence supports the belief.
**Source:** RFC-0003 §"Confidence Components", §"Initial Confidence Formula".
