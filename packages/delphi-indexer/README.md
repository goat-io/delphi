---
name: "delphi-indexer — Index Generation, Map Building & Region Management"
description: "Generates four-tier knowledge indexes per region, builds navigation maps, manages hub region detection, and provides a debounced scheduler."
owner: engineering
status: active
tags: [delphi, knowledge-plane]
---

# delphi-indexer

`delphi-indexer` maintains the navigational layer of the Delphi knowledge graph. It generates `KnowledgeIndex` documents that summarize the beliefs, objects, and open questions within each region at four verbosity tiers, and it builds `KnowledgeMap` documents that describe traversable routes through the leaf graph. The package implements RFC-0019 (Knowledge Indexes and Hierarchical Summaries) and RFC-0028 (Knowledge Regions and Index Lifecycle).

Two summarizer implementations are provided. `TemplateSummarizer` constructs the four summary tiers from the region's leaf statistics without any external calls: `tiny` (≤ ~140 chars, leaf and belief counts), `short` (tiny + top-3 belief titles), `medium` (top-5 beliefs with confidence scores, objects, open questions), and `long` (medium + all remaining beliefs). `AnthropicSummarizer` calls the Claude API (defaulting to `claude-opus-4-8`) with a structured JSON prompt and falls back to `TemplateSummarizer` on any error. `pickSummarizer()` returns `AnthropicSummarizer` when `ANTHROPIC_API_KEY` is set, otherwise `TemplateSummarizer`.

Map generation produces three categories of routes in a single `KnowledgeMap` record. Dependency routes follow `DEPENDS_ON` edges outward from root leaves (leaves that are depended on by others but depend on nothing themselves), tracing up to 8 hops via BFS. A single learning route orders all dependency-linked nodes topologically using Kahn's algorithm, placing prerequisites before dependents. Exploration routes start from OBJECT leaves with degree ≥ 2 and follow `RELATES_TO`, `SUPPORTS`, and `PART_OF` edges to connected neighbors, capped at 6 neighbors and 5 total exploration routes.

## Key exports

- `generateIndexes(store, brainId, summarizer, opts?)` — regenerates indexes for all regions that have leaves; with `onlyStale: true` skips regions whose index is current
- `generateMaps(store, brainId)` — builds and persists a single `KnowledgeMap` with DEPENDENCY, LEARNING, and EXPLORATION routes
- `ensureSeededRegions(store, brainId, titles)` — idempotently creates SEEDED regions by title
- `assignUnassignedLeaves(store, brainId, defaultRegionId)` — assigns regionless leaves by inheriting from related leaves, falling back to `defaultRegionId`
- `detectHubRegions(store, brainId, opts?)` — promotes high-degree OBJECT leaves (default threshold: 6) into HUB regions and reassigns their directly-related leaves
- `IndexScheduler` — debounced scheduler class with `markDirty()`, `suspend()`, `resume()`, and `flushNow()` methods
- `TemplateSummarizer` — template-based summarizer, no external dependencies
- `AnthropicSummarizer` — Claude-backed summarizer with graceful fallback to template
- `pickSummarizer()` — factory that selects the appropriate summarizer based on environment

## Behavior

Indexes expose four summary tiers — `summaryTiny`, `summaryShort`, `summaryMedium`, and `summaryLong` — stored in the same database row and differing only in verbosity, so a navigator can retrieve the appropriate detail level without additional queries. `generateIndexes` with `onlyStale: true` skips any region whose index has `stale = false`, meaning it only processes regions where `markRegionDirty` has been called since the last generation. Hub region detection only creates a new HUB region when no existing HUB region with the same title exists, making the detection step idempotent across repeated bootstrap runs. The `IndexScheduler` debounces concurrent dirty signals by 500 ms by default, queuing at most one trailing run so that a burst of leaf writes produces at most two index generation passes. The learning route uses Kahn's topological sort and appends any nodes remaining in a cycle (sorted by total degree) at the end rather than failing.
