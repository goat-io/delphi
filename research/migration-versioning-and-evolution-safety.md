---
name: migration-versioning-and-evolution-safety
type: research
status: closed
region: Spec
topics:
  - migration
  - versioning
  - semantic versioning
  - rollback
  - migration debt
  - RFC-0015
sources:
  - rfcs/RFC-0015-Migration-and-Versioning.md
  - rfcs/RFC-0000-Delphi-Constitution.md
  - rfcs/RFC-0025-Ontology-Evolution-and-Governance.md
---

# Migration, Versioning, and Evolution Safety in Delphi

## Purpose

RFC-0015 answers the question: how does Delphi evolve without breaking existing
Brains? The answer is explicit, auditable, versioned migration with mandatory
impact analysis, rollback capability, and compatibility contracts.

**Source:** RFC-0015 §"Purpose" (lines 1–6).

## Six Core Principles

RFC-0015 grounds itself in six non-negotiable principles:

1. **Evolution is mandatory.** Delphi is designed to change — not evolving is a defect.
2. **History is immutable.** Past versions of leaves and rubrics are never deleted.
3. **Compatibility is explicit.** What is compatible and what is not is declared, not assumed.
4. **Breaking changes are versioned.** Major-version bumps signal incompatibility.
5. **Migrations are auditable.** Every migration records author, reviewer, time, affected
   objects, validation results, and rollback strategy.
6. **Rollback or compensation must exist.** No migration may proceed without a defined
   reversal path.

**Source:** RFC-0015 §"Core Principles" (lines 8–21).

## Semantic Versioning

RFC-0015 applies MAJOR.MINOR.PATCH semantics across all Delphi objects:

| Increment | Triggers |
|---|---|
| PATCH | Documentation fixes, metadata fixes |
| MINOR | Backwards-compatible additions, new optional fields, new ontology types |
| MAJOR | Removed fields, renamed concepts, changed semantics |

**Source:** RFC-0015 §"Semantic Versioning" (lines 23–40).

## Versioned Object Types

RFC-0015 defines the complete set of objects that must be versioned:
- Leaves
- Ontology Packs
- Relationship Types
- Validation Rules
- Rubrics
- Capabilities
- Methodologies
- APIs
- Brain Manifests
- Federation Contracts

**Source:** RFC-0015 §"Versioned Objects" (lines 42–53).

## Leaf Versioning

Each update to a leaf creates a new version. The URN scheme is:

```
delphi://goatlab/decision/use-tigerbeetle@1.0.0
delphi://goatlab/decision/use-tigerbeetle@1.1.0
```

Previous versions remain accessible — history is immutable. This enables
point-in-time queries: "What did this Brain believe about TigerBeetle at
version 1.0.0?"

**Source:** RFC-0015 §"Leaf Versioning" (lines 55–66).

## Migration Types

RFC-0015 defines six migration categories:

| Type | Covers |
|---|---|
| Schema Migration | Database and API changes |
| Ontology Migration | Type and relationship changes |
| Leaf Migration | Knowledge transformations |
| Rubric Migration | Evaluation model changes |
| Federation Migration | Cross-brain compatibility changes |
| Projection Migration | Search, graph, and embedding rebuilds |

```ts
interface Migration {
  id: string
  name: string
  fromVersion: string
  toVersion: string
  migrationType: "SCHEMA" | "ONTOLOGY" | "LEAF" | "RUBRIC" | "FEDERATION" | "PROJECTION"
  reversible: boolean
  requiresReview: boolean
}
```

**Source:** RFC-0015 §"Migration Types" (lines 68–91) and §"Migration Contract" (lines 93–113).

## Migration Lifecycle

Every migration follows a seven-stage lifecycle:

```
Proposed → Reviewed → Approved → Dry Run → Executed → Validated → Published
```

The Dry Run stage is mandatory for all migrations — it calculates the set of
affected leaves, beliefs, decisions, rubrics, and brains and estimates risk
before any changes are committed.

**Source:** RFC-0015 §"Migration Lifecycle" (lines 115–123) and §"Dry Runs" (lines 125–141).

## Mandatory Impact Analysis

Before any migration executes, five questions must be answered:
1. What changes?
2. What breaks?
3. What depends on this?
4. Which Brains are affected?
5. Can we rollback?

This mandatory pre-flight analysis is the migration counterpart to the
dependency impact propagation defined in RFC-0022 (`what_breaks_if`).

**Source:** RFC-0015 §"Impact Analysis" (lines 143–155).

## Deprecation Lifecycle

Objects are not deleted immediately. RFC-0015 mandates a warning period:

```
Active → Deprecated → Warning Period → Removed
```

Immediate deletion is explicitly discouraged. This protects federated Brains
that may depend on a type or field without the owning Brain being aware.

**Source:** RFC-0015 §"Deprecation" (lines 157–165).

## Rollbacks and Compensating Migrations

Rollback is preferred when possible. When rollback is impossible (e.g., a
destructive transformation with no inverse), a compensating migration must be
created — a forward migration that restores the prior semantic state using a
different mechanism.

**Source:** RFC-0015 §"Rollbacks" (lines 167–174).

## Federation Compatibility Contracts

Brains advertise their compatibility surface:

```json
{
  "protocolVersion": "1.0.0",
  "ontologyVersion": "2.1.0"
}
```

Brains may support multiple protocol or ontology versions simultaneously to
allow federated consumers time to upgrade without being broken by a MAJOR bump.

**Source:** RFC-0015 §"Federation Compatibility" (lines 176–191).

## Projection Rebuilds

Search indexes, embeddings, graph projections, dependency graphs, and impact
graphs are all generated artifacts. They may always be fully rebuilt from
canonical leaves. This means a Projection Migration carries zero data-loss risk
— the worst case is a rebuild cost.

**Source:** RFC-0015 §"Projection Rebuilds" (lines 193–207).

## Audit Requirements

Every migration records: author, reviewer, execution time, affected objects,
validation results, and rollback strategy. This audit trail is permanent and
forms part of the Brain's provenance history.

**Source:** RFC-0015 §"Audit Requirements" (lines 209–219).

## Migration Debt

Migration debt accumulates when:
- Deprecated objects remain in active use.
- Unsupported protocol versions remain.
- Planned migrations are delayed.
- Compatibility windows expire.

Migration debt generates tasks that agents must resolve, consistent with the
general debt model (knowledge debt, navigation debt, evaluation debt, capability debt).

**Source:** RFC-0015 §"Migration Debt" (lines 221–231).

## Agent Responsibilities in Migration

Agents may: propose migrations, simulate migrations (dry run), estimate impact,
and validate outcomes. High-risk migrations (`requiresReview: true`) require
explicit human review before the Executed stage — the HITL gate from the
execution plane applies.

**Source:** RFC-0015 §"Agent Responsibilities" (lines 233–242).

## Success Criteria

RFC-0015 defines ten success criteria. The system succeeds when:
1. All important objects are versioned.
2. History is preserved.
3. Migrations are explicit.
4. Impact analysis is mandatory.
5. Compatibility is measurable.
6. Rollbacks are supported.
7. Federation survives upgrades.
8. Projections are rebuildable.
9. Auditability is preserved.
10. Delphi evolves without losing knowledge.

**Source:** RFC-0015 §"Success Criteria" (lines 244–258).

## Answered Questions

**Q: How does Delphi evolve its schema without breaking existing Brains?**
Through explicit versioned migrations. Every schema change is a Migration leaf
(type: SCHEMA). Breaking changes increment MAJOR. Brains advertise their
supported versions. A compatibility window gives consumers time to upgrade.
Mandatory dry runs calculate impact before execution.

**Q: What happens to a leaf when it is updated?**
A new version is created with an incremented version segment in its URN. The
old version remains accessible. History is immutable — past versions are never
deleted, enabling point-in-time access and rollback to prior knowledge states.

**Q: Can projections (embeddings, search indexes) be safely rebuilt?**
Yes. RFC-0015 explicitly classifies Projection Migrations as zero-data-loss
operations because all generated artifacts are derived from canonical leaves.
Rebuilding embeddings or search indexes from scratch is always safe — it is
expensive but not destructive.

**Q: When is human review required for a migration?**
When `requiresReview: true` is set in the Migration contract. RFC-0015 does
not enumerate exact triggers, but the general rule (from RFC-0000 §"Human
Review" and the HITL gate) is that migrations affecting critical knowledge,
federation contracts, or high-impact rubrics require review. Agents estimate
risk in the dry run; the review flag is set when risk exceeds a threshold.
