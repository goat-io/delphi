---
name: candidate-coverage
type: coverage-note
spec_gap: "Candidate"
covered_by:
  - RFC-0027-Extraction-and-Entity-Resolution
  - RFC-0031-Candidate-Staging-Protocol
---

The `Candidate` primitive is fully specified across two complementary RFCs.

RFC-0027 (Extraction and Entity Resolution) defines what a Candidate is: a proposed, non-canonical leaf produced by the extraction pipeline, carrying a typed subject, predicate, object, confidence score, and a passage-level EvidenceRef. It covers the extraction → normalisation → resolution pipeline and the three resolution outcomes (SKIP / MERGE / NEW).

RFC-0031 (Candidate Staging Protocol) extends RFC-0027 with the Candidate's persistent lifecycle: a seven-state machine (PENDING → NORMALIZING → RESOLVING → PROMOTED / REJECTED / FLAGGED / EXPIRED), TTL semantics per state, the HITL review queue for FLAGGED candidates (Approve / Reject / Defer with a three-deferral cap), storage contract (dedicated staging table, immutable stateHistory, required indexes), batch back-pressure limits, and the audit trail required for provenance traceability.

RFC-9999 references RFC-0031 in the reading-order phase and dependency graph.

No additional RFC is required; the gap is fully closed by RFC-0027 and RFC-0031.
