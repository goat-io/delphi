# RFC-0003 — Knowledge & Confidence Theory
## Epistemology, Beliefs, Confidence, Dependencies and Impact Analysis

Status: Draft
Depends On:
- RFC-0000
- RFC-0001
- RFC-0002

---

# Purpose

This RFC defines how Delphi represents knowledge.

More importantly, it defines:

- what knowledge is
- what knowledge is not
- what confidence means
- how beliefs are formed
- how confidence changes
- how dependencies work
- how impact analysis works

This RFC is the intellectual core of Delphi.

---

# Fundamental Principle

Delphi does not store truth.

Delphi stores:

Current Models of Reality.

Everything in Delphi is potentially revisable.

---

# Reality vs Knowledge

Reality and Knowledge are different things.

Reality exists independently of observers.

Knowledge is our current model of reality.

Example:

Reality:
The Earth orbits the Sun.

Knowledge:
Humans believe the Earth orbits the Sun.

Delphi stores knowledge.

Not reality itself.

---

# Assertions

The fundamental unit of reasoning is an Assertion.

Examples:

- TigerBeetle is suitable for Walliver.
- Roman law influenced Chilean law.
- Accessibility improves usability.
- PostgreSQL scales to millions of rows.

Assertions may be:

- supported
- contradicted
- evaluated
- revised

---

# Beliefs

A Belief is an Assertion with confidence.

Example:

Assertion:
TigerBeetle is suitable for Walliver.

Confidence:
0.82

Result:

Belief

---

# Facts

Facts are not a separate primitive.

Facts are high-confidence beliefs.

Example:

Belief:
The Earth orbits the Sun.

Confidence:
0.999999

Operationally:

Fact

---

# Assumptions

Assumptions are beliefs accepted without sufficient evidence.

Examples:

- User traffic will increase.
- Customers prefer simplicity.

Assumptions should be explicitly marked.

---

# Hypotheses

Hypotheses are beliefs intended for testing.

Examples:

- Users engage more with shorter forms.
- Architecture A reduces latency.

Hypotheses generate research tasks.

---

# Questions

Questions represent uncertainty.

Examples:

- Can TigerBeetle recover after node failure?
- Which architecture scales better?

Questions are first-class objects.

---

# Confidence

Confidence represents belief strength.

Range:

0.0 → 1.0

0.0 = unsupported

1.0 = maximum confidence

---

# Confidence Components

Confidence should not be a single number.

Confidence is composed of:

1. Evidence Strength
2. Source Reliability
3. Source Diversity
4. Freshness
5. Consensus
6. Contradiction Risk

---

# Initial Confidence Formula

Suggested MVP:

confidence =
  (0.30 × evidenceStrength)
+ (0.20 × sourceReliability)
+ (0.15 × sourceDiversity)
+ (0.15 × freshness)
+ (0.20 × consensus)
- (0.20 × contradictionRisk)

Positive weights sum to 1.0.

A belief with perfect components and zero contradiction risk
reaches confidence 1.0.

Clamp:

0 ≤ confidence ≤ 1

---

# Confidence Levels

Suggested interpretation:

0.00 - 0.20
Very Weak

0.20 - 0.40
Weak

0.40 - 0.60
Moderate

0.60 - 0.80
Strong

0.80 - 0.95
Very Strong

0.95 - 1.00
Fact-Like

---

# Confidence Propagation

Beliefs depend on other beliefs.

Example:

Benchmark Result
→ TigerBeetle Suitable
→ Use TigerBeetle
→ Migration Plan

If Benchmark Result becomes invalid:

Confidence decreases throughout the chain.

---

# Dependency Theory

Knowledge forms dependency networks.

Examples:

Arithmetic
→ Algebra
→ Linear Algebra
→ Machine Learning

Roman Law
→ Civil Law
→ Chilean Civil Code

GDPR
→ Company Policy
→ Internal Procedure

---

# Dependency Rules

Every belief should answer:

What supports me?

What do I depend on?

What depends on me?

---

# Impact Analysis

One of Delphi's most important capabilities.

Question:

What breaks if this becomes false?

Process:

Belief Changes
→ Traverse Dependency Graph
→ Identify Impacted Leaves
→ Recalculate Confidence
→ Create Tasks

---

# Belief Lifecycle

Beliefs evolve.

Lifecycle:

Created
→ Supported
→ Accepted
→ Challenged
→ Revised
→ Superseded

A belief is never permanently final.

---

# Contradictions

Contradictions are first-class citizens.

Examples:

Paper A:
Supports Claim

Paper B:
Contradicts Claim

Both should remain visible.

Delphi does not hide disagreement.

---

# Consensus

Consensus influences confidence.

Consensus is not truth.

Example:

100 sources agree.

Confidence increases.

Consensus remains evidence.

Not proof.

---

# Freshness

Knowledge decays.

Examples:

Technology knowledge
decays quickly.

Historical knowledge
decays slowly.

Freshness should affect confidence.

---

# Knowledge Lineage

Knowledge has ancestry.

Examples:

Roman Law
→ Civil Law
→ Chilean Civil Code

Research Paper
→ Theory
→ Best Practice

Knowledge should explain:

Where it came from.

---

# Knowledge Debt

Knowledge debt is accumulated uncertainty.

Examples:

- Missing evidence
- Weak confidence
- Stale knowledge
- Unreviewed beliefs
- Unsupported assumptions
- Contradictions

Knowledge debt generates research tasks.

---

# Research Triggers

Automatically create research tasks when:

Confidence decreases.

Contradictions appear.

Evidence becomes stale.

Dependencies change.

Ontology gaps appear.

---

# Scoped Truth

Truth depends on context.

Examples:

Valid in Sweden.

Valid in 2024.

Valid under GDPR.

Valid under Newtonian assumptions.

Every belief should carry scope.

---

# Decision Separation

Decisions are not beliefs.

Example:

Belief:
TigerBeetle is suitable.

Decision:
Use TigerBeetle.

The belief may remain true.

The decision may still change.

---

# Evaluation Separation

Evaluation is not belief.

Example:

Belief:
Design follows Material Design.

Evaluation:
Design quality score 87%.

These are separate concepts.

---

# Canonical Questions

Every knowledge object should eventually answer:

Why do we believe this?

How confident are we?

What supports it?

What contradicts it?

What depends on it?

What depends on me?

When was it last verified?

What should be researched next?

---

# Success Criteria

A Delphi system successfully implements this RFC when:

1. Every belief has confidence.
2. Confidence can be explained.
3. Dependencies are explicit.
4. Impact analysis is possible.
5. Contradictions are visible.
6. Knowledge debt is measurable.
7. Research tasks are generated automatically.
8. Beliefs remain separate from decisions.
9. Beliefs remain separate from evaluations.
10. Knowledge lineage is preserved.
