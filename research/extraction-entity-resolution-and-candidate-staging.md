---
name: extraction-entity-resolution-and-candidate-staging
type: research
status: closed
region: Spec
topics:
  - extraction
  - entity-resolution
  - candidates
  - candidate-staging
  - canonicalization
  - leaf-swamp
  - RFC-0027
  - RFC-0031
sources:
  - rfcs/RFC-0027-Extraction-and-Entity-Resolution.md
  - rfcs/RFC-0031-Candidate-Staging-Protocol.md
  - rfcs/RFC-0020-Works-Assets-and-Knowledge-Extraction.md
---

# Extraction, Entity Resolution, and Candidate Staging

## The Problem: Leaf Swamp Prevention

100 PDFs about one domain will produce the same concepts and claims hundreds
of times. "TigerBeetle is deterministic" appears in 40 documents, phrased 40
ways. Without entity resolution, the Brain becomes a **leaf swamp**: thousands
of near-duplicate leaves, no accumulation of evidence, no meaningful
confidence.

RFC-0027 and RFC-0031 prevent this through staged extraction.

**Source:** RFC-0027 §"Purpose" (lines 21–49).

## Core Principle: Extraction Never Creates Leaves Directly

```
Asset → Chunk → Candidate → Resolution → (Leaf or Evidence on existing Leaf)
```

Extraction creates **Candidates**, not leaves. Candidates are proposed leaves
in a staging area. They are resolved against existing knowledge before
anything becomes canonical.

**Source:** RFC-0027 §"Core Principle" (lines 52–70).

## What Is a Candidate?

```ts
interface Candidate {
  id: string
  kind: LeafKind
  title: string
  statement: string          // canonicalized, declarative, one claim
  aliases: string[]
  extractionConfidence: number
  passage: Passage           // source text with offset
  assetId: string            // which asset it came from
  extractedBy: AgentRef
  resolution?: Resolution    // populated after resolution
}
```

Candidates are staging objects. They are NOT canonical. They exist in the
staging area temporarily.

**Source:** RFC-0027 §"Candidates" (lines 74–104).

## Canonicalization (Five Rules)

Before resolution, every candidate statement is normalized:

1. **Declarative form**: "it's deterministic" → "TigerBeetle is deterministic"
2. **Present tense** where applicable
3. **Pronouns resolved**: "it", "this system" → named subject
4. **One claim per candidate**: compound sentences are split
5. **Subject named explicitly**: must resolve to an OBJECT leaf or candidate

Canonical statements make matching possible. Without them, entity resolution
produces false negatives.

**Source:** RFC-0027 §"Canonicalization" (lines 108–128).

## Three-Stage Entity Resolution Pipeline

Every candidate passes through three stages in order:

### Stage 1 — Exact Match
Match against titles, aliases, and canonical statements. Cheap. Deterministic.
Run first. Either succeeds immediately or passes to Stage 2.

### Stage 2 — Semantic Match
Embedding similarity against existing leaves of the same kind. Returns
top-K nearest existing leaves. Provides candidates for adjudication.

### Stage 3 — Adjudication
An LLM adjudicator evaluates matches from Stage 2 and produces a structured
resolution verdict: `MERGED`, `CREATED`, `LINKED`, or `UNSURE`. `UNSURE`
candidates are flagged for human review (HITL gate).

**Source:** RFC-0027 §"Entity Resolution Pipeline" (lines 131–150+).

## Resolution Outcomes

| Outcome | Meaning |
|---|---|
| `MERGED` | Candidate matches existing leaf; becomes new evidence on that leaf |
| `CREATED` | No match; candidate becomes a new canonical leaf |
| `LINKED` | Candidate related to existing leaf; REFERENCES edge created |
| `UNSURE` | Adjudicator cannot decide; FLAGGED for human review |

**Source:** RFC-0027 (resolution outcome section).

## The Candidate State Machine (RFC-0031)

RFC-0031 extends Candidates with a lifecycle state machine:

```
PENDING → NORMALIZING → RESOLVING → PROMOTED (terminal)
                      ↘ FLAGGED  → REJECTED (terminal)
                                 → EXPIRED  (terminal)
          RESOLVING   → EXPIRED  (if TTL elapses)
```

```ts
type CandidateState =
  | "PENDING"      // created, awaiting normalization
  | "NORMALIZING"  // canonicalization in progress
  | "RESOLVING"    // entity resolution in progress
  | "PROMOTED"     // became a leaf or evidence (terminal)
  | "REJECTED"     // human steward rejected (terminal)
  | "FLAGGED"      // needs human review
  | "EXPIRED"      // TTL elapsed without resolution (terminal)
```

**No state may transition backward.** PROMOTED, REJECTED, and EXPIRED are
terminal.

**Source:** RFC-0031 §"State Machine" (lines 106–137).

## Time-to-Live (TTL)

Every Candidate receives an `expiresAt` timestamp at creation. A Candidate
that is never reviewed must eventually expire. Stale staging areas are
Knowledge Debt. The default TTL is configured per Brain; the system
automatically transitions RESOLVING and FLAGGED candidates to EXPIRED when
their TTL elapses.

**Source:** RFC-0031 §"Time-to-Live" (lines 143+).

## Audit Trail: Who Created This Candidate?

RFC-0031 requires a full audit trail on every candidate:

```ts
interface StateTransition {
  from: CandidateState
  to: CandidateState
  at: string          // ISO-8601
  actorId: string     // agent ref or steward id
  reason?: string
}
```

The `stateHistory` field on `StagedCandidate` records every state transition.
This answers "Who created this Candidate?" (the `PENDING → NORMALIZING`
transition actor), "Which agent resolved it?" (the `RESOLVING → PROMOTED`
actor), and "Why was it rejected?" (the `reason` on the REJECTED transition).

**Source:** RFC-0031 §"The Candidate as a Staging Entity" (lines 65–101).

## Retroactive Deduplication

RFC-0027 defines a retroactive deduplication protocol for cases where
duplicates slipped through — for example, when two extraction jobs ran
concurrently and both created the same leaf before resolution could prevent
it. The deduplication process merges leaves and consolidates their evidence
references, confidence scores, and relationship edges.

**Source:** RFC-0027 §"Retroactive Deduplication".

## Event Log: What It Records

The event log records every state transition of every candidate. This is
distinct from the leaf event log (RFC-0002). The candidate event log answers:
- Who created this Candidate? (`actorId` on PENDING→NORMALIZING)
- When did normalization complete?
- Which agent made the resolution decision?
- Why was it flagged for human review?
- When did it expire?

**Source:** RFC-0031 §"Audit" fields in StagedCandidate schema.

## Hallucination Guards

Extraction pipelines must include hallucination guards that:
1. Reject candidates with extraction confidence below a configured minimum
2. Flag candidates whose statement cannot be verified against the source passage
3. Escalate to FLAGGED state when the LLM adjudicator detects ambiguity

These guards prevent low-quality extraction from polluting canonical knowledge.

**Source:** RFC-0027 §"Hallucination Guards".

## Canonical Questions This Answers

- *Why don't extraction pipelines create leaves directly?* — To prevent leaf
  swamps. Candidates are staged and resolved against existing knowledge first.
- *What are the three entity resolution stages?* — Exact Match, Semantic
  Match, Adjudication.
- *What does UNSURE mean in resolution?* — The adjudicator cannot decide;
  the candidate is FLAGGED for human review.
- *The event log answers: Who created this Candidate?* — The `actorId` on
  the PENDING→NORMALIZING transition in the candidate's `stateHistory`.
- *Can a candidate go from PROMOTED back to RESOLVING?* — No. No state may
  transition backward. PROMOTED is terminal.
- *What happens if a FLAGGED candidate is never reviewed?* — It expires
  (FLAGGED→EXPIRED) when its TTL elapses. Stale staging areas are Knowledge
  Debt.
- *What are the terminal states?* — PROMOTED, REJECTED, EXPIRED.
