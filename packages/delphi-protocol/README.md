---
name: "delphi-protocol — Canonical Type System & Protocol Primitives"
description: "Zod-validated schemas, ID generation, and confidence arithmetic for the Delphi meta-model."
owner: engineering
status: active
tags: [delphi, knowledge-plane]
---

# delphi-protocol

`delphi-protocol` is the foundational type layer for the entire Delphi Knowledge Operating System. It contains every canonical schema, enumeration, and utility that all other packages depend on, and it carries no runtime dependencies other than Zod. Every data structure that crosses a package boundary is defined and validated here.

The package implements the core primitives described in RFC-0001 (Delphi Meta Model), RFC-0002 (Leaf Protocol), and RFC-0003 (Knowledge and Confidence Theory). Leaf kinds, edge types, evidence relations, asset types, confidence structure, and the full answer-result shape are all declared as Zod schemas with inferred TypeScript types, making them the single authoritative source for the protocol.

The confidence model encodes six independent axes — evidence strength, source reliability, source diversity, freshness, consensus, and contradiction risk — and combines them via a fixed weighted formula. ID generation produces prefixed, 24-character hex identifiers derived from `crypto.randomUUID`, ensuring collision-free, sortable identifiers without an external dependency.

## Key exports

- `LeafKindSchema` / `LeafKind` — enum of 15 leaf kinds (OBJECT, BELIEF, QUESTION, DECISION, TASK, RUBRIC, CAPABILITY, METHODOLOGY, WORK, EXPRESSION, ASSET, ONTOLOGY_TYPE, RELATIONSHIP_TYPE, VALIDATION_RULE)
- `LeafStatusSchema` / `LeafStatus` — enum of 7 lifecycle statuses (DRAFT, PROPOSED, ACTIVE, DISPUTED, REFUTED, SUPERSEDED, ARCHIVED)
- `LeafSchema` / `Leaf` — the canonical leaf record with versioning, aliases, tags, regionId, and structured confidence
- `EdgeTypeSchema` / `EdgeType` — 12 relationship types including SUPPORTS, CONTRADICTS, DEPENDS_ON, IS_A, PART_OF
- `ConfidenceSchema` / `Confidence` — six-axis confidence object with a scalar `value` in [0, 1]
- `CandidateSchema` / `Candidate` — pre-resolution extraction candidate (kind restricted to OBJECT, BELIEF, QUESTION)
- `ResolutionSchema` / `Resolution` — outcome record (MERGED, CREATED, LINKED, FLAGGED)
- `KnowledgeIndexSchema` / `KnowledgeIndex` — four-tier summary with keyConcepts, keyBeliefs, keyQuestions, and stale flag
- `KnowledgeMapSchema` / `KnowledgeMap` — map with typed routes (LEARNING, DEPENDENCY, EXPLORATION)
- `AnswerResultSchema` / `AnswerResult` — full answer envelope including navigationPath, beliefs, evidence, dependencies, contradictions
- `computeConfidence(input)` — derives a `Confidence` object from evidence statistics
- `newId(prefix)` — generates a prefixed 24-character hex ID
- `nowIso()` — returns current time as ISO-8601 string

## Behavior

The confidence `value` is computed as the weighted sum `0.3 * evidenceStrength + 0.2 * sourceReliability + 0.15 * sourceDiversity + 0.15 * freshness + 0.2 * consensus − 0.2 * contradictionRisk`, clamped to [0, 1]. Source reliability is a fixed constant of 0.6 in the current implementation, meaning it does not vary per-asset. Source diversity saturates at 1.0 when five or more distinct assets contribute evidence, and consensus saturates at 1.0 when five or more evidence records exist. The presence of any CONTRADICTS relationship sets contradictionRisk to 0.5, which decreases the composite confidence by 0.1. All schemas are runtime-validated; passing malformed data to any schema will throw a Zod parse error rather than silently proceeding.
