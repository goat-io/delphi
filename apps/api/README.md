---
name: "delphi-api — HTTP REST API"
description: "Fastify HTTP server exposing ingestion, question answering, leaf inspection, full-text search, index navigation, and map retrieval over a single brain."
owner: engineering
status: active
tags: [delphi, knowledge-plane]
---

# delphi-api

`delphi-api` is the HTTP interface for a running Delphi brain. It wraps the full knowledge pipeline — ingestion, extraction, indexing, and agent question answering — in a Fastify server that accepts JSON requests and returns typed responses. The API surface is defined in RFC-0014 (APIs and Contracts).

On startup the server calls `createDb`, `migrate`, and `BrainStore` to initialize its storage, then calls `ensureSeededRegions` to guarantee four default regions exist: General, Technology, Science, and History. The server resolves its backing store from the `DATA_DIR` environment variable; when `DATA_DIR` is absent it uses PGlite in-process storage, and when `DATABASE_URL` is set (propagated through `createDb`) it connects to a PostgreSQL server.

The `POST /assets` endpoint runs the complete ingestion-extraction-indexing sequence in a single request: it calls `ingestFile`, runs `extractAsset` with `pickExtractor()`, regenerates stale indexes with `pickSummarizer()`, and rebuilds maps. The `POST /questions` endpoint delegates directly to `answerQuestion` with `pickSynthesizer()` and returns the full `AnswerResult` structure including navigationPath, beliefs, evidence, dependencies, and contradictions.

## Key exports

- `buildServer()` — constructs and returns the configured Fastify instance without starting it (used in tests)
- `buildApp` — alias for `buildServer` retained for backward compatibility

## Behavior

The server starts on port 3000 by default; the `PORT` environment variable overrides this. The `GET /health` endpoint returns the full `BrainStore.health` aggregate including leaf count, belief count, evidence count, orphan beliefs, average confidence, stale index count, and open question count. `POST /assets` is idempotent with respect to content: if the file's SHA-256 checksum already exists in the brain the endpoint returns `{ skipped: true }` without rerunning extraction or index generation. The `GET /search` endpoint requires a `q` query parameter and returns at most 10 leaves ranked by full-text relevance. The `GET /indexes/:regionTitle` endpoint resolves the region by exact title match and returns 404 if either the region or its index does not yet exist.
