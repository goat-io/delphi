---
name: dependency-impact-propagation
type: research
status: closed
region: Spec
topics:
  - dependencies
  - impact-analysis
  - propagation
  - knowledge-shockwaves
  - RFC-0022
sources:
  - rfcs/RFC-0022-Dependency-and-Impact-Propagation.md
  - rfcs/RFC-0003-Knowledge-and-Confidence-Theory.md
  - rfcs/RFC-0026-Tasks-and-Questions.md
---

# Dependency and Impact Propagation in Delphi

## Core Principle

Knowledge is a network, not a collection of documents. Every belief depends on
other beliefs; every decision depends on beliefs; every task depends on
decisions. A change in one belief may affect an entire Brain. Without
propagation, the Brain becomes internally inconsistent. With propagation, the
Brain remains coherent.

**Source:** RFC-0022 §"Core Principle" (lines 36–43) and
§"Why This Exists" (lines 77–93).

## Six Dependency Types

RFC-0022 §"Dependency Types" (lines 114–175) defines six categories:

| Type | Description | Example |
|---|---|---|
| **Logical** | Belief A requires Belief B to remain valid | Orbital Mechanics depends on Gravity |
| **Evidence** | A belief depends on specific evidence | Claim depends on Research Paper |
| **Decision** | A decision depends on supporting beliefs | Use TigerBeetle depends on Reliability Assessment |
| **Evaluation** | An evaluation depends on criteria | Architecture Review depends on Architecture Rubric |
| **Ontology** | A concept depends on its classifications | Roman Law depends on Legal Ontology |
| **Index** | Indexes depend on the leaves they summarize | Indexes are regenerated when leaves change |

## Dependency Graph Structure

Dependencies form a **directed graph** (RFC-0022 §"Dependency Graph", lines
184–198):

```
Gravity
↓
Orbital Mechanics
↓
Space Navigation
↓
GPS
```

Every belief must expose both *what it depends on* and *who depends on it*
(RFC-0022 §"Reverse Dependencies", lines 200–214). This bidirectionality is
what makes impact analysis computable.

## Impact Analysis: Answering "What Breaks If This Changes?"

Impact is categorized at three levels (RFC-0022 §"Impact Categories",
lines 228–265):

- **Direct Impact**: immediate first-order dependencies (Gravity → Orbital
  Mechanics)
- **Indirect Impact**: transitive dependencies (Gravity → Orbital Mechanics →
  GPS)
- **Systemic Impact**: large-scale cross-domain effects (Gravity affects
  Physics, Engineering, Astronomy, Navigation)

Every change should expose an **Impact Radius** (Low / Medium / High /
Critical) so agents can triage before traversing the full graph.

**Source:** RFC-0022 §"Impact Radius" (lines 421–432).

## Confidence Propagation Rule

Confidence can only remain equal or **decrease** through a dependency chain.
A dependent belief cannot be more reliable than its foundations without
independent evidence of its own.

Example (RFC-0022 §"Confidence Propagation", lines 268–289):
```
Belief A: confidence 0.95
  └── Belief B (depends on A): confidence 0.90
        If A drops to 0.50 → B requires recalculation
```

The Dependency Engine traverses the graph, identifies all consumers, and
queues them for confidence recalculation.

**Source:** RFC-0022 §"Propagation Rules" (lines 291–299).

## Knowledge Shockwaves

A *Knowledge Shockwave* is a cascading update triggered by a significant
belief change (RFC-0022 §"Confidence Shockwaves", lines 303–318):

```
New Scientific Evidence
→ Theory Update
→ Belief Updates
→ Decision Reassessment
→ Research Tasks Generated
```

The medical analogy from the RFC (§"Knowledge Shockwaves", lines 402–420):
```
New Medical Study
→ Treatment Belief
→ Clinical Guidelines
→ Hospital Procedures
→ Training Materials
```

Shockwaves propagate until the graph boundary or until all consumers have
been recalculated.

## Contradictions Propagate

New contradictions trigger (RFC-0022 §"Contradiction Propagation",
lines 319–330):
- Confidence reductions on the contradicted belief
- Research tasks (`trigger: CONTRADICTION`)
- Review tasks on dependent decisions and evaluations
- Evaluation refreshes

Delphi does not suppress contradictions; it propagates them as first-class
events.

## What Triggers Automatic Research Tasks

RFC-0022 §"Research Triggering" (lines 388–400) specifies four triggers:

1. Confidence drops below threshold → `RESEARCH` task
2. Contradiction appears → `REVIEW` task
3. Dependencies become stale → `RESEARCH` task
4. Evidence expires → `RESEARCH` task

All task creation follows the origin model in RFC-0026 and is deduplicated
before insertion.

## The Dependency Engine

The runtime component responsible for propagation is the **Dependency Engine**
(RFC-0022 §"Propagation Engine", lines 501–517):

Responsibilities:
- Track all dependency relationships
- Calculate impact radius for any belief change
- Trigger confidence recalculation on consumers
- Generate tasks for impacted decisions and evaluations
- Refresh affected indexes

## Critical Beliefs and Fragile Beliefs

RFC-0022 §"Critical Beliefs" (lines 438–453) identifies beliefs with
unusually high fan-out (many dependents) as *critical*. Examples include
foundational axioms like Gravity or a company's core strategy. Critical
beliefs require active monitoring.

*Fragile beliefs* (RFC-0022 §"Fragile Beliefs", lines 472–480) depend on few
sources, weak evidence, or single points of failure. Fragility is surfaced in
Brain health metrics alongside orphan beliefs (no evidence, no provenance,
no dependencies).

## Federation Propagation

Changes can cross Brain boundaries (RFC-0022 §"Federation Propagation",
lines 547–559):

```
Legal Brain → Compliance Brain → Company Brain
```

Cross-Brain propagation must remain traceable — every shockwave that crosses
a Brain boundary must leave a record so the full impact chain can be audited.

## Canonical Questions This Answers

- *What is a dependency in Delphi?* — A directed relationship where A requires
  B to remain valid. Six typed dependency variants cover logical, evidence,
  decision, evaluation, ontology, and index relationships.
- *How does impact propagate?* — The Dependency Engine traverses the directed
  graph from the changed node, recalculates confidence on all consumers, and
  generates tasks where thresholds are breached.
- *Can confidence increase through propagation?* — No; it can only decrease
  (or stay equal) unless the dependent belief has independent evidence.
- *What is a Knowledge Shockwave?* — A cascading confidence update that
  propagates from a changed belief through its transitive dependents, ending
  in automatic task creation.
- *What are critical beliefs?* — Beliefs with high fan-out (many dependents)
  that require active monitoring because their failure creates systemic impact.
- *Does propagation cross Brain boundaries?* — Yes, in federated setups;
  cross-Brain propagation is traceable but is a post-MVP capability.
