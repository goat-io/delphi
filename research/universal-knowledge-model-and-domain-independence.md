---
title: Universal Knowledge Model and Domain Independence
region: Spec
sources:
  - rfcs/RFC-0018-Universal-Knowledge-Model.md
  - rfcs/RFC-0001-Delphi-Meta-Model.md
  - rfcs/RFC-0002-Leaf-Protocol.md
  - rfcs/RFC-0009-Brains-and-Federation.md
  - rfcs/RFC-0016-Example-Brains.md
confidence: 0.87
---

# Universal Knowledge Model and Domain Independence

## Core Thesis

RFC-0018 answers the question: why can physics, law, medicine, engineering, history, and
personal knowledge all live in the same protocol? The answer is that Delphi does not model
domains — it models how intelligence constructs, compresses, evaluates, and evolves
*understanding*. Domains are specializations of ontology; the primitives never change.

## The Missing Layer: Understanding

Traditional knowledge systems model the chain:

```
Reality → Evidence → Beliefs
```

Delphi adds a fourth layer:

```
Reality → Evidence → Beliefs → Understanding
```

RFC-0018 calls this the "missing layer." Understanding is not the same as knowledge.
Knowledge can grow to arbitrary size. Understanding must remain navigable.
Knowledge Indexes (RFC-0019) are the mechanism that compresses knowledge into understanding.
They answer "what exists here?" and "what matters most?" — the questions that make a large
knowledge space navigable by an agent or a human.

## The Universal Pattern

RFC-0018 asserts that every domain eventually contains the same recurring pattern:

```
Reality
→ Evidence
→ Beliefs
→ Knowledge Indexes
→ Evaluations
→ Decisions
→ Tasks
```

This is visible in every example RFC-0016 documents:

| Domain | Reality | Belief Example | Decision Example |
|---|---|---|---|
| Physics | Gravity | Mass attracts mass | Apply equation |
| Law | Legal system | GDPR applies to Company X | Implement compliance controls |
| Business | Market | Market opportunity exists | Launch product |
| Medicine | Disease | Treatment A improves outcomes | Adopt treatment protocol |
| Engineering | Database system | PostgreSQL suits the workload | Adopt PostgreSQL |

The pattern is universal because it reflects how cognition works, not what a domain contains.

## The Eight Universal Objects

RFC-0018 identifies eight objects sufficient to represent any knowledge domain:

1. **Object** — something that exists (person, company, law, disease, technology, theory)
2. **Evidence** — why something is believed (paper, benchmark, court decision, observation)
3. **Belief** — current understanding with confidence
4. **Knowledge Index** — compressed, navigable summary of a knowledge region
5. **Evaluation** — a quality judgment using a rubric
6. **Decision** — a commitment with rationale and traceability
7. **Task** — a unit of future work
8. **Ontology** — classification: types, relationships, validation rules

RFC-0018 states: "Nothing else is strictly required." Every domain-specific concept is a
specialization of one of these eight through ontology.

## Domain Independence

The key design choice in RFC-0018: the *protocol* never changes; only *ontology* changes.

```
Legal Brain    → @delphi/legal ontology
Engineering    → @delphi/engineering ontology
Personal Brain → @delphi/personal ontology
```

The same Leaf schema (RFC-0002), the same confidence model (RFC-0003), the same evidence
structure (RFC-0004), and the same navigation mechanics (RFC-0007) apply everywhere. A Brain
for law and a Brain for engineering are structurally identical; they differ only in the
types and relationships their ontology declares.

This is what makes federation (RFC-0009) possible: brains can exchange knowledge because
they share the same protocol, even if their ontologies differ.

## Progressive Compression

RFC-0018 requires every significant knowledge region to expose four levels of compression:

| Level | Purpose |
|---|---|
| Tiny Summary | Token-efficient entry point; fits in a tool call result |
| Short Summary | Contextual overview; enough to decide whether to go deeper |
| Medium Summary | Full regional understanding without reading every leaf |
| Long Summary | Comprehensive detail for agents doing deep research |

This allows "maximum understanding with minimum context consumption" — the stated efficiency
goal of RFC-0007 and RFC-0019.

## Universal Relationship Taxonomy

RFC-0018 classifies all relationships between leaves into seven categories:

1. **Classification** — leaf belongs to an ontology type
2. **Evidence** — leaf is supported by another leaf or external asset
3. **Dependency** — leaf requires another leaf to remain valid
4. **Evaluation** — leaf has been assessed by a rubric
5. **Temporal** — leaf follows or precedes another in time
6. **Causal** — leaf causes or caused by another
7. **Research** — leaf raises a question that another leaf answers

Every relationship in the Delphi graph is one of these seven. This taxonomy enables the
dependency propagation system (RFC-0022) to reason about what breaks if any given belief
becomes false.

## The Recursive Knowledge Graph

RFC-0018 presents the full system as a recursive graph:

```
Reality
↓ Evidence
Beliefs
↓ Compression
Knowledge Indexes
↓ Judgment
Evaluations
↓ Choice
Decisions
↓ Execution
Tasks
↓ Observation
Reality
```

The cycle is intentional: completing tasks generates new observations, which produce new
evidence, which updates beliefs, which requires new index generation. The loop does not
terminate — it is the evolution cycle described in AGENTS.md.

## The Delphi Self-Brain

RFC-0016 documents nine example Brain types. The ninth is the Delphi Brain: the repository's
own knowledge modeled using Delphi itself. This is not incidental. RFC-0018 explicitly requires
that "the protocol can represent any knowledge domain" — and the protocol's own specification
is a knowledge domain.

The self-brain (`.delphi/` runtime, `brain/` canonical export) is the live proof that the
universal model works. If the spec cannot model itself, the model fails. The bootstrap sequence
(`pnpm brain:bootstrap`) regenerates this proof from committed state.

## Answered Questions

**Q: Why can physics and law coexist in the same system?**

Because Delphi models how intelligence *constructs* understanding, not what a domain
*contains*. Both physics and law produce Evidence → Beliefs → Evaluations → Decisions.
The primitives are identical; only the ontology (types and relationships) differs.
See RFC-0018 "Why This Works."

**Q: What is the difference between knowledge and understanding in Delphi?**

Knowledge is the set of all leaves and their evidence. Understanding is the compressed,
navigable representation of that knowledge through Knowledge Indexes. A Brain can hold
millions of leaves (knowledge) while still being navigable (understanding). RFC-0018 and
RFC-0019 define both layers.

**Q: Can the Delphi protocol represent a personal knowledge base?**

Yes. RFC-0016 describes a Personal Brain explicitly: goals, projects, decisions, memories,
and learning all map directly to the eight universal objects. A goal is a leaf of kind TASK
or OBJECTIVE; a personal decision is a leaf of kind DECISION with personal evidence. The
ontology differs (@delphi/personal) but the protocol is identical.

**Q: Is the universal model provably complete — can it represent every domain?**

RFC-0018 claims universality through the argument that all domains exhibit the same
cognitive pattern (observe, reason, compress, evaluate, act, learn). The eight universal
objects are sufficient if the ontology is sufficiently expressive. RFC-0018 acknowledges
ontology is never finished (see RFC-0025 Ontology Evolution) — the model is universal in
structure but requires continuous ontology refinement per domain.
