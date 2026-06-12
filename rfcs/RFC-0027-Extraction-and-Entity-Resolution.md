# RFC-0027 — Extraction & Entity Resolution
## How Assets Become Leaves Without Creating a Leaf Swamp

Status: Draft

Depends On:
- RFC-0002
- RFC-0003
- RFC-0004
- RFC-0020
- RFC-0026

---

# Purpose

RFC-0020 defines what assets are.

This RFC defines how knowledge is extracted from them safely.

The central problem:

100 PDFs about one domain will produce
the same concepts and claims hundreds of times.

"TigerBeetle is deterministic"
appears in 40 documents, phrased 40 ways.

Without entity resolution the Brain becomes:

A leaf swamp.

Thousands of near-duplicate leaves.

No accumulation of evidence.

No meaningful confidence.

This RFC defines:

- Extraction Contract
- Candidates
- Canonicalization
- Entity Resolution
- Merge Semantics
- Hallucination Guards
- Retroactive Deduplication

---

# Core Principle

Extraction never creates leaves directly.

Extraction creates Candidates.

Candidates are resolved against existing knowledge
before anything becomes canonical.

Asset
↓
Chunk
↓
Candidate
↓
Resolution
↓
Leaf (new)
or
Evidence (attached to existing leaf)

---

# Candidates

A Candidate is a proposed leaf.

Candidates are staging objects.

Candidates are not canonical.

```ts
interface Candidate {
  id: string

  kind: LeafKind

  title: string

  statement: string

  aliases: string[]

  extractionConfidence: number

  passage: Passage

  assetId: string

  extractedBy: AgentRef

  resolution?: Resolution
}
```

---

# Canonicalization

Before resolution, every candidate statement is normalized:

1. Declarative form
   "it's deterministic" → "TigerBeetle is deterministic"

2. Present tense where applicable

3. Pronouns resolved
   "it", "this system" → named subject

4. One claim per candidate
   Compound sentences are split

5. Subject named explicitly
   The subject must be resolvable to an OBJECT leaf or candidate

Canonical statements make matching possible.

---

# Entity Resolution Pipeline

Every candidate passes through three stages.

## Stage 1 — Exact Match

Match against:

- Titles
- Aliases
- Canonical statements

Cheap. Deterministic. Run first.

## Stage 2 — Semantic Match

Embedding similarity against existing leaves of the same kind.

Returns the top-K nearest existing leaves.

## Stage 3 — Adjudication

An LLM compares the candidate against the top-K matches and decides:

SAME — same assertion or concept

RELATED — distinct, but should be linked

DISTINCT — genuinely new

UNSURE — flag for review

---

# Resolution Outcomes

```ts
interface Resolution {
  outcome:
    | "MERGED"
    | "CREATED"
    | "LINKED"
    | "FLAGGED"

  matchedLeafId?: string

  similarity?: number

  adjudicationRationale?: string
}
```

---

# Suggested Thresholds (MVP)

similarity ≥ 0.92
→ adjudicate, likely MERGE

0.75 ≤ similarity < 0.92
→ adjudicate, likely LINK or CREATE

similarity < 0.75
→ CREATE

UNSURE at any stage
→ FLAG for review queue

Thresholds are configuration, not protocol.

Tune them against the review queue.

---

# Merge Semantics

When a candidate merges into an existing leaf:

1. A new EvidenceRef is attached
   (new asset, new passage)

2. Confidence is recalculated
   (source diversity likely increases)

3. New aliases are appended

4. Provenance records a MERGE activity

5. The candidate is retired with a pointer to the leaf

Nothing is lost.

Evidence accumulates.

This is how 40 restatements become
ONE belief with 40 citations.

---

# Contradiction Handling

If the candidate contradicts the matched leaf:

Do NOT merge.

Create the new belief.

Add a CONTRADICTS edge.

Both remain visible (RFC-0003, RFC-0021).

Contradiction is signal, not noise.

---

# Hallucination Guards

Extraction must satisfy:

1. Every BELIEF candidate carries a passage-level EvidenceRef.
   No passage → no belief.

2. extractionConfidence below floor (suggested: 0.5)
   → FLAGGED, never auto-created.

3. The passage text must entail the statement.
   A verification check (separate from extraction) confirms this.

4. Agent-extracted evidence is marked as agent-generated (RFC-0004).

A belief that cannot point to its source text
does not enter the Brain.

---

# Retroactive Deduplication

Resolution at ingest time is imperfect.

A steward sweep periodically:

1. Clusters leaves by embedding similarity
2. Adjudicates clusters
3. Proposes merges

Merges of existing leaves use SUPERSEDES:

Leaf A + Leaf B
→ Merged Leaf C

A and B become SUPERSEDED.

Evidence and edges transfer to C.

Lineage is preserved.

---

# Review Queue

FLAGGED candidates and proposed merges
form a human review queue.

The queue is itself measurable debt:

A growing queue means
thresholds or prompts need tuning.

---

# Extraction Metrics

Track:

Candidates per asset

Merge rate
(healthy: rises as the Brain matures)

Creation rate
(healthy: falls as the Brain matures)

Flag rate

Verification failure rate

Duplicate rate found by retroactive sweeps
(measures ingest-time resolution quality)

---

# Canonical Rules

1. Extraction creates candidates, not leaves.
2. Statements are canonicalized before matching.
3. Resolution precedes creation.
4. Merging attaches evidence; it never discards it.
5. Contradictions create edges, not merges.
6. Every extracted belief cites a passage.
7. Low-confidence extraction is flagged, not stored.
8. Retroactive sweeps catch what ingest missed.
9. Merges preserve lineage via SUPERSEDES.
10. Extraction is auditable end to end.

---

# Success Criteria

1. Ingesting 100 documents about one domain produces
   consolidated beliefs with accumulated evidence —
   not thousands of duplicates.
2. Re-ingesting the same document creates zero new leaves.
3. Every belief traces to a passage.
4. Merge rate increases as the Brain matures.
5. Contradictions are preserved and visible.
6. Flagged candidates are reviewable.
7. Hallucinated claims cannot enter the Brain.
8. Retroactive deduplication converges.
9. Lineage survives merges.
10. Confidence reflects genuine source diversity,
    not repetition of one source.
