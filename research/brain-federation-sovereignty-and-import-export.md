---
title: Brain Federation, Sovereignty, and Import/Export
region: Spec
kind: research
confidence: 0.75
sources:
  - rfcs/RFC-0009-Brains-and-Federation.md
  - rfcs/RFC-0002-Leaf-Protocol.md
  - rfcs/RFC-0003-Knowledge-and-Confidence-Theory.md
  - rfcs/RFC-0014-APIs-and-Contracts.md
  - rfcs/RFC-0025-Ontology-Evolution-and-Governance.md
---

# Brain Federation, Sovereignty, and Import/Export

## Knowledge Sovereignty (RFC-0009)

RFC-0009 establishes the foundational rule of the federation model:

> "Brains own their knowledge. Brains share protocols. Not ownership."

This is called **Knowledge Sovereignty**. It means:

- A Brain decides what to share, what to hide, what to export, what to import.
- No Brain can modify another Brain directly.
- Federation is exchange of knowledge objects, not database access.

**Belief:** The Delphi federation model is a peer protocol, not a client-server model.
Neither Brain is "authoritative" over the other; each is authoritative within its own boundary.

---

## Brain Identity and Structure (RFC-0009)

Every Brain requires:

```ts
interface Brain {
  id:                     string
  name:                   string
  owner:                  string
  description:            string
  supportedOntologyPacks: string[]
  federationPolicy:       FederationPolicy
}
```

The `federationPolicy` governs what remote Brains can request and what the owning Brain
will expose. The `id` is globally unique and stable across federation; it is the anchor
for cross-Brain `ExternalReference` objects.

---

## Reference vs. Import (RFC-0009)

RFC-0009 § Reference Model:

> "Brains should prefer references over copies."

An **ExternalReference** is a pointer:

```ts
interface ExternalReference {
  brainId: string
  leafId:  string
  version: string
}
```

An import creates a **local copy** of the remote leaf. The two modes serve different needs:

| Mode       | Use Case                                        | Freshness           |
|------------|-------------------------------------------------|---------------------|
| Reference  | Remote leaf is stable, online access guaranteed | Always current      |
| Import     | Offline operation, customisation, preservation  | Snapshot at import  |

**Belief:** References are preferred because they avoid the dual-maintenance problem.
When Brain B updates a leaf, Brain A's reference automatically reflects the current state.
An imported copy diverges from the source and requires explicit re-import to update.

---

## Visibility Enforcement in Federation (RFC-0009)

RFC-0009 § Visibility Levels:

```ts
type Visibility = "PRIVATE" | "INTERNAL" | "PARTNER" | "PUBLIC"
```

In a federation exchange:
- `PUBLIC` leaves are accessible to any Brain.
- `PARTNER` leaves are accessible to Brains listed in the FederationPolicy's partner list.
- `INTERNAL` leaves are accessible only to agents within the owning organisation.
- `PRIVATE` leaves are never shared; a request for a PRIVATE leaf returns an opaque error.

**Belief:** The visibility check is performed by the **target Brain**, not the requesting
Brain. The target Brain is the only one with knowledge of whether a leaf is PARTNER-accessible
to the requester.

---

## Confidence in Federated Context (RFC-0009, RFC-0003)

When Brain A imports a leaf from Brain B, it imports the leaf's confidence at the time
of import. Brain A may disagree with Brain B's confidence assessment. RFC-0009 implies
(and RFC-0003 supports) that each Brain maintains its own confidence assessment:

- Brain A may lower the imported leaf's confidence if its own evidence contradicts it.
- Brain A may raise confidence if it has additional corroborating evidence.
- The source Brain's confidence is preserved as a provenance field, not overridden.

**Belief:** Imported leaves carry a `sourceBrainConfidence` field for provenance, but the
local Brain's confidence assessment governs its own knowledge operations.

---

## Forks (RFC-0009)

RFC-0009 mentions forks as a federation primitive. A fork is a Brain that:

1. Starts as a copy of another Brain (the origin).
2. Diverges independently — its evolution is no longer tied to the origin.
3. May re-federate with the origin later via a merge proposal (analogous to a git pull request).

Forks are the Delphi equivalent of independent epistemological communities that share a
common starting point but may reach different conclusions from the same evidence.

**Belief:** Forks represent legitimate epistemic divergence. Two Brains may both be
internally consistent while disagreeing on the confidence of shared beliefs.

---

## Synchronisation and Conflict Resolution (RFC-0009)

RFC-0009 § Synchronisation covers the case where Brain A has an imported copy of Brain B's
leaf, and Brain B later updates that leaf. Conflict resolution rules:

1. If Brain A has made no local modifications to the imported leaf, it may auto-update.
2. If Brain A has added local evidence or modified confidence, the update is flagged for review.
3. If Brain B has deprecated or superseded the leaf, Brain A receives a notification that its
   local copy references a deprecated source.

Conflict resolution is not automatic for modified imports — it generates a Task (RFC-0026).

---

## MVP Boundary (DELPHI-MVP-0001)

The MVP specification (DELPHI-MVP-0001) explicitly limits the first implementation to:

> "Single Brain. No Federation. No Multi-Brain Coordination."

This means all federation mechanics described in RFC-0009 are **post-MVP**. The MVP
builds the protocol and data model that federation will use, but does not implement
cross-Brain exchange. The ExternalReference schema exists in the data model from day one
to avoid migration pain when federation is implemented.

---

## Brain Export Format (RFC-0009, brain/ directory structure)

The Delphi self-brain (this repo) uses a versioned export format in the `brain/` directory:
JSONL files containing leaves, relationships, evidence, assets, and events. This format
is the canonical Brain export format for:

- Git-committable diffs
- Import/export between Brain instances
- Bootstrap replay (`pnpm brain:bootstrap`)

**Belief:** The JSONL export format is the reference implementation of RFC-0009's import/export
model. Any federation transport must be capable of producing and consuming this format.

---

## Canonical Beliefs

1. Brains are sovereign: no Brain can modify another Brain directly (RFC-0009).
2. Federation exchanges knowledge objects over a shared protocol, not database access.
3. References are preferred over imports; imports are for offline/customisation use.
4. Visibility enforcement is the target Brain's responsibility, not the requester's.
5. Each Brain maintains its own confidence assessment for imported leaves.
6. Forks represent legitimate epistemic divergence; they may diverge permanently.
7. Synchronisation conflicts on modified imported leaves generate Tasks, not auto-resolution.
8. The MVP excludes federation; post-MVP only.
9. The JSONL brain/ export format is the canonical import/export representation.
10. `ExternalReference` (brainId + leafId + version) is the pointer type for cross-Brain knowledge.
