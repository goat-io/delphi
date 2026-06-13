---
name: truth-contexts-scoped-belief-and-epistemic-types
type: research
status: closed
region: Spec
topics:
  - epistemology
  - truth-model
  - assertions
  - beliefs
  - facts
  - hypotheses
  - theories
  - truth-contexts
  - consensus
  - contradictions
  - RFC-0021
  - RFC-0003
sources:
  - rfcs/RFC-0021-Epistemology-and-Truth-Model.md
  - rfcs/RFC-0003-Knowledge-and-Confidence-Theory.md
  - rfcs/RFC-0000-Delphi-Constitution.md
---

# Truth Contexts, Scoped Belief, and Epistemic Types in Delphi

## The Foundational Commitment

Delphi does not store truth. It stores *beliefs about reality*. This is not a
hedge — it is a design decision that drives the entire knowledge model. Truth
in any meaningful domain is:

- **Contextual**: Legal truth differs from scientific truth; moral truth differs
  from historical truth.
- **Temporal**: What was true in 1950 may be false today.
- **Jurisdictional**: A contract valid under US law may be void under EU law.
- **Uncertain**: The most reliable belief still has non-zero error probability.

Therefore, Delphi never asserts "X is true." It asserts "We currently believe X
with confidence C, given evidence E, in context K."

**Source:** RFC-0021 §"Core Principle" and RFC-0000 §"The Fundamental Truth".

---

## The Epistemic Hierarchy

RFC-0021 defines a five-level epistemic hierarchy. Each level is a belief with
different characteristics:

### 1. Assertion

The smallest epistemic unit: a claim with no confidence attached.

```
"The Earth orbits the Sun."
"Minimum wage increases unemployment."
"Roman Law influenced Civil Law."
```

Assertions are inputs to Delphi. They become beliefs after evidence is attached
and confidence is computed.

**Source:** RFC-0021 §"Assertion".

### 2. Belief

An Assertion with a confidence score in `[0.0, 1.0]`.

```
Assertion: "PostgreSQL scales to millions of rows."
Confidence: 0.85
→ Belief
```

Beliefs are the canonical storage unit for knowledge claims. All knowledge in
Delphi is ultimately a belief. Facts and Theories are not separate storage
types; they are beliefs with specific confidence ranges.

**Source:** RFC-0021 §"Belief" and RFC-0003 §"Beliefs".

### 3. Fact

A belief with confidence ≥ 0.95, treated operationally as fact-like.

Facts are not stored differently from beliefs. The distinction is behavioral:
the system and its agents may treat high-confidence beliefs as stable anchors
for reasoning. A belief that drops below 0.95 ceases to be a Fact.

**Source:** RFC-0003 §"Facts" (lines 102–120) and RFC-0021 §"Facts".

### 4. Hypothesis

A belief with confidence < 0.50, representing an untested or weakly supported
claim. Hypotheses are first-class: they are stored, tracked, and linked to the
research tasks that would elevate or refute them.

A hypothesis does not expire automatically. It persists until:
- Evidence raises its confidence above 0.50 (becomes a Belief)
- Evidence refutes it (status → `REFUTED`)
- A question answers it (status → `RESOLVED`)

**Source:** RFC-0021 §"Hypothesis".

### 5. Theory

A collection of related beliefs that mutually support each other, forming a
coherent explanatory structure. A Theory is represented in Delphi as a set of
beliefs connected by `SUPPORTS` and `CONTRADICTS` relationships.

A Theory's overall confidence is an aggregate of its constituent beliefs.
When a constituent belief weakens, the Theory's coherence score decreases
(RFC-0022 propagation).

**Source:** RFC-0021 §"Theory" and RFC-0022 §"Theory Propagation".

---

## Truth Contexts

The same assertion can be true in one context and false in another. Delphi
represents this through *Truth Contexts* attached to beliefs.

A Truth Context has three dimensions:

### Temporal Scope

A belief is valid for a time range `[validFrom, validUntil]`. A belief about
the CEO of a company is true on a specific date but false a year later after
leadership changes. Outside its temporal scope, a belief is `STALE`.

### Jurisdictional Scope

Legal and regulatory beliefs are scoped to jurisdictions. A belief tagged
`jurisdiction: EU-GDPR` is not authoritative for US legal contexts.

### Ontological Scope

A belief may be scoped to a specific ontology context (a domain, a
subdiscipline, a paradigm). A belief that is true under Newtonian mechanics may
be false under quantum mechanics.

**Source:** RFC-0021 §"Truth Contexts".

---

## Consensus and Contradiction

### Consensus

Consensus is the degree to which multiple independent sources agree on an
assertion. It is one of the six components in the RFC-0003 confidence formula
(weight: 0.20).

Consensus is not truth. High consensus indicates agreement, not accuracy.
Historical examples: scientific consensus on phlogiston was once near-universal
and wrong.

**Source:** RFC-0021 §"Consensus" and RFC-0003 §"Confidence Components".

### Contradictions Are First-Class

When contradicting evidence appears, Delphi does not hide the conflict. Both
the supporting evidence and the contradiction are stored. The `contradictionRisk`
component in the confidence formula (weight: −0.20) reduces overall confidence
when contradictions are present.

This creates explicit tension rather than silent deletion of minority views.
An agent researching a topic sees both the dominant belief and its challengers.

**Source:** RFC-0021 §"Contradictions" and RFC-0003 §"contradictionRisk".

---

## Uncertainty as a First-Class Value

Delphi does not distinguish between "we don't know" and "there is no answer."
Both are represented as uncertainty, and uncertainty creates work:

- Low-confidence beliefs → `KNOWLEDGE_DEBT` → Research tasks
- Unanswered questions → open `QUESTION` leaves → Research tasks
- Contradictions without resolution → `REVIEW` tasks

Uncertainty is not a failure state. It is the raw material that evolution
processes.

**Source:** RFC-0021 §"Uncertainty" and RFC-0003 §"Knowledge Debt".

---

## Answers to Open Questions

**Q: Does Delphi have a notion of "objective truth" independent of evidence?**
No. RFC-0021 explicitly rejects objective truth as a stored primitive. Reality
exists independently, but the Brain only ever holds beliefs derived from
observation and evidence. The closest approximation is a belief with
confidence 1.0, but even that is theoretically revisable.
**Source:** RFC-0021 §"Core Principle".

**Q: Can two beliefs directly contradict each other and both be stored?**
Yes. Contradictory beliefs can coexist. They are linked by a `CONTRADICTS`
relationship. Both affect each other's `contradictionRisk` confidence
component. The Brain does not resolve the contradiction automatically — it
creates a research task to investigate.
**Source:** RFC-0021 §"Contradictions" and RFC-0003 §"contradictionRisk".

**Q: What happens to a Hypothesis that is never investigated?**
It persists indefinitely as an open Hypothesis leaf. It generates Knowledge Debt
(because its confidence is low). If the Knowledge Economics prioritizer
determines the impact of resolving it is low, it may remain in low-priority
limbo. It does not expire on its own.
**Source:** RFC-0021 §"Hypothesis" and RFC-0011 §"Prioritization".

**Q: How does temporal scoping interact with confidence?**
A belief outside its `validUntil` range becomes `STALE`. Staleness reduces the
`freshness` component in the confidence formula. A stale belief that was once
a Fact (confidence 0.97) may decay below 0.80 as freshness drops, triggering
a `REVIEW` task. The belief is not deleted — it may still be historically
accurate.
**Source:** RFC-0021 §"Temporal Scope" and RFC-0003 §"freshness".

**Q: Is a Theory a specific leaf kind?**
No. A Theory is not a distinct `LeafKind`. It is a pattern: a set of `BELIEF`
leaves connected by `SUPPORTS` relationships with a coherent explanatory
structure. The Brain represents Theories through relationships, not through a
dedicated primitive.
**Source:** RFC-0021 §"Theory" and RFC-0001 §"Leaf Kinds".
