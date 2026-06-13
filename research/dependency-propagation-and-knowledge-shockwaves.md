---
name: dependency-propagation-and-knowledge-shockwaves
type: research
status: closed
region: Spec
topics:
  - dependency-propagation
  - impact-analysis
  - knowledge-shockwaves
  - confidence-cascades
  - transitive-dependencies
  - what-breaks-if
  - research-triggering
  - RFC-0022
  - RFC-0003
sources:
  - rfcs/RFC-0022-Dependency-and-Impact-Propagation.md
  - rfcs/RFC-0003-Knowledge-and-Confidence-Theory.md
---

# Dependency Propagation and Knowledge Shockwaves

## Why Dependencies Are Central to Delphi

RFC-0022 §"Core Principle" states:

> Knowledge is a network. Not a collection of documents.
> Understanding requires understanding dependencies.

Without propagation, a belief changes but nothing else updates, leaving
the Brain inconsistent. With propagation, dependent knowledge is
re-evaluated and the Brain remains coherent.

**Source:** RFC-0022 §"Core Principle" and §"Why This Exists".

## The Dependency Model

RFC-0022 §"Dependency Definition" defines: a dependency exists when
A requires B to remain valid.

Types of dependency relationships:

- **REQUIRES** — A cannot be true if B is false (logical dependency)
- **SUPPORTS** — B provides evidence for A (evidential dependency)
- **CONTRADICTS** — B, if true, reduces confidence in A
- **DERIVES_FROM** — A was logically derived from B
- **CITES** — A references B as a source

These are stored as Relationships (RFC-0001, RFC-0004) with the leaf
graph tracking which leaves depend on which other leaves.

**Source:** RFC-0022 §"Dependency Types".

## The Gravity Example

RFC-0022 §"The Gravity Example" illustrates the cascade effect:

```
Gravity (confidence: 0.999999)
↓ SUPPORTS
Orbital Mechanics
↓ SUPPORTS
Satellite Navigation
↓ SUPPORTS
GPS Systems
```

If the Gravity leaf's confidence drops (suppose new contradicting
evidence emerges), every downstream belief — Orbital Mechanics,
Satellite Navigation, GPS Systems — must be re-evaluated. Thousands
of beliefs in a large Brain could be affected by a single high-centrality
belief change.

**Source:** RFC-0022 §"The Gravity Example".

## Confidence Propagation Algorithm

RFC-0022 §"Confidence Propagation" defines the propagation algorithm:

1. A belief B changes (confidence updated or evidence added/removed).
2. All leaves that have a REQUIRES or SUPPORTS edge pointing TO B are
   added to a re-evaluation queue.
3. Each re-evaluated leaf recomputes its confidence using the RFC-0003
   formula with updated upstream confidence values.
4. If a re-evaluated leaf's confidence changes by more than the configured
   threshold (default: ±0.05), its own dependents are added to the queue.
5. The process repeats until the queue is empty (fixed-point convergence).

Circular dependencies are detected and handled by breaking the cycle at
the weakest edge (lowest confidence dependency). Circular dependencies
generate a RESEARCH task to investigate the circularity.

**Source:** RFC-0022 §"Confidence Propagation Algorithm".

## Knowledge Shockwaves

RFC-0022 §"Knowledge Shockwaves" names the phenomenon: when a highly
connected belief changes, the cascade of re-evaluations is called a
knowledge shockwave. A shockwave can propagate across the entire Brain
if the originating belief has high transitive fanout.

Properties of a shockwave:
- **Breadth** — how many leaves are re-evaluated
- **Depth** — how many hops from the origin
- **Magnitude** — average confidence delta across all affected leaves
- **Cost** — total computation cost of re-evaluation

Shockwaves are logged as events on the Brain for observability. A
shockwave affecting more than 100 leaves generates an alert.

**Source:** RFC-0022 §"Knowledge Shockwaves".

## The `what_breaks_if` Query

The `what_breaks_if` MCP tool (RFC-0007 navigation interface) runs a
forward traversal of the dependency graph from a given leaf and returns
the set of beliefs, decisions, and tasks that would be invalidated or
degraded if that leaf were false or had its confidence reduced to zero.

This answers: "If I act on information that turns out to be wrong, what
else is wrong?"

**Source:** RFC-0022 §"Impact Analysis Queries"; RFC-0007 §"MCP Interface".

## Research Triggering

RFC-0022 §"Research Triggering" specifies when dependency propagation
triggers the creation of new tasks:

1. A belief's confidence drops below the **critical confidence threshold**
   (default: 0.40) → a RESEARCH task is created targeting that belief.

2. A CONTRADICTS relationship is created between two high-confidence
   beliefs → a RESEARCH task of type CONTRADICTION_RESOLUTION is created.

3. A belief in the top-N by centrality (most depended-upon) changes by
   more than a configured delta → a full impact sweep task is queued.

4. A shockwave breadth exceeds the configured alert threshold → a task
   is created for a human steward to review the cascade.

**Source:** RFC-0022 §"Research Triggering".

## Confidence Dependency Decay

RFC-0022 §"Confidence Dependency Decay" extends RFC-0003's freshness
model with a structural decay rule:

A belief that depends on a freshness-decayed belief also decays, even
if its direct evidence is fresh. This prevents stale foundational beliefs
from propping up apparently fresh downstream beliefs.

The decay is not proportional — it is applied as a floor: a belief's
confidence cannot exceed the confidence of its least-confident required
dependency (weighted by edge strength).

**Source:** RFC-0022 §"Confidence Dependency Decay".

## Why Impact Analysis Is a First-Class Feature

RFC-0022 §"Why This Exists" frames impact analysis as essential for an
epistemic agent:

Without impact analysis, agents make decisions based on beliefs they cannot
audit. An agent citing "GPS is reliable" as evidence for a decision cannot
know, without dependency traversal, that this belief ultimately depends on
a disputed physics claim.

Impact analysis is the mechanism that makes Delphi's trust model honest:
confidence values reflect the full evidential chain, not just the immediate
evidence.

**Source:** RFC-0022 §"Why This Exists".

## Canonical Questions This Answers

- *What is a knowledge shockwave?* — A cascade of confidence re-evaluations
  triggered by a change to a highly connected belief, potentially affecting
  many downstream leaves.
- *How does confidence propagate through the dependency graph?* — Leaves
  with REQUIRES or SUPPORTS edges to the changed leaf are re-evaluated;
  their dependents are re-evaluated if they change by more than the threshold.
- *What triggers a research task from dependency propagation?* — A belief
  dropping below the critical confidence threshold (0.40), a CONTRADICTS
  edge between high-confidence beliefs, or a shockwave exceeding alert breadth.
- *What does `what_breaks_if` do?* — Runs a forward traversal from a leaf
  and returns what would be invalidated if that leaf were false.
- *Can a belief have high confidence even if its dependencies are stale?* —
  No. A belief's confidence cannot exceed its least-confident required
  dependency. Structural decay prevents this.
- *What causes circular dependencies?* — They can emerge when two beliefs
  each support or require the other. Detected at propagation time; the
  cycle is broken at the weakest edge and a research task is created.
- *What is the propagation threshold?* — The default minimum confidence
  delta (±0.05) below which a re-evaluated belief's change does not
  propagate further.
