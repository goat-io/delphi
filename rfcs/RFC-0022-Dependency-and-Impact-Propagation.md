# RFC-0022 — Dependency & Impact Propagation
## Understanding What Changes When Knowledge Changes

Status: Draft

Depends On:
- RFC-0000 through RFC-0021

---

# Purpose

Knowledge does not exist in isolation.

Every belief depends on other beliefs.

Every decision depends on beliefs.

Every task depends on decisions.

Therefore:

A change in one belief may affect an entire Brain.

This RFC defines:

- Dependency Modeling
- Impact Analysis
- Confidence Propagation
- Change Propagation
- Knowledge Shockwaves
- Research Triggering

---

# Core Principle

Knowledge is a network.

Not a collection of documents.

Understanding requires understanding dependencies.

---

# The Gravity Example

Suppose:

Belief:

Gravity exists.

Confidence:

0.999999

Many other beliefs depend on gravity.

Example:

Gravity
↓
Orbital Mechanics
↓
Satellite Navigation
↓
GPS Systems

If gravity becomes uncertain:

Thousands of dependent beliefs become uncertain.

---

# Why This Exists

Without propagation:

Belief changes.

Nothing else updates.

The Brain becomes inconsistent.

With propagation:

Belief changes.

Dependent knowledge is re-evaluated.

The Brain remains coherent.

---

# Dependency Definition

A dependency exists when:

A requires B to remain valid.

Example:

Belief:

GPS positioning is accurate.

Depends On:

Satellite Navigation

---

# Dependency Types

## Logical Dependency

A belief requires another belief.

Example:

Orbital Mechanics
depends on
Gravity

---

## Evidence Dependency

A belief depends on evidence.

Example:

Claim
depends on
Research Paper

---

## Decision Dependency

A decision depends on beliefs.

Example:

Use TigerBeetle
depends on
Reliability Assessment

---

## Evaluation Dependency

An evaluation depends on criteria.

Example:

Architecture Review
depends on
Architecture Rubric

---

## Ontology Dependency

A concept depends on classifications.

Example:

Roman Law
depends on
Legal Ontology

---

## Index Dependency

Indexes depend on leaves.

Indexes are regenerated when leaves change.

---

# Dependency Graph

Dependencies form a directed graph.

Example:

Gravity
↓
Orbital Mechanics
↓
Space Navigation
↓
GPS

---

# Reverse Dependencies

Every belief should answer:

Who depends on me?

Example:

Gravity

Consumers:

- Orbital Mechanics
- Engineering Models
- Space Navigation

---

# Impact Analysis

Impact Analysis answers:

If this changes,
what breaks?

---

# Impact Categories

## Direct Impact

Immediate dependencies.

Example:

Gravity
→ Orbital Mechanics

---

## Indirect Impact

Transitive dependencies.

Example:

Gravity
→ Orbital Mechanics
→ GPS

---

## Systemic Impact

Large-scale impact.

Example:

Gravity affects:

Physics
Engineering
Astronomy
Navigation

---

# Confidence Propagation

Confidence should propagate.

Example:

Belief A:

0.95

Belief B depends on A.

Belief B:

0.90

If A drops to:

0.50

B may need recalculation.

---

# Propagation Rules

Suggested:

Confidence can only remain equal or decrease through dependency chains.

Dependent beliefs cannot be more reliable than their foundations without independent evidence.

---

# Confidence Shockwaves

A major belief change creates a shockwave.

Example:

New scientific evidence
↓
Theory Update
↓
Belief Updates
↓
Decision Reassessment
↓
Research Tasks

---

# Contradiction Propagation

New contradictions may trigger:

Confidence reductions

Research tasks

Review tasks

Evaluation refreshes

---

# Decision Impact

Every decision should expose:

Beliefs used

Evidence used

Evaluations used

---

# Decision Reassessment

If supporting beliefs change:

Decision status becomes:

REVIEW_REQUIRED

---

# Evaluation Impact

Evaluations should track dependencies.

Example:

Architecture Review

Depends On:

- Scalability Analysis
- Reliability Assessment

Changes trigger re-evaluation.

---

# Task Impact

Tasks may become:

Blocked

Invalid

Outdated

Reprioritized

based on dependency changes.

---

# Research Triggering

Create research tasks when:

Confidence drops below threshold.

Contradictions appear.

Dependencies become stale.

Evidence expires.

---

# Knowledge Shockwaves

A Knowledge Shockwave is a propagated change.

Example:

New Medical Study
↓
Treatment Belief
↓
Clinical Guidelines
↓
Hospital Procedures
↓
Training Materials

---

# Impact Radius

Every change should expose:

Impact Radius

Example:

Low

Medium

High

Critical

---

# Critical Beliefs

Some beliefs have unusually high impact.

Examples:

Gravity

Evolution

Legal Constitution

Core Company Strategy

Critical beliefs require monitoring.

---

# Dependency Health

Brains should expose:

Dependency Density

Critical Beliefs

Fragile Beliefs

Orphan Beliefs

Propagation Backlog

---

# Fragile Beliefs

A fragile belief depends on:

Few sources

Weak evidence

Single points of failure

Fragility should be visible.

---

# Orphan Beliefs

Beliefs with:

No evidence

No dependencies

No provenance

should be flagged.

---

# Propagation Engine

Runtime component:

Dependency Engine

Responsibilities:

Track dependencies

Calculate impact

Trigger updates

Generate tasks

---

# Index Propagation

Indexes depend on knowledge.

Belief changes
↓
Index Refresh

Required.

---

# Research Propagation

Knowledge gaps create:

Research Tasks

Research Tasks create:

Evidence

Evidence updates:

Beliefs

---

# Federation Propagation

Changes may cross Brain boundaries.

Example:

Legal Brain
↓
Compliance Brain
↓
Company Brain

Propagation should remain traceable.

---

# Canonical Questions

What supports this?

What depends on this?

What breaks if this changes?

How far does impact travel?

Which decisions are affected?

Which evaluations are affected?

Which indexes are affected?

---

# Dependency Query Examples

Show all dependencies of:

Gravity

Show all consumers of:

Roman Law

Show all decisions affected by:

TigerBeetle Reliability

Show all indexes impacted by:

Medical Guideline Update

---

# Canonical Rules

1. Knowledge is a network.
2. Dependencies are first-class.
3. Every belief should expose dependencies.
4. Every belief should expose consumers.
5. Confidence propagates.
6. Contradictions propagate.
7. Decisions track supporting beliefs.
8. Evaluations track dependencies.
9. Indexes track knowledge dependencies.
10. Impact must be traceable.
11. Research should be triggered automatically.
12. Brains should remain internally coherent.

---

# Success Criteria

1. Dependency graphs exist.
2. Impact analysis works.
3. Confidence propagation works.
4. Contradictions trigger reviews.
5. Decisions become re-evaluable.
6. Evaluations become re-evaluable.
7. Indexes refresh automatically.
8. Knowledge shockwaves are visible.
9. Research tasks are generated.
10. Brain consistency improves over time.
11. Critical beliefs are identifiable.
12. A Brain can answer:
   "What breaks if this becomes false?"
