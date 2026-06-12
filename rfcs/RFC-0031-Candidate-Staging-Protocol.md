# RFC-0031 — Candidate Staging Protocol
## How Proposed Knowledge Is Held, Reviewed, and Resolved

Status: Draft

Depends On:
- RFC-0002
- RFC-0003
- RFC-0004
- RFC-0020
- RFC-0026
- RFC-0027

---

# Purpose

RFC-0027 establishes Candidates as the output of extraction.

It defines what a Candidate is and how entity resolution works.

It does not define:

- The Candidate's own lifecycle as a persistent entity
- The state machine governing candidate transitions
- Storage requirements for the staging area
- Time-to-live and expiry semantics
- The HITL review protocol for FLAGGED candidates
- Batch throughput limits and back-pressure rules
- Audit trail requirements for all state transitions

This RFC fills that gap.

A Candidate is not a leaf.

A Candidate is not ephemeral.

A Candidate is a first-class staging entity that exists between
extraction and canonicalization — with its own state machine,
storage contract, and review protocol.

---

# Core Principle

Candidates are temporary by design.

Every Candidate must resolve to a terminal state.

Nothing in the staging area lives forever.

A Candidate that cannot resolve automatically
must be reviewable by a human steward.

A Candidate that is never reviewed must eventually expire.

Stale staging areas are Knowledge Debt.

---

# The Candidate as a Staging Entity

RFC-0027 defines the Candidate interface.

This RFC extends it with lifecycle fields:

```ts
interface StagedCandidate extends Candidate {
  // Lifecycle
  state: CandidateState

  // Timestamps
  createdAt: string      // ISO-8601
  updatedAt: string      // ISO-8601
  expiresAt: string      // ISO-8601; set at creation

  // Audit
  stateHistory: StateTransition[]

  // Review
  reviewerId?: string
  reviewNote?: string
  reviewedAt?: string
}

type CandidateState =
  | "PENDING"       // created, awaiting normalization
  | "NORMALIZING"   // canonicalization in progress
  | "RESOLVING"     // entity resolution in progress
  | "PROMOTED"      // became a leaf or evidence
  | "REJECTED"      // human steward rejected; not promoted
  | "FLAGGED"       // needs human review before resolution
  | "EXPIRED"       // TTL elapsed; retired without promotion

interface StateTransition {
  from: CandidateState
  to: CandidateState
  at: string         // ISO-8601
  actorId: string    // agent ref or steward id
  reason?: string
}
```

---

# State Machine

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
  └──────────────────────────────► EXPIRED ◄──── (if TTL elapses while FLAGGED)
                                                  │
                                      REJECTED ◄──┘
```

Valid transitions:

| From         | To           | Trigger                                      |
|--------------|--------------|----------------------------------------------|
| PENDING      | NORMALIZING  | Normalization job claimed                    |
| NORMALIZING  | RESOLVING    | Normalization complete                       |
| NORMALIZING  | FLAGGED      | Normalization failed or low confidence       |
| RESOLVING    | PROMOTED     | Resolution outcome: MERGED, CREATED, LINKED  |
| RESOLVING    | FLAGGED      | Resolution outcome: UNSURE                   |
| FLAGGED      | PROMOTED     | Steward approves                             |
| FLAGGED      | REJECTED     | Steward rejects                              |
| FLAGGED      | EXPIRED      | TTL elapsed before review                    |
| RESOLVING    | EXPIRED      | TTL elapsed before resolution completed      |

No state may transition backward.

PROMOTED, REJECTED, and EXPIRED are terminal.

---

# Time-to-Live

Every Candidate receives an `expiresAt` timestamp at creation.

Default TTL:

```
FLAGGED candidates:   72 hours from flagging
RESOLVING candidates: 30 minutes from creation
PENDING candidates:   24 hours from creation
```

TTL is configuration, not protocol.

Brains may adjust TTL per extraction context.

A Candidate that reaches `expiresAt` without reaching a terminal state
transitions to EXPIRED.

EXPIRED candidates are not deleted.

EXPIRED candidates are archived with full state history.

An EXPIRED candidate records Knowledge Debt:

- Evidence was discarded.
- The review queue was not serviced in time.

---

# Storage Contract

Candidates live in a dedicated staging table.

Candidates are NOT stored in the leaf table.

The staging table has the following guarantees:

1. Candidates are queryable by state, assetId, brainId, and expiresAt.
2. stateHistory is append-only.
3. Terminal-state candidates may be archived but must not be deleted
   within the provenance retention window (RFC-0004).
4. The staging table exposes a count of PENDING, FLAGGED, and EXPIRED
   candidates as operational metrics.

Indexes required:

- (brainId, state)
- (expiresAt) WHERE state NOT IN ('PROMOTED','REJECTED','EXPIRED')
- (assetId)

---

# Review Queue

FLAGGED candidates form the human review queue.

The review queue is not a separate store.

The review queue is a view over the staging table:

```sql
SELECT * FROM candidate_staging
WHERE state = 'FLAGGED'
  AND brain_id = $brainId
ORDER BY created_at ASC
```

Oldest FLAGGED candidates are reviewed first.

## Review Actions

A steward may take one of three actions on a FLAGGED candidate:

### Approve

The steward confirms the candidate is valid.

The candidate transitions FLAGGED → PROMOTED.

Resolution proceeds as if adjudication returned DISTINCT or MERGED.

The steward may optionally specify the resolution outcome:

- Merge into an existing leaf (specify leafId)
- Create a new leaf
- Link to an existing leaf

### Reject

The steward determines the candidate is invalid, hallucinated,
or out of scope.

The candidate transitions FLAGGED → REJECTED.

No leaf is created.

The rejection reason is recorded in reviewNote.

Rejection reasons inform extraction prompt tuning.

### Defer

The steward may defer review without accepting or rejecting.

Deferral resets the TTL by one interval.

Deferral is recorded as a state transition (FLAGGED → FLAGGED)
with a new expiresAt.

Maximum deferrals: 3.

After the third deferral the candidate transitions FLAGGED → EXPIRED
regardless of TTL.

---

# Batch Throughput

Extraction produces candidates in batches.

Back-pressure prevents the review queue from growing unboundedly.

## Limits (MVP defaults)

```
Max candidates per asset:         500
Max FLAGGED candidates per brain: 1000
```

When the FLAGGED limit is reached:

New candidates that would be FLAGGED are instead EXPIRED immediately.

The asset ingestion is paused.

An alert is emitted: review queue saturation.

Limits are configuration, not protocol.

---

# Audit Trail

Every state transition is recorded in stateHistory.

The audit trail is immutable.

The audit trail answers:

- Who created this candidate?
- Who flagged it?
- Who reviewed it?
- What was the review rationale?
- How long did it spend in each state?

Audit trails are required for:

- HITL accountability
- Extraction quality analysis
- Provenance (RFC-0004) when a promoted candidate becomes evidence

---

# Candidate Metrics

The following metrics must be tracked per brain:

| Metric                         | Healthy Signal                         |
|--------------------------------|----------------------------------------|
| Staging latency (PENDING→terminal) | Falls as pipeline matures          |
| Flag rate                      | Falls as extraction prompts improve    |
| Review queue depth (FLAGGED)   | Bounded; not growing                   |
| Expiry rate                    | Near zero; rising = review debt        |
| Promotion rate                 | Stable; major drops signal pipeline failure |
| Rejection rate                 | Low; rising = extraction quality issue |

A growing review queue is a navigation debt signal.

A high expiry rate is a stewardship debt signal.

---

# Promotion Flow

When a Candidate is promoted:

1. The resolution outcome determines the leaf action:
   - MERGED → EvidenceRef attached to existing leaf
   - CREATED → new Leaf created
   - LINKED → new Relationship created

2. The staged candidate records the leafId or relationshipId it produced.

3. The candidate state becomes PROMOTED.

4. The candidate remains in the staging table for the retention period.

Promotion is idempotent:

Promoting the same candidate twice is a no-op.

The second promotion attempt is recorded in stateHistory with reason
"duplicate promotion attempt; no-op".

---

# Relationship to RFC-0027

RFC-0027 defines:

- What a Candidate is (schema)
- Canonicalization rules
- Entity resolution pipeline
- Resolution outcomes
- Merge semantics
- Hallucination guards

This RFC defines:

- Candidate lifecycle (state machine)
- Candidate persistence (storage contract)
- Candidate expiry (TTL)
- HITL review protocol (review queue + steward actions)
- Batch back-pressure
- Audit trail

These two RFCs are complementary.

RFC-0027 answers: "How does a candidate become a leaf?"

This RFC answers: "How does a candidate persist, age, and get reviewed?"

---

# Canonical Rules

1. Every Candidate is assigned a state at creation: PENDING.
2. State transitions are append-only; no backward transitions.
3. PROMOTED, REJECTED, and EXPIRED are terminal states.
4. Every Candidate carries an expiresAt timestamp from creation.
5. A Candidate that reaches expiresAt without reaching a terminal state becomes EXPIRED.
6. FLAGGED candidates form the human review queue, ordered oldest-first.
7. A steward may Approve, Reject, or Defer (max 3 deferrals) a FLAGGED candidate.
8. Deferral resets the TTL; the third deferral forces EXPIRED.
9. Candidates are stored in a dedicated staging table, not the leaf table.
10. Staging table records are retained for the provenance retention window.
11. Back-pressure halts ingestion when the FLAGGED queue saturates.
12. Every state transition is recorded in the immutable stateHistory.
13. Promotion is idempotent; duplicate promotions are no-ops.
14. A growing review queue is Knowledge Debt and must be surfaced as a metric.

---

# Success Criteria

1. Every Candidate reaches a terminal state — no Candidates remain
   in non-terminal states indefinitely.
2. FLAGGED candidates older than 72 hours that have not been reviewed
   transition to EXPIRED automatically.
3. A steward can view, approve, reject, and defer FLAGGED candidates
   through the review queue interface.
4. Promotion creates the correct leaf, evidence, or relationship
   without duplication.
5. The staging table exposes live queue depth and expiry rate metrics.
6. Back-pressure halts ingestion before the FLAGGED queue overflows.
7. The full audit trail for any candidate can be retrieved by id.
8. Rejection reasons are aggregated and exposed for extraction tuning.
9. Re-promoting an already-PROMOTED candidate is a no-op with a log entry.
10. Candidate storage does not interfere with the leaf storage schema.
