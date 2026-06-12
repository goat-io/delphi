---
name: "delphi-agent — Question Answering & Knowledge Navigation"
description: "Navigates the knowledge index to answer questions against a brain, returning structured results with beliefs, evidence, dependencies, and contradictions."
owner: engineering
status: active
tags: [delphi, knowledge-plane]
---

# delphi-agent

`delphi-agent` provides the question-answering capability of the Delphi Knowledge Operating System. Given a natural-language question and a brain identifier, it navigates the index tier to identify the most relevant region, retrieves and ranks beliefs, gathers their evidence and inter-leaf relationships, synthesizes a textual summary, and returns a validated `AnswerResult` record. The package implements the search and discovery contract defined in RFC-0007 (Search, Navigation, and Knowledge Discovery) and the agent and research engine model in RFC-0008 (Agents and Research Engine).

Navigation always precedes retrieval. `pickRegion` scores every index in the brain by counting how many question tokens appear in the index's title, short summary, keyConcepts, and keyBeliefs. The highest-scoring index determines the region; ties are broken in favor of the index with more key beliefs. Only after a region is selected does the agent call `store.searchLeaves` to retrieve matching leaves. If full-text search returns no results the agent falls back to listing all beliefs in the selected region.

Two synthesizer implementations are available. `ExtractiveSynthesizer` concatenates the statements of the top two highest-confidence beliefs and produces the result entirely in-process. `AnthropicSynthesizer` calls the Claude API (defaulting to `claude-opus-4-8`) with the top ten beliefs and the question, requesting a 1–3 sentence answer, and falls back to `ExtractiveSynthesizer` on any error. `pickSynthesizer()` returns `AnthropicSynthesizer` when `ANTHROPIC_API_KEY` is set, otherwise `ExtractiveSynthesizer`.

## Key exports

- `answerQuestion(store, brainId, question, synthesizer?)` — runs the full navigate-retrieve-synthesize pipeline and returns a validated `AnswerResult`
- `pickRegion(store, brainId, question)` — token-overlap index navigation; returns `{ region, index, path }`
- `ExtractiveSynthesizer` — extractive in-process synthesizer, no external dependencies
- `AnthropicSynthesizer` — Claude-backed synthesizer with graceful fallback
- `pickSynthesizer()` — factory that selects the appropriate synthesizer based on environment

## Behavior

The agent always navigates the index tier first; it never begins with a raw leaf search against an unscoped brain. Answer confidence is computed as the arithmetic mean of the `confidence.value` fields of the top five beliefs, defaulting to 0.4 for any belief that lacks a confidence record. The `navigationPath` in the result always contains at least two elements — starting with `"brain"` followed by the matched index title or `"general"` — so callers can always reconstruct how the answer was reached. CONTRADICTS relationships among the top five beliefs are de-duplicated by sorting the pair of leaf IDs and using the sorted key as a set member, so each contradiction pair appears at most once in the result. DEPENDS_ON relationships are only included in the result when both the source and target leaf appear in the top-five belief set, keeping the dependency graph focused on the answer's direct evidence.
