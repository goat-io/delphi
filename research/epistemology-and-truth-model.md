---
name: epistemology-and-truth-model
type: research
status: closed
region: Spec
topics:
  - epistemology
  - truth
  - beliefs
  - assertions
  - contextual-truth
  - RFC-0021
sources:
  - rfcs/RFC-0021-Epistemology-and-Truth-Model.md
  - rfcs/RFC-0003-Knowledge-and-Confidence-Theory.md
---

# Epistemology and Truth Model in Delphi

## Core Claim: Delphi Does Not Store Truth

Delphi stores *beliefs about reality*. Truth may be unknown, incomplete,
contextual, disputed, or temporary. Therefore truth is not binary in Delphi —
it is always a belief with a confidence level and a scope.

**Source:** RFC-0021 §"Core Principle" (lines 32–49) and
RFC-0003 §"Fundamental Principle" (lines 30–37).

## The Knowledge Acquisition Chain

Everything inside Delphi begins as an observation and terminates as a belief
(RFC-0021 §"Reality vs Knowledge", lines 54–68):

```
Reality
↓
Observation   (direct measurement: experiment, court ruling, financial report)
↓
Evidence      (supports or contradicts assertions)
↓
Assertion     (the smallest epistemic unit — a claim, not truth)
↓
Belief        (assertion + confidence score)
```

Raw assertions are never fed to decisions directly. The required path is
`Belief → Evaluation → Decision` (RFC-0021 §"Decision Relationship",
lines 496–507).

## Epistemic Primitives

| Primitive | Definition | Example |
|---|---|---|
| **Assertion** | A claim with no confidence attached | "Gravity exists" |
| **Belief** | Assertion + confidence score in [0,1] | "Gravity exists" @ 0.999999 |
| **Hypothesis** | Belief with insufficient evidence (low confidence) | "Dark matter = undiscovered particles" @ 0.35 |
| **Theory** | Coherent collection of beliefs | Evolution, General Relativity |
| **Fact** | Belief exceeding an accepted confidence threshold | "Earth orbits Sun" @ 0.999999 |

Facts are **not** a separate object type — they are high-confidence beliefs
treated operationally as fact-like. There is no fact table; there is only a
confidence threshold.

**Source:** RFC-0021 §"Fact" (lines 110–130), §"Hypothesis" (lines 132–148),
§"Theory" (lines 150–163), and RFC-0003 §"Facts" (lines 102–120).

## Epistemic States

Leaves carry an explicit epistemic state (RFC-0021 §"Epistemic States",
lines 348–356):

```ts
type EpistemicState =
  | "HYPOTHESIS"
  | "BELIEF"
  | "STRONG_BELIEF"
  | "FACT"
  | "DISPUTED"
  | "REFUTED"
```

A leaf moves through states as evidence accumulates. A `DISPUTED` belief has
active contradictions; a `REFUTED` belief has been decisively overturned.

## Truth Is Always Contextual

Truth in Delphi is scoped along at least three dimensions:

**Jurisdictional** (RFC-0021 §"Jurisdictional Truth", lines 226–241):
The same assertion may be true in one jurisdiction and false in another. Both
beliefs coexist with their respective scopes.

**Temporal** (RFC-0021 §"Temporal Truth", lines 243–263):
"Pluto is a planet" was true in 1950 and false by 2025 classification. Beliefs
carry timestamps and should be evaluated against the period in which they were
formed.

**Organizational** (RFC-0021 §"Organizational Truth", lines 265–279):
"Technology X is approved" can be simultaneously true in Company A and false
in Company B. Organizational scope is a first-class context.

**Implication:** Every belief should carry a `scope` (temporal, jurisdictional,
organizational) per RFC-0003 §"Scoped Truth" (lines 427–441). A belief without
scope is implicitly universal — an assumption that should be made explicit.

## Contradictions and Schools of Thought Coexist

Delphi does not resolve contradictions by hiding the losing side. Both
`Minimum wage increases unemployment` and `Minimum wage has no measurable
impact` can coexist as beliefs with different confidence levels and supporting
evidence.

Multiple competing explanations for the same phenomenon (Schools of Thought)
are preserved and linked. Delphi tracks which school supports which belief, so
agents can reason across paradigms.

**Source:** RFC-0021 §"Contradictions" (lines 302–319) and §"Schools Of
Thought" (lines 322–343).

## Consensus Influences Confidence, But Is Not Truth

Consensus is a component of the confidence formula (weight 0.20 in the RFC-0003
formula). 95% scientific community agreement raises confidence; it does not
guarantee truth. Delphi explicitly distinguishes consensus from truth because
consensus has historically been wrong (geocentrism, bloodletting as medicine).

**Source:** RFC-0021 §"Consensus" (lines 282–299) and
RFC-0003 §"Consensus" (lines 340–355).

## Confidence Decay

Confidence decreases automatically when (RFC-0021 §"Confidence Decay",
lines 438–449):
- Evidence becomes stale (`freshness` component drops)
- Contradictions appear (`contradictionRisk` increases)
- Consensus shifts (`consensus` component drops)
- Context changes (scope invalidation)

Each of these triggers research task generation per RFC-0026 §"Automatic Task
Generation".

## Epistemic Debt

*Epistemic Debt* accumulates when confidence is weak, evidence is insufficient,
contradictions are unresolved, or research is missing (RFC-0021 §"Epistemic
Debt", lines 524–536). Epistemic debt is a measurable quantity that generates
work and is distinct from (but related to) Knowledge Debt (RFC-0003) and
Decision Debt (RFC-0012).

## Meta-Beliefs

Brains can hold beliefs *about* beliefs (RFC-0021 §"Meta-Beliefs", lines
510–521):
- "The confidence on belief X is too high given available evidence"
- "The evidence base for claim Y is weak"
- "The consensus measurement for Z is unreliable"

This allows an Evaluator agent to critique the Brain's own epistemic state and
generate improvement tasks.

## Canonical Questions This Answers

- *Does Delphi store facts?* — No separate fact primitive exists. Facts are
  beliefs that exceed an accepted confidence threshold (typically ≥ 0.95).
- *How does Delphi handle contradictory beliefs?* — Both coexist with explicit
  `DISPUTED` state and separate confidence scores; neither is hidden.
- *Is consensus the same as truth in Delphi?* — No. Consensus is one input
  (weight 0.20) to the confidence formula; it influences confidence but does
  not determine truth.
- *Can a belief be true in one context and false in another?* — Yes. Truth is
  scoped by jurisdiction, time period, and organization. A belief without
  explicit scope is implicitly universal.
- *What is epistemic debt?* — Accumulated uncertainty: weak confidence,
  missing evidence, unresolved contradictions, missing research. It generates
  tasks automatically.
- *Can Delphi represent competing scientific theories?* — Yes. Multiple Schools
  of Thought are first-class and preserved with their respective evidence and
  confidence levels.
