---
title: Ontology Evolution, Migration, and Breaking Changes
region: Spec
kind: research
confidence: 0.74
sources:
  - rfcs/RFC-0025-Ontology-Evolution-and-Governance.md
  - rfcs/RFC-0006-Ontology-System.md
  - rfcs/RFC-0015-Migration-and-Versioning.md
  - rfcs/RFC-0022-Dependency-and-Impact-Propagation.md
  - rfcs/RFC-0026-Tasks-and-Questions.md
---

# Ontology Evolution, Migration, and Breaking Changes

## Core Principle (RFC-0025)

RFC-0025 opens with:

> "A static ontology eventually fails. Reality changes. Knowledge expands. New concepts
> emerge. New relationships appear. Therefore: Ontologies must evolve."

Delphi treats ontology incompleteness as the default state, not an exception. The
ontology evolution loop is intended to run continuously alongside the knowledge evolution
loop.

---

## Ontology Proposal Types (RFC-0025)

All ontology changes begin as proposals. RFC-0025 § Proposal Types defines seven kinds:

| Proposal Type        | Description                                          |
|----------------------|------------------------------------------------------|
| New Concept          | Add a new leaf kind to the ontology                 |
| New Relationship     | Add a new edge type                                 |
| New Validation Rule  | Add a constraint on leaf or relationship structure  |
| Merge Concepts       | Consolidate two concepts that overlap               |
| Split Concepts       | Divide one concept into two more precise ones       |
| Deprecation          | Mark a concept as no longer recommended             |
| Migration            | Reclassify existing leaves under new concept(s)     |

**Belief:** No agent may auto-create ontology changes. RFC-0025 § Agent Participation:
"Agents may propose changes. Agents should not automatically approve ontology changes."
Human or Ontology Steward approval is required before any change enters the ontology.

---

## Breaking vs. Additive Changes (RFC-0025)

RFC-0025 § Compatibility defines the key distinction:

**Additive changes** (preferred):
- New concepts
- New relationships
- New metadata on existing types

**Breaking changes** (require migration):
- Removing a concept
- Renaming a concept
- Changing the meaning of a concept
- Changing relationship semantics

The RFC-0025 example:

> Old: `DATABASE`
> New: `RELATIONAL_DATABASE`, `DOCUMENT_DATABASE`
> → Migration required

---

## Migration Task Generation (RFC-0025, RFC-0022)

When a breaking change is approved, the migration process generates Tasks (RFC-0026):

1. **Migration Tasks** — reclassify all existing leaves that use the deprecated concept.
2. **Review Tasks** — leaves where automated reclassification is ambiguous need human review.
3. **Research Tasks** — if the new concept is not yet evidenced, research tasks are generated.
4. **Reclassification Tasks** — leaves in partner Brains that reference the deprecated concept.

RFC-0022 (Dependency & Impact Propagation) is used to compute the blast radius of the
change: which leaves reference the concept being changed, and which downstream beliefs
depend on those leaves.

**Belief:** A concept with 200 dependent leaves and 10 decisions is a high-risk migration
target. RFC-0022's `what_breaks_if` analysis must be run before any breaking ontology change
is approved.

---

## Ontology Steward Role (RFC-0025)

RFC-0025 § Ontology Steward defines the steward as responsible for:

- **Gap detection** — finding concepts that reality requires but the ontology lacks.
- **Duplicate detection** — finding concepts that overlap or are redundant.
- **Migration proposals** — authoring proposals that include impact analysis.
- **Pack maintenance** — versioning and releasing ontology packs.

The steward may be human, agent, or hybrid. In the current MVP (DELPHI-MVP-0001), the
steward role is expected to be a human with agent assistance.

---

## Ontology Packs and Versioning (RFC-0025)

RFC-0025 § Ontology Packs describes the distribution model:

- Ontologies are distributed as versioned packs: `@delphi/legal`, `@delphi/medicine`, etc.
- Packs use semantic versioning: `v1.0.0`, `v1.1.0`, `v2.0.0`.
- Minor versions are additive. Major versions may be breaking.
- Brains install packs explicitly; multiple packs may coexist.
- Local Brains may extend installed packs: `@goatlab/software` extends `@delphi/software`.

**Belief:** Pack versioning follows the same semantic versioning contract as software
packages: patch = bug fix in definitions, minor = additive, major = breaking.

---

## Historical Ontology Preservation (RFC-0025)

RFC-0025 § Historical Ontology:

> "Old ontology versions remain accessible. Legal Ontology 2020. Legal Ontology 2030.
> Both remain queryable."

This is required for temporal query correctness (see research/temporal-queries-and-as-of-semantics.md):
an evaluation performed in 2022 used a 2022 rubric against a 2022 ontology. Replaying
that evaluation in 2026 must use the same ontology version.

---

## Ontology Debt Signals (RFC-0025)

RFC-0025 § Debt Signals defines observable indicators of ontology debt:

| Signal                    | Interpretation                                    |
|---------------------------|---------------------------------------------------|
| High ambiguity             | Concepts not precise enough for clean classification |
| Repeated exceptions        | Reality doesn't fit the ontology                  |
| Manual overrides           | Agents can't classify without human intervention  |
| Frequent reclassification  | Concept boundaries are unstable                   |

RFC-0025 § Ontology Health specifies the metrics Brains should expose:
Coverage, Ambiguity, Debt, Migration Backlog, Classification Success Rate.

**Belief:** Ontology debt is measurable from classification event logs. A rising
reclassification rate is the primary signal that a concept boundary needs refinement.

---

## Impact on Indexes and Maps (RFC-0025)

RFC-0025 § Query Impact:

> "Ontology changes affect: Indexes, Maps, Search, Classification, Evaluations, Queries.
> Impact analysis required."

When an ontology concept is renamed or split, region indexes that summarise leaves
classified under the old concept become stale (RFC-0028). The regeneration policy
(RFC-0028 § Regeneration Policy) will detect this via `changeWeight` and schedule
regeneration. However, for breaking ontology changes, index regeneration may need
to be **immediate** rather than debounced.

---

## Federation and Ontology Evolution (RFC-0025, RFC-0009)

RFC-0025 § Federation:

> "Brains exchange ontology references, not ontology control. Brains remain sovereign."

If Brain A uses `@delphi/software v1.0` and Brain B upgrades to `@delphi/software v2.0`
with a breaking change, cross-Brain references that use the old concept may break.
The federation model requires that:

1. Brain B announces the ontology version it uses on exported leaves.
2. Brain A can map from Brain B's v2.0 concepts to its local v1.0 concepts during import.
3. Migration of Brain A's local ontology is Brain A's decision, not Brain B's.

---

## Canonical Beliefs

1. Ontologies are never complete; incompleteness is the default state (RFC-0025).
2. All ontology changes begin as proposals; no agent may auto-approve changes.
3. Additive changes are preferred; breaking changes require migration tasks.
4. RFC-0022 impact analysis must precede any breaking change approval.
5. The Ontology Steward role governs gap detection, duplicate detection, and migrations.
6. Ontology packs are versioned; major versions may be breaking.
7. Historical ontology versions must remain queryable for temporal correctness.
8. Ontology debt is measurable from classification event logs.
9. Breaking changes trigger index regeneration and may bypass debounce rules.
10. In federation, ontology control remains with each Brain; version mapping is the importer's responsibility.
