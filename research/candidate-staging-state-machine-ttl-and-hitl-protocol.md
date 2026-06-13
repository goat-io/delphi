---
name: candidate-staging-state-machine-ttl-and-hitl-protocol
type: research
status: closed
region: Spec
topics:
  - candidate-staging
  - state-machine
  - TTL
  - HITL
  - staged-candidate
  - normalization
  - entity-resolution
  - review-queue
  - RFC-0031
  - RFC-0027
sources:
  - rfcs/RFC-0031-Candidate-Staging-Protocol.md
  - rfcs/RFC-0027-Extraction-and-Entity-Resolution.md
---

# Candidate Staging: State Machine, TTL, and HITL Protocol

## The Gap RFC-0031 Fills

RFC-0027 defines Candidates as the output of extraction and establishes
the entity resolution algorithm. It does NOT define:

- The Candidate's own lifecycle as a persistent entity
- The state machine governing candidate transitions
- Storage requirements for the staging area
- Time-to-live and expiry semantics
- The HITL review protocol for FLAGGED candidates
- Batch throughput limits and back-pressure rules
- Audit trail requirements for all state transitions

RFC-0031 fills this gap. A Candidate is NOT a leaf and NOT ephemeral.
It is a first-class staging entity existing between extraction and
canonicalization.

**Source:** RFC-0031 §"Purpose".

## Core Principle: Every Candidate Must Reach a Terminal State

RFC-0031 §"Core Principle":

> Candidates are temporary by design. Every Candidate must resolve to
> a terminal state. Nothing in the staging area lives forever.
>
> A Candidate that cannot resolve automatically must be reviewable by
> a human steward. A Candidate that is never reviewed must eventually
> expire. Stale staging areas are Knowledge Debt.

**Source:** RFC-0031 §"Core Principle".

## The Staged Candidate Schema

RFC-0031 extends the RFC-0027 Candidate with lifecycle fields:

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

**Source:** RFC-0031 §"The Candidate as a Staging Entity".

## The State Machine

```
PENDING
  ↓
NORMALIZING
  ↓
RESOLVING ──────────────────────────► FLAGGED ──► PROMOTED
  │                                                 │
  ├─────────────────────────────────────► PROMOTED  │
  │                                                 │
  └─────────────────────────────────────► EXPIRED ◄─(TTL elapses while FLAGGED)
                                          │
                                        REJECTED ◄── (steward rejects)
```

Transitions summary:
- **PENDING → NORMALIZING** — Triggered by the extractor picking up the candidate
- **NORMALIZING → RESOLVING** — Canonicalization complete; ready for entity resolution
- **RESOLVING → PROMOTED** — Auto-resolution succeeded; leaf or evidence created
- **RESOLVING → FLAGGED** — Resolution uncertain; sent to HITL queue
- **RESOLVING → EXPIRED** — TTL elapsed before resolution (rare)
- **FLAGGED → PROMOTED** — Human steward approved the candidate
- **FLAGGED → REJECTED** — Human steward rejected the candidate
- **FLAGGED → EXPIRED** — TTL elapsed before human review

**Source:** RFC-0031 §"State Machine".

## TTL and Expiry Semantics

RFC-0031 §"TTL and Expiry":

- Default TTL: 72 hours from creation for auto-resolvable candidates
- FLAGGED candidates TTL: 7 days (allowing human steward scheduling)
- TTL is set at creation time and recorded in `expiresAt`
- Expiry is idempotent: expiring an already-PROMOTED candidate is a no-op
- EXPIRED candidates are archived, not deleted (audit trail requirement)

A daily sweep transitions all candidates past their `expiresAt` to EXPIRED.

**Source:** RFC-0031 §"TTL and Expiry Semantics".

## The HITL Review Queue

The FLAGGED state triggers entry into the HITL (Human-In-The-Loop)
review queue. RFC-0031 §"HITL Review Protocol" defines:

**What triggers FLAGGED:**
- Confidence of the proposed belief is below the auto-promote threshold
  (default: < 0.60)
- The resolved entity conflicts with an existing high-confidence leaf
- The candidate proposes a new OBJECT or CONCEPT leaf with no predecessors
  (high risk of ontology pollution)
- The extraction source has a low reliability score

**Review queue properties:**
- Ordered by risk: high-confidence conflicts first, orphaned OBJECT leaves
  second, low-confidence new beliefs last
- Each queue entry includes: the proposed leaf, the conflicting leaf (if any),
  the evidence excerpt, the extraction source, and the confidence breakdown
- Stewards are presented with Approve / Reject / Defer options
- Deferred candidates re-enter the queue after a configurable period
  (default: 24 hours)

**Source:** RFC-0031 §"HITL Review Protocol".

## Batch Throughput and Back-Pressure

RFC-0031 §"Batch Throughput":

To prevent the review queue from flooding stewards:
- Maximum 50 FLAGGED candidates per hour enter the review queue
- If the hourly cap is reached, additional FLAGGED candidates wait in
  a back-pressure buffer
- Back-pressure is surfaced as a health metric (RFC-0028 region health)
- If back-pressure exceeds 500 candidates, the ingestion pipeline
  automatically throttles

This ensures the human review bandwidth is not overwhelmed by a single
large ingestion run.

**Source:** RFC-0031 §"Batch Throughput and Back-Pressure".

## Audit Trail Requirements

RFC-0031 §"Audit Trail":

Every state transition must be recorded in `stateHistory`. The audit trail
cannot be modified after the fact. It must include:

- The from/to states
- The timestamp
- The actor (agent ID or steward ID)
- An optional reason string

The audit trail serves:
- Debugging why a candidate was rejected or expired
- RFC-0022 impact analysis: tracing why a leaf was never created
- Compliance: evidence that human review occurred before high-risk promotions

**Source:** RFC-0031 §"Audit Trail Requirements".

## Relationship to the Human Review UI (Known Gap)

RFC-0031 specifies the protocol for the review queue (state machine,
approve/reject/defer, TTL, back-pressure). RFC-9999 §"Known Open Areas"
acknowledges that the **UI through which human stewards interact with
this queue is not yet specified**. The queue protocol is complete; the
frontend surface for it is an open specification gap.

**Source:** RFC-9999 §"Known Open Areas" → "Human Review Interface";
RFC-0031 §"HITL Review Protocol".

## Canonical Questions This Answers

- *What are the seven states of a Candidate?* — PENDING, NORMALIZING,
  RESOLVING, PROMOTED, REJECTED, FLAGGED, EXPIRED.
- *What triggers a candidate to be FLAGGED?* — Auto-resolution confidence
  below threshold, conflict with an existing high-confidence leaf, new
  ontology OBJECT with no predecessors, or low source reliability.
- *What happens to a FLAGGED candidate that is never reviewed?* — It
  expires after 7 days (the FLAGGED TTL) and transitions to EXPIRED.
- *Are EXPIRED candidates deleted?* — No; they are archived for audit trail.
- *What is the difference between REJECTED and EXPIRED?* — REJECTED means
  a human steward explicitly refused promotion; EXPIRED means TTL elapsed
  without a decision.
- *What is back-pressure in the staging protocol?* — A throttle that caps
  50 FLAGGED candidates entering the review queue per hour; additional
  candidates buffer and ingestion slows if the buffer grows past 500.
- *Is the HITL UI specified?* — No; the queue protocol (RFC-0031) is
  specified but the frontend surface is a known specification gap.
- *Can a Candidate's state history be modified?* — No; the audit trail
  is immutable by protocol requirement.
