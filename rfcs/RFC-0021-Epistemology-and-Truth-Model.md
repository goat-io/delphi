# RFC-0021 — Epistemology & Truth Model
## How Delphi Represents Reality, Belief, Uncertainty and Truth

Status: Draft

Depends On:
- RFC-0000 through RFC-0020

---

# Purpose

This RFC answers one of the most fundamental questions in Delphi:

How does a Brain decide what is true?

This RFC defines:

- Assertions
- Beliefs
- Facts
- Hypotheses
- Theories
- Consensus
- Contradictions
- Uncertainty
- Truth Contexts
- Confidence Propagation

---

# Core Principle

Delphi does not store truth.

Delphi stores beliefs about reality.

Truth may be:

- Unknown
- Incomplete
- Contextual
- Disputed
- Temporary

Therefore:

Truth is not binary.

---

# Reality vs Knowledge

Reality exists independently.

Brains only observe reality indirectly.

Reality
↓
Observation
↓
Evidence
↓
Assertion
↓
Belief

Everything inside Delphi begins as a belief.

---

# Assertion

Assertion is the smallest epistemic unit.

Example:

Gravity exists.

Minimum wage increases unemployment.

Roman Law influenced Civil Law.

Assertions are claims.

Assertions are not truth.

---

# Belief

A Belief is an assertion with confidence.

Example:

Assertion:

Gravity exists.

Confidence:

0.999999

Result:

Belief

---

# Fact

Facts are not special objects.

Facts are beliefs that have exceeded an accepted confidence threshold.

Example:

Belief:

Earth orbits the Sun.

Confidence:

0.999999

Classification:

Fact

---

# Hypothesis

A Hypothesis is a belief with insufficient evidence.

Example:

Dark Matter consists of undiscovered particles.

Confidence:

0.35

Status:

Hypothesis

---

# Theory

A Theory is a coherent collection of beliefs.

Examples:

Evolution

General Relativity

Plate Tectonics

Theories aggregate many beliefs.

---

# Observation

Observations are direct measurements.

Examples:

Temperature reading

Experiment result

Court ruling

Financial report

Observations generate evidence.

---

# Evidence

Evidence supports or contradicts assertions.

Examples:

Research Paper

Benchmark

Interview

Law

Experiment

Observation

Evidence changes confidence.

---

# Truth Is Contextual

Many truths are only true within a scope.

Examples:

Legal

Scientific

Historical

Organizational

Personal

Truth must always carry context.

---

# Jurisdictional Truth

Example:

Sweden

Cannabis is illegal.

Canada

Cannabis may be legal.

Both beliefs are true.

Context differs.

---

# Temporal Truth

Example:

Pluto is a planet.

Year:

1950

True.

Year:

2025

False according to current classification.

Truth changes over time.

---

# Organizational Truth

Example:

Company A

Technology X is approved.

Company B

Technology X is prohibited.

Truth may depend on organization.

---

# Consensus

Consensus measures agreement.

Example:

Scientific Community

95% agreement

Consensus:

0.95

Consensus influences confidence.

Consensus is not truth.

---

# Contradictions

Beliefs may conflict.

Example:

Belief A

Minimum wage increases unemployment.

Belief B

Minimum wage has no measurable impact.

Both may coexist.

Contradictions should be explicit.

---

# Schools Of Thought

Multiple competing explanations may coexist.

Example:

Roman Empire Collapse

School A:
Economic Decline

School B:
Military Overstretch

School C:
Political Instability

School D:
Combination Theory

Delphi should preserve all perspectives.

---

# Epistemic States

```ts
type EpistemicState =
  | "HYPOTHESIS"
  | "BELIEF"
  | "STRONG_BELIEF"
  | "FACT"
  | "DISPUTED"
  | "REFUTED"
```
---

# Confidence

Confidence estimates certainty.

Range:

0.0
to
1.0

Confidence is never absolute.

---

# Confidence Components

Suggested:

```ts
interface Confidence {
  value: number

  evidenceStrength: number
  sourceReliability: number
  sourceDiversity: number
  freshness: number
  consensus: number
  contradictionRisk: number
}
```

---

# Confidence Propagation

Beliefs influence other beliefs.

Example:

Gravity
↓
Orbital Mechanics
↓
Space Navigation

If confidence decreases:

Impact propagates.

---

# Dependency Awareness

Every belief should answer:

What supports me?

What do I support?

What depends on me?

---

# Truth Networks

Beliefs form networks.

Example:

Gravity
↓
Newtonian Mechanics
↓
Engineering Models

Confidence propagates through networks.

---

# Confidence Decay

Confidence may decrease when:

Evidence becomes stale.

Contradictions appear.

Consensus shifts.

Context changes.

---

# Uncertainty

Uncertainty is not failure.

Uncertainty is knowledge.

Delphi should explicitly model:

Unknowns

Open Questions

Research Gaps

Competing Theories

---

# Research Relationship

Research exists to reduce uncertainty.

Question
↓
Research
↓
Evidence
↓
Belief Update
↓
Confidence Change

---

# Evaluation Relationship

Evaluations do not create truth.

Evaluations create quality assessments.

Truth and quality are different concepts.

---

# Decision Relationship

Decisions consume beliefs.

Decisions should not consume raw assertions.

Belief
↓
Evaluation
↓
Decision

---

# Meta-Beliefs

Brains may hold beliefs about beliefs.

Examples:

Confidence is too high.

Evidence quality is weak.

Consensus is unreliable.

---

# Epistemic Debt

Epistemic Debt occurs when:

Confidence is weak.

Evidence is insufficient.

Contradictions are unresolved.

Research is missing.

Epistemic Debt creates work.

---

# Canonical Questions

Why do we believe this?

How confident are we?

What supports this?

What contradicts this?

Who disagrees?

Which school of thought supports it?

What happens if this becomes false?

---

# Truth Hierarchy

Reality
↓
Observation
↓
Evidence
↓
Assertion
↓
Belief
↓
Consensus
↓
Theory
↓
Decision

---

# Canonical Rules

1. Assertions are claims.
2. Beliefs are assertions with confidence.
3. Facts are high-confidence beliefs.
4. Truth is contextual.
5. Consensus is not truth.
6. Contradictions should be explicit.
7. Multiple schools of thought may coexist.
8. Uncertainty should be preserved.
9. Confidence should be explainable.
10. Research exists to reduce uncertainty.
11. Decisions consume beliefs.
12. Beliefs form dependency networks.

---

# Success Criteria

1. Beliefs can explain themselves.
2. Confidence is measurable.
3. Contradictions are represented.
4. Consensus is represented.
5. Contextual truth is supported.
6. Competing theories can coexist.
7. Dependency propagation is possible.
8. Uncertainty remains visible.
9. Research reduces uncertainty.
10. Decisions remain traceable.
11. Brains can explain why they believe something.
12. Truth remains auditable.
