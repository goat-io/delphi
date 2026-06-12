---
name: candidate-coverage
type: coverage-note
spec_gap: "Candidate"
covered_by: RFC-0027-Extraction-and-Entity-Resolution
---

The `Candidate` primitive is fully specified in RFC-0027 (Extraction and Entity Resolution), section "# Candidates" (lines ~74–130).

RFC-0027 defines a Candidate as a proposed, non-canonical leaf created by the extraction pipeline; it carries a typed subject, predicate, object, confidence, and a passage-level EvidenceRef, and is therefore distinct from a committed Leaf.

The RFC specifies the full lifecycle: extraction → normalisation (one claim per candidate, resolvable subject) → three-stage resolution (SKIP / MERGE / NEW) → retirement with a back-pointer once the candidate is absorbed or rejected.

It also covers Candidate-specific constraints: every BELIEF candidate must carry an EvidenceRef, FLAGGED candidates are routed to a human review queue, and merge outcomes propagate confidence updates to the target Leaf.

No additional RFC is required; the gap is closed by RFC-0027.
