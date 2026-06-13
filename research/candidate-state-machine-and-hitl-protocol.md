---
name: candidate-state-machine-and-hitl-protocol
type: research
status: closed
region: Spec
topics:
  - candidate-staging
  - state-machine
  - hitl
  - review-queue
  - back-pressure
  - ttl
  - audit-trail
  - RFC-0031
  - RFC-0027
sources:
  - rfcs/RFC-0031-Candidate-Staging-Protocol.md
  - rfcs/RFC-0027-Extraction-and-Entity-Resolution.md
  - rfcs/RFC-0004-Evidence-and-Provenance.md
---

# Candidate State Machine and HITL Protocol

## What RFC-0031 Adds to RFC-0027

RFC-0027 defines what a Candidate is, how canonicalization works, and how
entity resolution determines whether a candidate becomes a new leaf or merges
into an existing one. RFC-0031 fills the remaining gap: the Candidate's own
lifecycle as a persistent entity between extraction and canonicalization.

The two RFCs are complementary:
- RFC-0027: "How does a candidate become a leaf?"
- RFC-0031: "How does a candidate persist, age, and get reviewed?"

**Source:** RFC-0031 §"Relationship to RFC-0027".

---

## The Seven States

RFC-0031 defines a `CandidateState` with exactly seven values:

| State        | Meaning                                              |
|--------------|------------------------------------------------------|
| `PENDING`    | Created; awaiting normalization                      |
| `NORMALIZING`| Canonicalization in progress                         |
| `RESOLVING`  | Entity resolution in progress                        |
| `PROMOTED`   | Became a leaf or evidence (terminal)                 |
| `REJECTED`   | Human steward rejected (terminal)                    |
| `FLAGGED`    | Needs human review before resolution can proceed     |
| `EXPIRED`    | TTL elapsed; retired without promotion (terminal)    |

PROMOTED, REJECTED, and EXPIRED are the three terminal states. No backward
transitions are permitted.

**Source:** RFC-0031 §"The Candidate as a Staging Entity", `CandidateState` type.

---

## The State Machine

```
PENDING
  │
  ▼
NORMALIZING
  │
  ▼
RESOLVING ──────────────────────► FLAGGED ──► PROMOTED
  │                                               │
  ├──────────────────────────────► PROMOTED       │
  │                                               │
  └──────────────────────────────► EXPIRED ◄──── (TTL elapsed while FLAGGED)
                                                  │
                                      REJECTED ◄──┘
```

Valid transitions table:

| From         | To           | Trigger                                      |
|--------------|--------------|----------------------------------------------|
| PENDING      | NORMALIZING  | Normalization job claimed                    |
| NORMALIZING  | RESOLVING    | Normalization complete                       |
| NORMALIZING  | FLAGGED      | Normalization failed or low confidence       |
| RESOLVING    | PROMOTED     | Resolution outcome: MERGED, CREATED, LINKED  |
| RESOLVING    | FLAGGED      | Resolution outcome: UNSURE                   |
| FLAGGED      | PROMOTED     | Steward approves                             |
| FLAGGED      | REJECTED     | Steward rejects                              |
| FLAGGED      | EXPIRED      | TTL elapsed before review                   |
| RESOLVING    | EXPIRED      | TTL elapsed before resolution completed      |

**Source:** RFC-0031 §"State Machine".

---

## Time-to-Live (TTL)

Every Candidate receives an `expiresAt` timestamp at creation.

Default TTL values:

| State           | Default TTL                        |
|-----------------|------------------------------------|
| PENDING         | 24 hours from creation             |
| RESOLVING       | 30 minutes from creation           |
| FLAGGED         | 72 hours from flagging             |

TTL is configuration, not protocol — Brains may adjust per extraction context.

A Candidate that reaches `expiresAt` without reaching a terminal state
transitions to EXPIRED. EXPIRED candidates are NOT deleted — they are archived
with their full state history. An EXPIRED candidate records Knowledge Debt:
evidence was discarded, and the review queue was not serviced in time.

**Source:** RFC-0031 §"Time-to-Live".

---

## The HITL Review Queue

FLAGGED candidates form the human review queue. The queue is not a separate
store — it is a view over the staging table filtered by `state = 'FLAGGED'`,
ordered oldest-first.

A steward may take one of three actions on a FLAGGED candidate:

### Approve
The candidate transitions FLAGGED → PROMOTED. Resolution proceeds as if
adjudication returned DISTINCT or MERGED. The steward may optionally specify
the resolution outcome: merge into an existing leaf, create a new leaf, or
link to an existing leaf.

### Reject
The candidate transitions FLAGGED → REJECTED. No leaf is created. The
rejection reason is recorded in `reviewNote`. Rejection reasons inform
extraction prompt tuning over time.

### Defer
The TTL resets by one interval (FLAGGED → FLAGGED with new `expiresAt`).
Maximum deferrals: 3. After the third deferral, the candidate transitions
to EXPIRED regardless of TTL.

**Source:** RFC-0031 §"Review Queue", §"Review Actions".

---

## Back-Pressure and Batch Throughput

Extraction produces candidates in batches. Back-pressure prevents the review
queue from growing unboundedly.

MVP defaults:
- Max candidates per asset: 500
- Max FLAGGED candidates per Brain: 1000

When the FLAGGED limit is reached:
- New candidates that would be FLAGGED are instead EXPIRED immediately.
- Asset ingestion is paused.
- An alert is emitted: "review queue saturation".

These limits are configuration, not protocol.

**Source:** RFC-0031 §"Batch Throughput".

---

## Storage Contract

Candidates live in a **dedicated staging table** — never in the leaf table.
The staging table guarantees:

1. Candidates queryable by state, assetId, brainId, and expiresAt.
2. `stateHistory` is append-only.
3. Terminal-state candidates may be archived but must not be deleted
   within the provenance retention window (RFC-0004).
4. The table exposes live counts of PENDING, FLAGGED, and EXPIRED candidates.

Required indexes:
- `(brainId, state)`
- `(expiresAt)` WHERE state NOT IN terminal states
- `(assetId)`

**Source:** RFC-0031 §"Storage Contract".

---

## Audit Trail

Every state transition is recorded in `stateHistory` (append-only). The
audit trail answers:
- Who created this candidate?
- Who flagged it?
- Who reviewed it?
- What was the review rationale?
- How long did it spend in each state?

Audit trails are required for HITL accountability, extraction quality analysis,
and provenance tracking when a promoted candidate becomes evidence (RFC-0004).

**Source:** RFC-0031 §"Audit Trail".

---

## Promotion Flow

When a Candidate is promoted, the resolution outcome determines the leaf action:
- `MERGED` → EvidenceRef attached to existing leaf
- `CREATED` → new Leaf created
- `LINKED` → new Relationship created

The staged candidate records the leafId or relationshipId it produced.
Promotion is idempotent: promoting the same candidate twice is a no-op recorded
in stateHistory with reason "duplicate promotion attempt; no-op".

**Source:** RFC-0031 §"Promotion Flow".

---

## Health Metrics

| Metric                            | Healthy Signal                              |
|-----------------------------------|---------------------------------------------|
| Staging latency (PENDING→terminal)| Falls as pipeline matures                   |
| Flag rate                         | Falls as extraction prompts improve         |
| Review queue depth (FLAGGED)      | Bounded; not growing                        |
| Expiry rate                       | Near zero; rising = review debt             |
| Promotion rate                    | Stable; major drops signal pipeline failure |
| Rejection rate                    | Low; rising = extraction quality issue      |

A growing review queue is a Navigation Debt signal. A high expiry rate is
a Stewardship Debt signal.

**Source:** RFC-0031 §"Candidate Metrics".

---

## Answers to Open Questions

**Q: What distinguishes a FLAGGED candidate from a REJECTED one?**
FLAGGED means human review is required before a decision can be made —
the outcome is pending. REJECTED is a terminal state where a steward has
definitively determined the candidate is invalid, hallucinated, or out of
scope. A candidate starts as FLAGGED; the steward's rejection action moves
it to REJECTED. FLAGGED is reversible (via approve or defer); REJECTED is
not.
**Source:** RFC-0031 §"State Machine", §"Review Actions".

**Q: What happens to candidates during a bulk ingestion?**
Back-pressure pauses ingestion when the FLAGGED queue saturates (default
limit: 1000 FLAGGED candidates). New candidates that would be FLAGGED are
immediately EXPIRED instead. An alert fires. The ingestion batch does not
proceed until the queue is partially cleared by steward review.
**Source:** RFC-0031 §"Batch Throughput".

**Q: Can a candidate move from RESOLVING backward to NORMALIZING?**
No. State transitions are strictly forward-only. No backward transitions
are permitted under any circumstances. This ensures the audit trail is
monotonic and tamper-evident.
**Source:** RFC-0031 §"State Machine".

**Q: How does the review queue prevent knowledge loss from expired candidates?**
EXPIRED candidates are archived, not deleted, within the provenance retention
window (RFC-0004). The expiry records Knowledge Debt — evidence was discarded
without review. Metrics surfaces the expiry rate as an operational signal, so
stewards can see when the queue is being under-serviced. The debt is not lost;
it is tracked and generates alerting.
**Source:** RFC-0031 §"Time-to-Live", §"Candidate Metrics".
