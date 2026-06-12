---
name: "delphi-extraction — Candidate Extraction & Entity Resolution"
description: "Extracts knowledge candidates from text chunks and resolves them into the leaf graph via exact match, similarity merge, or creation."
owner: engineering
status: active
tags: [delphi, knowledge-plane]
---

# delphi-extraction

`delphi-extraction` turns raw text chunks into structured knowledge leaves. For each chunk it runs an extractor to produce `Candidate` objects, canonicalizes their text, and then runs a resolution pipeline that decides whether each candidate should be merged into an existing leaf, linked to a related leaf, created as a new leaf, or flagged as low-confidence. The package implements RFC-0027 (Extraction and Entity Resolution).

Two extractor implementations are provided. `HeuristicExtractor` operates entirely in-process: it applies sentence-boundary splitting and regex rules to identify QUESTION candidates (sentences ending in `?`), BELIEF candidates (declarative sentences 30–280 characters containing a predicate verb), and OBJECT candidates (capitalized tokens appearing two or more times within a section-bearing chunk). `AnthropicExtractor` calls the Claude API (defaulting to `claude-haiku-4-5`) with a structured JSON extraction prompt and falls back gracefully to an empty array on any error. `pickExtractor()` returns `AnthropicExtractor` when `ANTHROPIC_API_KEY` is set, otherwise `HeuristicExtractor`.

Resolution uses Jaccard similarity over token sets to decide between four outcomes. Exact title or alias match always produces `MERGED`. Candidates with extraction confidence below 0.5 are stored as `PROPOSED` leaves and returned as `FLAGGED`. Among remaining candidates, similarity at or above 0.6 (the merge threshold) produces `MERGED`; similarity between 0.35 and 0.6 produces `LINKED` with a `RELATES_TO` edge; below 0.35 produces `CREATED`. When two BELIEF candidates are near-duplicates that differ only by a negation token (`not`, `cannot`, `never`, `no`) the resolver creates a new leaf and writes a `CONTRADICTS` relationship between the two beliefs.

## Key exports

- `extractAsset(store, brainId, extractor, asset, chunks, opts)` — runs the full extract-canonicalize-resolve pipeline over all chunks; returns per-outcome counts
- `pickExtractor()` — returns `AnthropicExtractor` if `ANTHROPIC_API_KEY` is set, else `HeuristicExtractor`
- `canonicalize(candidate)` — normalizes whitespace, strips trailing punctuation from titles, ensures BELIEF statements end with `.`, deduplicates aliases case-insensitively
- `resolveCandidate(store, brainId, candidate, opts)` — performs the four-stage resolution and writes the leaf + evidence row
- `HeuristicExtractor` — rule-based extractor, no external dependencies
- `AnthropicExtractor` — Claude-backed extractor with graceful fallback
- `jaccard(a, b)` — Jaccard similarity over token sets
- `tokenSet(s)` — lowercases, strips punctuation, removes stopwords and tokens shorter than 3 characters
- `detectNegationPair(a, b)` — returns true when two strings share identical base tokens but one contains a negation marker

## Behavior

The extraction pipeline never creates leaves directly from chunks; every candidate passes through canonicalize and then through the four-stage resolution before any leaf or evidence row is written. Candidates with extraction confidence below 0.5 are stored with status `PROPOSED` rather than `ACTIVE`, marking them as uncertain. Every resolved candidate produces exactly one evidence row linking it to the originating chunk and asset, with the first 200 characters of source text stored as the citation. Merging an existing leaf adds the candidate's title to the leaf's aliases array when the titles differ (case-insensitive comparison), and recomputes the leaf's confidence using fresh evidence statistics. Every resolution call that creates or merges a leaf also calls `store.markRegionDirty`, ensuring the region's index is queued for regeneration.
