---
title: Ontology Evolution and Governance
region: Spec
sources:
  - rfcs/RFC-0025-Ontology-Evolution-and-Governance.md
  - rfcs/RFC-0006-Ontology-System.md
  - rfcs/RFC-0015-Migration-and-Versioning.md
  - rfcs/RFC-0018-Universal-Knowledge-Model.md
confidence: 0.84
---

# Ontology Evolution and Governance

## Core Thesis

RFC-0025 is founded on a single premise: a static ontology eventually fails. Reality changes.
New concepts emerge. New relationships become necessary. A Brain that cannot evolve its
ontology will eventually become unable to represent the knowledge it needs to navigate.
The RFC defines how ontology changes — from gap detection through proposal, migration,
and governance — without breaking existing knowledge.

## Why Static Ontologies Fail

RFC-0025 gives concrete examples:
- Before 2007: "iPhone" did not exist as a product category
- Before 2008: "Bitcoin" did not exist as an asset class
- Before 2022: "Generative AI" was not a major engineering category

Each of these required new concepts, new relationships, and in some cases new validation
rules. An ontology frozen in 2006 cannot cleanly represent a 2024 engineering decision
about which foundation model to adopt.

RFC-0025 asserts: "Ontology completeness is impossible. Continuous refinement is expected."
This is not a limitation of the system — it is an explicit design position.

## Ontology Packs

Ontologies are distributed as versioned packs. RFC-0025 gives examples:

- `@delphi/legal` — types and relationships for legal knowledge
- `@delphi/medicine` — clinical types, diagnostic relationships
- `@delphi/history` — temporal and causal relationships for historical knowledge
- `@delphi/software` — architecture, system, dependency relationships

A Brain may install multiple packs simultaneously. Pack types must not conflict; conflict
resolution is a governance concern addressed by the Ontology Steward.

## Ontology Steward

RFC-0025 defines the Ontology Steward role as responsible for:

- Detecting gaps (concepts that exist in knowledge but lack ontology types)
- Detecting duplicates (two types that effectively model the same concept)
- Proposing migrations to consolidate or extend the ontology
- Proposing new relationship types when existing ones are insufficient
- Maintaining pack governance documentation

The Steward may be a human, an agent, or a hybrid. In the Delphi self-brain, the evolution
daemon acts as Ontology Steward by filing COVERAGE_GAP and ONTOLOGY_PROPOSAL tasks.

## Ontology Gap Detection

An ontology gap occurs when knowledge exists but no suitable ontology concept exists to
classify it. Detection mechanisms (RFC-0025):

- **Research** — a researcher encounters a concept with no fitting type
- **Agent observations** — classification failures logged during extraction (RFC-0027)
- **Knowledge debt analysis** — leaves with generic or placeholder types flagged by the indexer
- **User feedback** — humans report that the ontology cannot represent their domain

Detected gaps become ONTOLOGY_PROPOSAL tasks in the task queue, prioritized by how many
existing leaves would benefit from the new concept.

## Ontology Proposals

A change to the ontology begins as a proposal. RFC-0025 defines the proposal lifecycle:

```
PROPOSED
  ↓ (review by Steward or Arbiter Agent)
APPROVED
  ↓ (migration executed)
ACTIVE
  ↓ (deprecated if superseded)
DEPRECATED
```

Proposals must specify:
1. The new concept or relationship to add (or the change to make)
2. The existing leaves that would be reclassified
3. The migration path for existing data
4. The reviewer(s) and their rationale

No ontology change may bypass the proposal process. Direct schema mutations without a
proposal violate the governance model and risk creating untracked migration debt.

## Ontology Migrations

When a proposal is approved, a migration executes. A migration is a structured operation
that:

1. Adds or modifies types in the ontology schema
2. Reclassifies existing leaves to the new type where applicable
3. Validates that no leaf is left in an invalid state
4. Records the migration as an event in the Brain's event log

RFC-0015 (Migration and Versioning) governs the technical details of how ontology versions
are tracked and how rollbacks are handled if a migration produces invalid states.

## Ontology Debt

RFC-0025 defines Ontology Debt as the accumulated cost of ontology insufficiency:

```
Ontology Debt = Count of leaves with invalid or placeholder types
              + Count of relationship types that cannot express real domain relationships
              + Count of concepts that exist in knowledge but lack ontology representation
```

High ontology debt degrades extraction quality (RFC-0027), navigation accuracy (RFC-0007),
and index generation (RFC-0019). The Delphi coverage score partially reflects ontology debt
when region confidence is low due to poorly classified leaves.

## Relationship to the Universal Model

RFC-0018 states that the protocol (primitives + relationships) never changes, but ontology
does. RFC-0025 is the mechanism that makes this true in practice: by defining a governance
process for ontology evolution, it allows domain-specific classification to grow indefinitely
while the eight universal objects (Object, Evidence, Belief, Index, Evaluation, Decision,
Task, Ontology) remain stable.

This separation is what makes federation (RFC-0009) possible across brains with different
ontologies: two brains can exchange leaves without agreeing on every type, as long as they
share the core primitives.

## Answered Questions

**Q: How does the Brain evolve its ontology without breaking existing leaves?**

Through the migration protocol defined in RFC-0025 and RFC-0015. Every ontology change
is proposed, reviewed, and executed as a structured migration that reclassifies existing
leaves and validates the result. No leaf is left in an invalid classification state
after a migration completes.

**Q: Who can approve an ontology change?**

The Ontology Steward (RFC-0025). In the Delphi constitution (RFC-0000), human approval
is required only for actions that affect other humans. Ontology changes that remain
internal to the Brain's own knowledge system may be approved autonomously by the Steward.

**Q: What happens if two ontology packs define conflicting types?**

RFC-0025 treats this as a governance conflict that the Ontology Steward must resolve.
The resolution may be a merge (one type absorbs the other), a disambiguation (both types
are kept with clarified scope boundaries), or a deprecation (one pack is removed).
The conflict must be resolved before the conflicting types can be used for extraction.

**Q: Can ontology packs be versioned and rolled back?**

Yes. RFC-0015 defines versioning for the entire knowledge system, including ontology.
A pack version is a semver-tagged snapshot. Rollback restores the previous version's
type definitions and triggers a reverse migration for any leaves classified under the
rolled-back type.

**Q: How does the evolution daemon detect when new ontology work is needed?**

By observing leaves that fail type validation during extraction (RFC-0027 candidate staging)
and by monitoring the count of leaves with generic or fallback types. When either metric
crosses a threshold, the daemon creates an ONTOLOGY_PROPOSAL task.
