# RFC-0025 — Ontology Evolution & Governance
## How Delphi Learns New Concepts Without Breaking Existing Knowledge

Status: Draft

Depends On:
- RFC-0000 through RFC-0024

---

# Purpose

A static ontology eventually fails.

Reality changes.

Knowledge expands.

New concepts emerge.

New relationships appear.

Therefore:

Ontologies must evolve.

This RFC defines:

- Ontology Evolution
- Ontology Governance
- Ontology Proposals
- Ontology Migrations
- Ontology Debt
- Ontology Stewardship

---

# Core Principle

Knowledge evolves.

Ontology must evolve with it.

A Brain that cannot evolve its ontology will eventually become incapable of representing reality.

---

# Why This Exists

Examples:

Before 2007:

iPhone did not exist.

Before 2008:

Bitcoin did not exist.

Before 2022:

Generative AI was not a major category.

The ontology must adapt.

---

# The Ontology Problem

Every ontology eventually encounters:

Unknown concepts

Missing relationships

Ambiguous classifications

Duplicate concepts

Conflicting models

---

# Ontology Is Never Finished

Delphi assumes:

Every ontology is incomplete.

Ontology completeness is impossible.

Continuous refinement is expected.

---

# Ontology Packs

Ontologies are distributed as packs.

Examples:

@delphi/legal

@delphi/medicine

@delphi/history

@delphi/software

Brains may install multiple packs.

---

# Ontology Ownership

Every ontology pack should have:

Maintainers

Reviewers

Version History

Governance Rules

---

# Ontology Steward

Ontology Stewards are responsible for:

Gap detection

Duplicate detection

Migration proposals

Relationship proposals

Pack maintenance

May be:

Human

Agent

Hybrid

---

# Ontology Gaps

An ontology gap occurs when:

Knowledge exists

but

No suitable concept exists.

Example:

New technology emerges.

No ontology type exists.

Gap detected.

---

# Gap Detection

Detect gaps through:

Research

Agent observations

Classification failures

User feedback

Knowledge debt analysis

---

# Ontology Proposal

Changes begin as proposals.

Example:

Proposal:

Add concept:

"Foundation Model"

---

# Proposal Schema

```ts
interface OntologyProposal {
  id: string

  title: string

  rationale: string

  proposedBy: string

  impactAnalysis: string

  createdAt: string
}
```

---

# Proposal Types

New Concept

New Relationship

New Validation Rule

Merge Concepts

Split Concepts

Deprecation

Migration

---

# Review Process

Suggested flow:

Proposal
↓
Impact Analysis
↓
Discussion
↓
Approval
↓
Migration
↓
Release

---

# Ontology Versioning

Every ontology pack should be versioned.

Example:

@delphi/legal

v1.0.0

v1.1.0

v2.0.0

---

# Compatibility

Ontology changes should preserve compatibility whenever possible.

Preferred:

Additive Changes

Examples:

New concepts

New relationships

New metadata

---

# Breaking Changes

Examples:

Remove concept

Rename concept

Change meaning

Change relationship semantics

Require migration.

---

# Ontology Migration

Example:

Old:

DATABASE

New:

RELATIONAL_DATABASE

DOCUMENT_DATABASE

Migration required.

---

# Migration Tasks

Ontology changes may create:

Migration Tasks

Review Tasks

Research Tasks

Reclassification Tasks

---

# Ontology Debt

Ontology Debt occurs when:

Knowledge cannot be represented cleanly.

Examples:

Generic categories

Workarounds

Duplicate concepts

Poor classification

---

# Debt Signals

Examples:

High ambiguity

Repeated exceptions

Manual overrides

Frequent reclassification

---

# Ontology Health

Brains should expose:

Coverage

Ambiguity

Debt

Migration Backlog

Classification Success Rate

---

# Competing Ontologies

Multiple ontologies may coexist.

Example:

Medicine Ontology A

Medicine Ontology B

Both may be valid.

Delphi should support plurality.

---

# Local Extensions

Brains may extend ontologies.

Example:

@delphi/software

Extended by:

@goatlab/software

---

# Federation

Brains exchange:

Ontology References

not

Ontology Control

Brains remain sovereign.

---

# Agent Participation

Agents may:

Detect gaps

Suggest concepts

Suggest relationships

Generate migrations

Agents should not automatically approve ontology changes.

---

# Ontology Evolution Loop

Knowledge
↓
Gap Detection
↓
Proposal
↓
Review
↓
Approval
↓
Migration
↓
Release

Continuous process.

---

# Knowledge Preservation

Ontology evolution must preserve:

Meaning

Provenance

Lineage

History

---

# Historical Ontology

Old ontology versions remain accessible.

Example:

Legal Ontology 2020

Legal Ontology 2030

Both remain queryable.

---

# Query Impact

Ontology changes affect:

Indexes

Maps

Search

Classification

Evaluations

Queries

Impact analysis required.

---

# Ontology Lineage

Every ontology element should answer:

Where did I come from?

What replaced me?

What do I replace?

---

# Canonical Questions

What concepts are missing?

What concepts are duplicated?

Which ontology has highest debt?

What should be added next?

What breaks if this changes?

---

# Canonical Rules

1. Ontologies are never complete.
2. Ontologies must evolve.
3. Changes begin as proposals.
4. Evolution must be auditable.
5. Ontology debt should be measurable.
6. Compatibility is preferred.
7. Breaking changes require migration.
8. Multiple ontologies may coexist.
9. Brains remain sovereign.
10. History should be preserved.
11. Agents may propose changes.
12. Governance remains explicit.

---

# Success Criteria

1. Ontologies evolve safely.
2. Knowledge remains representable.
3. Gaps are detectable.
4. Debt is measurable.
5. Migrations are possible.
6. History is preserved.
7. Federation remains possible.
8. Competing ontologies can coexist.
9. Agents assist evolution.
10. Brains continuously improve their understanding of reality.
