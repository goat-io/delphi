---
name: delphi-constitution-first-principles
type: research
status: closed
region: Spec
topics:
  - constitution
  - first principles
  - layers
  - canonical rules
  - agent loop
  - RFC-0000
sources:
  - rfcs/RFC-0000-Delphi-Constitution.md
---

# Delphi Constitution — First Principles, Layers, and Canonical Rules

## Purpose and Core Intent

RFC-0000 establishes Delphi as an **Agent Knowledge & Decision Protocol** whose
purpose is not to store information but to *continuously improve a model of
reality* through evidence, reasoning, evaluation, decision-making, execution,
and learning. Every subsequent RFC is grounded in this constitution.

**Source:** RFC-0000 §"Purpose" (lines 1–19).

## Ten First Principles

RFC-0000 articulates ten foundational principles that govern every design
decision in Delphi:

1. **Reality is not Knowledge.** The world exists independently of any model.
2. **Evidence is not Truth.** Evidence describes reality but is always partial.
3. **Knowledge is not certain.** Beliefs carry confidence, never absolute truth.
4. **Evaluation is separate from Knowledge.** Rubrics judge quality; leaves store belief.
5. **Decisions are separate from Beliefs.** Acting on a belief requires an explicit decision act.
6. **Ontology is Knowledge.** The type system itself is modelled as leaves.
7. **Everything evolves.** No schema, rubric, or belief is ever final.
8. **Every assertion requires provenance.** Unsupported claims are inadmissible.
9. **Every belief requires confidence.** Uncertainty is quantified, not elided.
10. **Every system accumulates knowledge debt.** Gaps are first-class citizens.

**Source:** RFC-0000 §"First Principles" (lines 22–35).

## The Agent Loop

The canonical continuous improvement cycle in RFC-0000 is:

```
Reality → Evidence → Beliefs → Evaluation → Decisions → Tasks → Execution → Observation → Reality
```

This loop is the operational heart of Delphi. All agent work is a traversal of
some segment of this loop. The loop never terminates — each observation feeds
new evidence back into the system.

**Source:** RFC-0000 §"Agent Loop" (lines 37–50).

## Seven Layers of Reality

RFC-0000 defines seven orthogonal layers that together span the full pipeline
from raw reality to structured knowledge:

| Layer | Contents | Examples |
|---|---|---|
| Reality | Things that exist | PostgreSQL, GDPR, Goatlab |
| Evidence | Things that describe reality | Books, papers, laws, interviews |
| Knowledge | Interpretations of evidence | Claims, beliefs, assumptions, hypotheses |
| Evaluation | Quality standards | Design rubric, architecture rubric |
| Decision | Chosen actions | "Use TigerBeetle", "Adopt OAuth2" |
| Research | Mechanisms that reduce uncertainty | Questions, experiments, investigations |
| Ontology | The language of the system | Types, relationships, validation rules |

**Source:** RFC-0000 §"The Seven Layers" (lines 117–189).

## Core Primitives (RFC-0000 definitions)

RFC-0000 defines six atomic primitives:

- **Assertion** — the atomic unit of reasoning; a claim about reality that can
  carry evidence, confidence, dependencies, evaluations, decisions, and tasks.
- **Leaf** — the canonical storage object; everything is stored as a leaf
  (beliefs, decisions, rubrics, tasks, ontology types).
- **Edge** — a typed relationship between two leaves.
- **Evidence** — supporting or contradicting information that backs an assertion.
- **Confidence** — a quantified belief state on `[0.0, 1.0]`.
- **Rubric** — a structured evaluation model with criteria, weights, and scoring rules.

**Source:** RFC-0000 §"Core Primitives" (lines 52–113).

## Confidence Theory (Constitution Level)

At the constitution level, RFC-0000 establishes that truth is not binary.
Confidence integrates Evidence Strength, Source Reliability, Source Diversity,
Freshness, Consensus, and Contradiction Risk. Facts are defined as
high-confidence beliefs — they are not a separate primitive.

**Source:** RFC-0000 §"Confidence Theory" (lines 218–230). Full formula in RFC-0003.

## Evaluation Theory (Constitution Level)

RFC-0000 separates knowledge ("what we believe") from evaluation ("what good
looks like"). Rubrics are first-class objects. Rubrics carry criteria, weights,
scoring rules, version history, evidence, and provenance. This separation means
the same belief can be evaluated under different rubrics without polluting the
belief itself.

**Source:** RFC-0000 §"Evaluation Theory" (lines 232–248). Full schema in RFC-0005.

## Ontology Theory (Constitution Level)

The ontology is not hardcoded. It is represented *as leaves*, making it
researchable, evaluatable, and versionable. Ontology changes follow the
lifecycle: Gap → Proposal → Research → Review → Migration.

**Source:** RFC-0000 §"Ontology Theory" (lines 250–272). Full protocol in RFC-0006 and RFC-0025.

## Research Theory (Constitution Level)

Research exists solely to reduce uncertainty. The research loop is:
Question → Investigation → Evidence → Belief Update → Gap Detection → New Questions.
The process never ends — uncertainty is never fully eliminated.

**Source:** RFC-0000 §"Research Theory" (lines 274–289).

## Knowledge Sovereignty and Federation

Brains own their knowledge, evidence, confidence, ontology extensions, rubrics,
and decisions. Brains share only the Delphi *protocol*, not ownership. Brains
may Import, Export, Reference, Fork, or Subscribe without losing sovereignty.

**Source:** RFC-0000 §"Knowledge Sovereignty" (lines 291–306) and §"Federation" (lines 308–319).

## Ten Canonical Rules

RFC-0000 closes with ten rules that MUST hold in any correct Delphi implementation:

1. Everything is a Leaf.
2. Leaves are canonical.
3. Indexes are generated.
4. Documents are not truth.
5. Evidence supports assertions.
6. Beliefs have confidence.
7. Rubrics evaluate quality.
8. Ontology evolves.
9. Research never ends.
10. Every belief must be explainable.

**Source:** RFC-0000 §"Canonical Rules" (lines 321–335).

## Long-Term Vision

Delphi is designed to become a portable protocol for Knowledge, Evaluation,
Decision Making, Research, and Ontology Evolution — applicable across
engineering, law, medicine, research, and civilization-scale domains. The goal
is not to answer questions but to continuously improve a model of reality.

**Source:** RFC-0000 §"Long-Term Vision" (lines 337–350).

## Answered Questions

**Q: What is Delphi's core purpose?**
To continuously improve a model of reality through the agent loop
(Reality → Evidence → Beliefs → Evaluation → Decisions → Tasks → Execution → Observation).
It is not a storage system, database, or question-answering engine.

**Q: What are the first principles Delphi cannot violate?**
The ten principles in RFC-0000 §"First Principles": reality ≠ knowledge,
evidence ≠ truth, knowledge is uncertain, evaluation is separate from knowledge,
decisions are separate from beliefs, ontology is knowledge, everything evolves,
every assertion requires provenance, every belief requires confidence,
every system accumulates knowledge debt.

**Q: How does Delphi separate knowledge from evaluation?**
Knowledge (what we believe) is stored as Leaves with confidence scores.
Evaluation (what good looks like) is performed by Rubrics, which are also
first-class Leaves. An EvaluationResult connects a Rubric to a target Leaf
independently of the belief's own confidence.

**Q: What does "Brains are sovereign" mean?**
Each Brain owns its knowledge, rubrics, ontology extensions, and decisions.
Brains share only the Delphi wire protocol. Federation (Import/Export/Reference/
Fork/Subscribe) transfers knowledge without transferring ownership.

**Q: Why does the Delphi ontology evolve as leaves?**
Because ontology is itself a domain of knowledge. Representing ontology as
leaves makes it subject to the same evidence, confidence, evaluation, and
versioning machinery as any other knowledge — eliminating a privileged "schema"
layer that would resist evolution.
