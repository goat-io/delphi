---
title: Security and Access Control Model
region: Spec
kind: research
confidence: 0.72
sources:
  - rfcs/RFC-0000-Delphi-Constitution.md
  - rfcs/RFC-0009-Brains-and-Federation.md
  - rfcs/RFC-0002-Leaf-Protocol.md
  - rfcs/RFC-9999-Delphi-Specification-Index.md
---

# Security and Access Control Model

## Status in the Specification

RFC-9999 ("Delphi Specification Index") explicitly lists **Security & Access Control** as a
known open area with no dedicated RFC:

> "Security & Access Control — visibility enforcement, PII, federation trust details"

This research document synthesises the security model implied across existing RFCs and
identifies the load-bearing decisions the eventual RFC will need to make.

---

## Visibility Levels (RFC-0009)

RFC-0009 defines four leaf-level visibility levels:

| Level      | Meaning                                              |
|------------|------------------------------------------------------|
| `PRIVATE`  | Visible only within the owning Brain                |
| `INTERNAL` | Visible to members of the owning organisation       |
| `PARTNER`  | Visible to explicitly trust-listed partner Brains   |
| `PUBLIC`   | Visible to any Brain                                |

These are enumerated in `RFC-0009 § Visibility Levels`. Every leaf (RFC-0002) carries a
`visibility` field that gates access. The Brain is the **trust boundary** — no cross-Brain
write is permitted; only reads governed by federation policy are allowed.

**Belief:** Visibility is enforced at the Brain boundary, not the API boundary.
A federated Brain that receives a reference to a PRIVATE leaf must return an opaque
error, not the leaf content.

---

## Brain as Trust Boundary (RFC-0009)

RFC-0009 § Brain Boundaries states:

> "A Brain is a trust boundary. Inside: full control. Outside: federation contracts apply."

Implications:
- Agents operating inside a Brain are fully trusted.
- Agents operating from a remote Brain are governed by the **FederationPolicy** of the target Brain.
- No Brain can modify another Brain directly (RFC-0009 § Knowledge Sovereignty).

**Belief:** Authentication and authorisation for cross-Brain access is defined in the
FederationPolicy on the target Brain, not the requesting Brain.

---

## PII and Sensitive Data

No dedicated RFC governs PII yet. However, the leaf visibility model (RFC-0009) and the
provenance retention requirement (RFC-0004 § Provenance) create constraints:

- Evidence references must be retained for the provenance retention window even if the source
  asset is deleted for PII reasons.
- A `PRIVATE` leaf can represent PII-containing knowledge visible only inside the owning Brain.
- The candidate staging table (RFC-0031) must enforce visibility at promotion time — a
  PROMOTED candidate inherits the visibility of its target leaf.

**Open question:** How does Delphi handle a leaf that is PII at creation time but whose
content becomes public later? The answer likely requires a `reclassify_visibility` event
on the leaf, but no RFC specifies this transition.

---

## Federation Trust Model (RFC-0009)

RFC-0009 describes the federation model as **leaf-exchange over a shared protocol**, not
database-level access. The trust model has these load-bearing properties:

1. **No direct writes** — a remote Brain may request knowledge but never write to another Brain.
2. **Reference before copy** — RFC-0009 § Reference Model: "Brains should prefer references
   over copies." An `ExternalReference` (brainId + leafId + version) points to knowledge
   without duplicating it.
3. **Import as local copy** — when offline operation or customisation is needed, a Brain
   may import a copy. Imports create local leaves; updates from the source are not automatic.
4. **Forks** — RFC-0009 mentions forks as a federation primitive; a forked Brain diverges
   from its origin and may evolve independently.

**Belief:** Federation trust is uni-directional at the operation level. Reading from a
partner Brain requires that the target Brain's FederationPolicy lists the requester as an
authorised partner, but the reverse is not implied.

---

## Access Control for Agent Operations

RFC-0008 (Agents & Research Engine) and RFC-0029 (Task Execution Protocol) establish that
agents are temporary workers that operate on behalf of a Brain (RFC-0000 § Brains Own
Knowledge). The access model for agents follows from this:

- An agent inherits the access rights of the Brain it operates within.
- An agent that is executing a cross-Brain research task can only READ leaves that the
  target Brain exposes at the appropriate visibility level.
- Agents may not escalate their own access; privilege escalation is a protocol violation.

**Belief:** Agent authorisation derives entirely from Brain membership — there is no
per-agent permission model in the current specification.

---

## What the Missing RFC Must Define

Based on the gaps in the existing specification, the Security & Access Control RFC must
define at minimum:

1. **Authentication protocol** — how does a Brain authenticate a request from a remote Brain?
2. **Authorisation enforcement** — where in the call stack is the visibility check applied?
3. **PII lifecycle** — how does a leaf transition from PII-sensitive to public, and what
   happens to cached copies in partner Brains?
4. **Audit trail for access** — RFC-0031 defines an immutable state history for candidates;
   an analogous mechanism is needed for cross-Brain access.
5. **Federation revocation** — if a Brain revokes a partner's access, what happens to
   previously shared leaves that were imported (not just referenced)?

---

## Canonical Beliefs

1. Every leaf carries a visibility level; enforcement is the Brain's responsibility.
2. The Brain is the trust boundary; external agents operate under FederationPolicy.
3. No Brain can write to another Brain directly.
4. References are preferred over copies for federated knowledge.
5. Agent permissions derive from Brain membership, not per-agent grants.
6. Security & Access Control has no dedicated RFC yet — it is a known specification gap.
