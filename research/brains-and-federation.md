---
name: brains-and-federation
type: research
status: closed
region: Spec
topics:
  - brain
  - federation
  - sovereignty
  - knowledge-sovereignty
  - import
  - export
  - fork
  - RFC-0009
sources:
  - rfcs/RFC-0009-Brains-and-Federation.md
  - rfcs/RFC-0001-Delphi-Meta-Model.md
---

# Brains and Federation: Knowledge Sovereignty and Distributed Intelligence

## Core Principle: Knowledge Sovereignty

Brains own their knowledge. Brains share protocols, not ownership. No Brain
can modify another Brain directly. A Brain is a trust boundary: inside it,
full control; outside it, federation contracts apply.

This principle is called **Knowledge Sovereignty** and is the foundational
design constraint of RFC-0009.

**Source:** RFC-0009 §"Core Principle" (lines 39–49) and
§"Brain Boundaries" (lines 99–110).

## What Is a Brain?

A Brain is an independent Delphi knowledge system. Examples:
- Goatlab Brain
- Careium Brain
- Personal Brain
- Legal Brain
- Medical Brain
- World Brain

A Brain owns: Leaves, Evidence, Confidence, Ontology Extensions, Evaluations,
Decisions, Research Agenda.

```ts
interface Brain {
  id: string
  name: string
  owner: string
  description: string
  supportedOntologyPacks: string[]
  federationPolicy: FederationPolicy
}
```

**Source:** RFC-0009 §"What Is A Brain?" (lines 52–73) and
§"Brain Identity" (lines 79–95).

## Four Visibility Levels

```ts
type Visibility =
  | "PRIVATE"    // Brain does not expose any knowledge externally
  | "INTERNAL"   // Visible to the organization
  | "PARTNER"    // Visible to federated partners
  | "PUBLIC"     // Visible to all
```

**Source:** RFC-0009 §"Visibility Levels" (lines 129–137).

## The Federation Model

Brains communicate through leaves (knowledge objects). They never exchange
databases. Brains exchange knowledge objects: leaves, ontology packs, rubrics,
evaluations, research findings.

**Source:** RFC-0009 §"Federation Model" (lines 141–148).

## References vs Copies

Brains should prefer references over copies. Example:

```
Goatlab Brain references World Brain → Roman Law
instead of duplicating it
```

```ts
interface ExternalReference {
  brainId: string
  leafId: string
  version: string
}
```

References avoid stale copies. When the World Brain updates Roman Law, the
Goatlab Brain can follow the reference to the latest version.

**Source:** RFC-0009 §"Reference Model" (lines 151–165) and
§"External References" (lines 167–178).

## Four Import Strategies

When a Brain needs local copies (for offline operation, customization, or
historical preservation):

| Strategy | Description |
|---|---|
| **Reference Only** | No local copy; always reads from source Brain |
| **Read Through** | Caches reads locally; invalidated by source changes |
| **Snapshot Import** | Creates a versioned local copy at a point in time |
| **Continuous Synchronization** | Ongoing sync with source Brain |

**Source:** RFC-0009 §"Import Strategies" (lines 194–204).

## What Can Be Exported

Brains may export:
- Leaves
- Ontology Packs
- Rubrics
- Evaluations
- Research Findings

They never export the Brain database itself.

**Source:** RFC-0009 §"Exports" (lines 208–222).

## Forking

Brains may fork knowledge. Forks preserve lineage, record ancestry, and
remain compatible where possible. Example:

```
World Brain → Legal Ontology
forked into
Company Legal Ontology
```

Fork rules: forks are traceable back to their origin. This is implemented
through the `derivedFrom` field in Provenance (RFC-0002).

**Source:** RFC-0009 §"Forking" (lines 224–246).

## Synchronization

Synchronization is optional and must be explicit. Strategies range from
manual to continuous. RFC-0009 does not mandate a specific sync protocol —
it mandates that sync be controllable by the Brain owner.

**Source:** RFC-0009 §"Synchronization" (lines 249–268).

## Federation Policy

Every Brain declares its federation policy:

```ts
interface FederationPolicy {
  allowImports: boolean
  allowExports: boolean
  allowReferences: boolean
  allowForks: boolean
}
```

**Source:** RFC-0009 §"Federation Policies" (lines 297–309).

## Conflict Resolution

Conflicts are expected in federated systems (Brain A says X; Brain B says
NOT X). RFC-0009 acknowledges this and routes conflicts through the standard
Delphi contradiction mechanism: both beliefs remain with their respective
evidence, confidence scores reflect the contradiction risk, and open questions
are generated for resolution.

**Source:** RFC-0009 §"Conflict Resolution" (lines 312+).

## MVP Scope

The current implementation targets a **single Brain** with no federation.
RFC-0009 is a specification for future phases. The MVP does not implement:
- Multi-Brain coordination
- Cross-Brain references
- Ontology Pack distribution
- Synchronization protocols

**Source:** AGENTS.md §"MVP Scope" and RFC-0009 as a future-phase spec.

## Canonical Questions This Answers

- *Can one Brain modify another Brain's knowledge directly?* — No. Knowledge
  Sovereignty means no Brain can modify another. Brains exchange knowledge
  objects through federation contracts.
- *When should a Brain import vs reference another Brain's knowledge?* —
  Reference is preferred. Import only for offline operation, customization,
  or historical preservation.
- *What can be federated between Brains?* — Leaves, Ontology Packs, Rubrics,
  Evaluations, Research Findings. Never raw database access.
- *How are conflicts resolved between federated Brains?* — Through the
  standard contradiction mechanism: both beliefs survive with evidence,
  contradiction risk reduces confidence, and questions are generated.
- *Is federation implemented in the MVP?* — No. The MVP is a single Brain.
  Federation is a future-phase capability defined in RFC-0009.
- *What is a fork in Delphi?* — A fork creates a local copy of another
  Brain's knowledge with preserved lineage, allowing the forking Brain to
  customize without modifying the source.
