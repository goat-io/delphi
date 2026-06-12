# RFC-0015 — Migration & Versioning
## How Delphi Evolves Without Breaking Brains

Status: Draft

## Purpose
Define how knowledge, ontology, rubrics, APIs, capabilities, and brains evolve safely over time while preserving provenance, compatibility, and history.

---

# Core Principles

1. Evolution is mandatory.
2. History is immutable.
3. Compatibility is explicit.
4. Breaking changes are versioned.
5. Migrations are auditable.
6. Rollback or compensation must exist.

---

# Semantic Versioning

MAJOR.MINOR.PATCH

PATCH
- Documentation fixes
- Metadata fixes

MINOR
- Backwards-compatible additions
- New optional fields
- New ontology types

MAJOR
- Removed fields
- Renamed concepts
- Changed semantics

---

# Versioned Objects

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

---

# Leaf Versioning

Each update creates a new version.

Example:

delphi://goatlab/decision/use-tigerbeetle@1.0.0
delphi://goatlab/decision/use-tigerbeetle@1.1.0

Previous versions remain accessible.

---

# Migration Types

## Schema Migration
Database and API changes.

## Ontology Migration
Type and relationship changes.

## Leaf Migration
Knowledge transformations.

## Rubric Migration
Evaluation model changes.

## Federation Migration
Cross-brain compatibility changes.

## Projection Migration
Search, graph and embedding rebuilds.

---

# Migration Contract

```ts
interface Migration {
  id: string
  name: string

  fromVersion: string
  toVersion: string

  migrationType:
    | "SCHEMA"
    | "ONTOLOGY"
    | "LEAF"
    | "RUBRIC"
    | "FEDERATION"
    | "PROJECTION"

  reversible: boolean
  requiresReview: boolean
}
```

---

# Migration Lifecycle

Proposed
→ Reviewed
→ Approved
→ Dry Run
→ Executed
→ Validated
→ Published

---

# Dry Runs

Before execution:

- affected leaves
- affected beliefs
- affected decisions
- affected rubrics
- affected brains
- estimated risk

must be calculated.

---

# Impact Analysis

Before migration answer:

- What changes?
- What breaks?
- What depends on this?
- Which brains are affected?
- Can we rollback?

---

# Deprecation

Lifecycle:

Active
→ Deprecated
→ Warning Period
→ Removed

Immediate deletion is discouraged.

---

# Rollbacks

Preferred when possible.

If rollback is impossible:

Create a compensating migration.

---

# Federation Compatibility

Brains advertise:

```json
{
  "protocolVersion": "1.0.0",
  "ontologyVersion": "2.1.0"
}
```

Brains may support multiple versions simultaneously.

---

# Projection Rebuilds

Generated artifacts may always be rebuilt:

- Search indexes
- Embeddings
- Graph projections
- Dependency graphs
- Impact graphs

Canonical leaves remain unchanged.

---

# Audit Requirements

Every migration records:

- author
- reviewer
- execution time
- affected objects
- validation results
- rollback strategy

---

# Migration Debt

Occurs when:

- deprecated objects remain
- unsupported versions remain
- migrations are delayed
- compatibility windows expire

Migration debt creates tasks.

---

# Agent Responsibilities

Agents may:

- propose migrations
- simulate migrations
- estimate impact
- validate outcomes

High-risk migrations require review.

---

# Success Criteria

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
