---
name: brain-sovereignty-and-federation-mvp-boundaries
type: research
status: closed
region: Spec
topics:
  - brain-federation
  - knowledge-sovereignty
  - multi-brain
  - federation-policy
  - mvp-scope
  - import-export
  - RFC-0009
  - RFC-0014
  - DELPHI-MVP-0001
sources:
  - rfcs/RFC-0009-Brains-and-Federation.md
  - rfcs/RFC-0014-APIs-and-Contracts.md
  - rfcs/DELPHI-MVP-0001-First-Implementation-Plan.md
  - rfcs/RFC-9999-Delphi-Specification-Index.md
---

# Brain Sovereignty and Federation: MVP Boundaries

## What a Brain Is

A Brain is an independent Delphi knowledge system. It is the top-level
organizational unit — not a namespace, not a table, not a folder. A Brain
owns its leaves, evidence, confidence scores, ontology extensions, evaluations,
decisions, and research agenda.

The critical distinction: Brains share *protocols*, not ownership. The Delphi
protocol defines how Brains communicate; it does not define what any Brain
must believe.

**Source:** RFC-0009 §"Core Principle" and §"What Is A Brain?".

## Brain Identity Schema

```ts
interface Brain {
  id: string                           // globally unique
  name: string                         // human-readable label
  owner: string                        // owning entity or organization
  description: string
  supportedOntologyPacks: string[]     // ontology packs installed
  federationPolicy: FederationPolicy   // how this Brain shares knowledge
}
```

The `federationPolicy` controls what the Brain exports and from whom it
accepts imports. A Brain with `federationPolicy: ISOLATED` is a stand-alone
system with no federation connections.

**Source:** RFC-0009 §"Brain Identity".

## Knowledge Sovereignty

Sovereignty means a Brain cannot be forced to accept knowledge from another
Brain. All federation is opt-in. The import of beliefs from a peer Brain:

1. Creates new leaves tagged with the source Brain ID
2. Assigns initial confidence using the peer Brain's reliability score
3. Does not override the local Brain's existing beliefs on the same topic
4. Can be revoked: imported beliefs can be marked `EXTERNAL_RETRACTED`

This preserves the local Brain's epistemic integrity. A Careium Brain can
import medical research from a World Medical Brain without surrendering
control over which beliefs it ultimately endorses.

**Source:** RFC-0009 §"Knowledge Sovereignty" and §"Import Semantics".

## Federation Modes

RFC-0009 defines four federation modes:

| Mode | Description |
|---|---|
| `ISOLATED` | No federation. MVP default. |
| `IMPORT_ONLY` | Accepts knowledge from trusted peers; does not export. |
| `EXPORT_ONLY` | Exports to permitted consumers; does not import. |
| `BILATERAL` | Full bidirectional federation with trusted peers. |

Every production Brain starts `ISOLATED` and opts into federation explicitly.

**Source:** RFC-0009 §"Federation Modes".

## What Federation Actually Transfers

When a Brain imports from a peer, it receives:

- **Leaves**: beliefs, objects, questions (not Tasks or internal state)
- **Evidence**: provenance records pointing to the peer Brain's assets
- **Confidence**: the peer's confidence score, used as an input to local
  recalculation (not accepted as-is)
- **Relationships**: dependency and support edges between imported leaves

What is NOT transferred:
- Local evaluations (the local Brain must re-evaluate imported beliefs)
- Tasks (tasks are internal work; they do not travel between Brains)
- Decisions (decisions reflect the local Brain's context; they are not portable)

**Source:** RFC-0009 §"Federation Protocol" and §"What Transfers".

## Confidence Discounting on Import

Imported beliefs receive a trust discount. The local Brain's confidence
formula applies a `sourceReliability` factor derived from the peer Brain's
reputation:

```
importedConfidence = peerConfidence × peerReliabilityFactor
```

A new, unvetted peer Brain might have `peerReliabilityFactor: 0.50`. A
long-established, frequently accurate peer might have `0.90`. This prevents
a compromised peer from injecting high-confidence false beliefs.

**Source:** RFC-0009 §"Confidence Discounting" and RFC-0003 §"sourceReliability".

## Conflict Resolution

When an imported belief contradicts an existing local belief, both are retained.
A `CONTRADICTS` relationship is created between them. The local Brain's
existing belief is not overwritten.

Conflict resolution is a research task, not an automatic merge. The knowledge
economics system (RFC-0011) may prioritize resolving high-impact contradictions.

**Source:** RFC-0009 §"Conflict Resolution".

## MVP Scope: Single Brain, No Federation

RFC-9999 §"MVP Scope" and DELPHI-MVP-0001 §"Constraints" are explicit:

> Single Brain. No Federation. No Multi-Brain Coordination.

The MVP implementation supports exactly one Brain backed by a single PostgreSQL
database. Federation infrastructure (federation registry, trust scoring, import
pipelines) is designed in RFC-0009 and RFC-0014 but is not implemented in the
first release.

This is a deliberate scoping decision. Federation introduces complexity
(distributed trust, conflict propagation, cross-Brain versioning) that would
delay the core knowledge loop. The MVP proves the loop works for a single Brain
before extending to multiple Brains.

**Source:** DELPHI-MVP-0001 §"Constraints" and RFC-9999 §"MVP Scope".

## Post-MVP Federation Roadmap

RFC-0017 §"Phase 2" identifies federation as the second major milestone after
the MVP. The implementation sequence:

1. Export API (Brain → JSONL/JSON-LD export, RFC-0014)
2. Import pipeline (peer Brain JSONL → local candidates, RFC-0009)
3. Trust registry (peer reliability scoring, RFC-0009)
4. Conflict detection and resolution tasks (RFC-0022 propagation for imported beliefs)
5. Bilateral sync (incremental delta sync, RFC-0009 §"Synchronization")

**Source:** RFC-0017 §"Phase 2: Federation".

## Answers to Open Questions

**Q: Can the same Leaf appear in two Brains?**
Yes, as a cross-Brain reference. A local Brain can hold a reference leaf that
points to a leaf in a peer Brain. The reference carries the peer Brain ID and
the remote leaf ID. The local Brain does not copy the content; it links to it.
Full import (copying content + creating local evidence) is a separate operation.
**Source:** RFC-0009 §"Cross-Brain References".

**Q: If a peer Brain retracts a belief it previously exported, what happens?**
The local Brain receives a retraction event. Imported leaves from that peer are
marked `EXTERNAL_RETRACTED`. Their confidence drops to 0.0 and they generate
Knowledge Debt tasks for review. They are not automatically deleted.
**Source:** RFC-0009 §"Retraction Protocol".

**Q: Does each Brain have its own ontology?**
Each Brain has a base ontology (shared Delphi core types) plus domain-specific
ontology packs listed in `supportedOntologyPacks`. A Brain can extend its
ontology locally without affecting peer Brains. Ontology divergence between
federated Brains is managed by the Ontology Governance system (RFC-0025).
**Source:** RFC-0009 §"Ontology per Brain" and RFC-0025 §"Federation Ontology".

**Q: Is the git-based brain/ export in this repo a form of federation?**
It is a degenerate case: a single Brain exporting its canonical state to a
version-controlled JSONL format. The bootstrap process imports from this export.
It is not federation in the RFC-0009 sense (no trust scoring, no peer
negotiation), but it demonstrates the same export/import pattern at a smaller
scale.
**Source:** DELPHI-MVP-0003 §"Delphi Builds Delphi" and RFC-0009 §"Export Format".
