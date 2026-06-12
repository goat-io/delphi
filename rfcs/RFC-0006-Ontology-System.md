# RFC-0006 — Ontology System
## How Delphi Classifies Reality

Status: Draft
Depends On:
- RFC-0000
- RFC-0001
- RFC-0002
- RFC-0003
- RFC-0004
- RFC-0005

---

# Purpose

Knowledge without classification becomes chaos.

Ontology exists to provide structure.

This RFC defines:

- Ontology Types
- Relationship Types
- Validation Rules
- Ontology Packs
- Ontology Gaps
- Ontology Evolution
- Ontology Governance
- Ontology Migration

---

# Core Principle

Ontology is not special.

Ontology is knowledge.

Ontology is represented using the same primitives as everything else.

Therefore:

- Types are leaves
- Relationships are leaves
- Validation rules are leaves
- Migrations are leaves

---

# Why Ontology Exists

Ontology answers:

What is this?

How is it classified?

What relationships are valid?

How should agents reason about it?

---

# Ontology Objects

Core ontology objects:

- Ontology Type
- Relationship Type
- Validation Rule
- Ontology Pack
- Ontology Migration

---

# Ontology Type

Examples:

- Person
- Organization
- Law
- Concept
- Belief
- Decision
- Rubric

Ontology types are leaves.

---

# Ontology Type Schema

```ts
interface OntologyType {
  id: string

  name: string

  description: string

  parentTypes: string[]

  aliases: string[]

  status: string
}
```

---

# Relationship Types

Relationships define valid graph connections.

Examples:

- SUPPORTS
- CONTRADICTS
- DEPENDS_ON
- IS_A
- PART_OF
- EVALUATES
- DERIVED_FROM

Relationship types are leaves.

---

# Relationship Schema

```ts
interface RelationshipType {
  id: string

  name: string

  sourceTypes: string[]

  targetTypes: string[]

  description: string
}
```

---

# Validation Rules

Validation rules constrain ontology usage.

Examples:

Decision
must reference
Belief

Evaluation
must reference
Rubric

Validation rules are leaves.

---

# Validation Rule Schema

```ts
interface ValidationRule {
  id: string

  name: string

  description: string

  ruleExpression: string
}
```

---

# Ontology Packs

Delphi Core provides only a minimal ontology.

Domains extend it through Ontology Packs.

Examples:

@delphi/core

@delphi/company

@delphi/legal

@delphi/science

@delphi/design

---

# Brain-Specific Packs

Brains can create custom packs.

Examples:

@goatlab/brain

@careium/platform

@walliver/payments

These remain sovereign.

---

# Ontology Inheritance

Ontology packs may extend other packs.

Example:

@delphi/legal
→ extends
@delphi/core

@goatlab/compliance
→ extends
@delphi/legal

---

# Ontology Compatibility

Brains should advertise:

- Supported ontology packs
- Supported versions

Compatibility enables federation.

---

# Ontology Gaps

An Ontology Gap occurs when knowledge cannot be classified correctly.

Examples:

Unknown Type

Unknown Relationship

Missing Concept

Missing Category

---

# Gap Workflow

Gap Detected
→ Proposal
→ Research
→ Review
→ Approval
→ Migration

---

# Self-Healing Ontology

Agents continuously inspect:

- Uncategorized leaves
- Excessive "Other" usage
- Relationship misuse
- Ambiguous classifications

These create Ontology Gap tasks.

---

# Ontology Evolution

No ontology is complete.

Ontologies evolve through use.

Examples:

New Industry

New Technology

New Legal Framework

New Scientific Domain

---

# Ontology Governance

Ontology changes should be reviewed.

Suggested roles:

- Ontology Steward
- Domain Expert
- Research Agent
- Auditor

---

# Ontology Migration

Ontology changes should be versioned.

Examples:

Type Rename

Relationship Rename

Type Merge

Type Split

---

# Migration Schema

```ts
interface OntologyMigration {
  id: string

  fromVersion: string

  toVersion: string

  description: string

  migrationPlan: string
}
```

---

# Type Merge Example

Artificial Intelligence

Machine Intelligence

Merged Into:

Artificial Intelligence

---

# Type Split Example

Company

Split Into:

Organization

Commercial Organization

Non-Profit Organization

---

# Ontology Confidence

Ontology itself can be evaluated.

Questions:

Is this type useful?

Is this relationship ambiguous?

Does this improve classification?

Ontology should have confidence.

---

# Ontology Debt

Ontology debt occurs when:

- Too many uncategorized leaves
- Ambiguous types
- Duplicate concepts
- Broken relationships
- Missing validation rules

Ontology debt generates tasks.

---

# Ontology Lineage

Ontology should explain its ancestry.

Example:

Civil Law

Derived From:

Roman Law

---

# Federation

Brains may:

Import Ontologies

Reference Ontologies

Extend Ontologies

Fork Ontologies

---

# Canonical Questions

What is this?

Why is it classified this way?

Which ontology pack defines it?

Which version introduced it?

Which migration changed it?

What depends on it?

Should it evolve?

---

# Success Criteria

A Delphi system successfully implements this RFC when:

1. Ontology is represented as leaves.
2. Ontology packs are supported.
3. Ontology gaps are detectable.
4. Ontology evolution is versioned.
5. Ontology migrations are traceable.
6. Ontology debt is measurable.
7. Brain-specific extensions are supported.
8. Compatibility can be evaluated.
9. Agents can propose ontology changes.
10. The ontology improves over time.
