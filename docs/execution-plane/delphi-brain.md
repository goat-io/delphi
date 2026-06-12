---
name: delphi-brain
description: Company-agnostic knowledge framework — Go CLI with FTS5/RAG hybrid search, React UI, JSON Schema kinds, and Claude Code skills for documenting and reasoning about any organisation as agent-readable data
owner: engineering
status: active
---

# delphi-brain

`@goatlab/delphi-brain` is a reusable framework for turning any company into structured, agent-readable data. It provides a Go CLI (FTS5 full-text search + semantic RAG), a React UI, JSON Schema kind definitions, and a suite of Claude Code skills for self-evolving documentation.

## Responsibilities

- Index markdown catalog entries (`kind:` frontmatter) into SQLite with FTS5 full-text search.
- Produce and store vector embeddings (768-dim `nomic-embed-text` via Ollama) for hybrid keyword + semantic search.
- Expose a REST API consumed by the React UI and agent skills.
- Provide reusable Claude Code skills: `analyze-repo`, `catchup`, `document-learning`, `brain-evolve`, `propose-*`.
- Define a canonical kind taxonomy and frontmatter conventions for entities (`system`, `repo`, `team`, `decision`, etc.).

## Company-agnostic seams

Nothing in this package is company-specific. Company identity is injected via two seams:

- **`brain.config.json`**: org name, description, branding, GitHub org, chat model. Served at `GET /api/config`.
- **`frontend/src/_instance/`**: UI branding, domain colours, curated library, reasoning lenses. Swap per company.

Catalog content (actual `kind:` entries) lives in the company's own brain repo, pointed to via `BRAIN_ROOT` / `BRAIN_CATALOG_DIR`.

## Layout

| Dir | Purpose |
|---|---|
| `cli/` | Go binary — repo registry, doc indexer, FTS5, vector embeddings, REST API, RAG chat |
| `frontend/` | React UI — talks to the CLI API; company-specific bits under `_instance/` |
| `schema/` | JSON Schema per kind (source of truth) |
| `skills/` | Generic Claude Code skills |
| `kinds.md` | Kind taxonomy |
| `conventions.md` | File / folder / frontmatter conventions |

## RAG layer

- Chunks every `.md` file (~800 char paragraphs, 100 char overlap); embeds with `nomic-embed-text`.
- In-memory cosine KNN; sub-millisecond over ~10 000 chunks.
- Cache hits on `content_hash` skip re-embedding (incremental indexing).
- Gracefully degrades to FTS5 if Ollama is unavailable.
- Endpoints: `GET /api/rag/query?q=...&k=10`, `GET /api/rag/stats`.

## Build

The Go binary is built outside the Turbo JS pipeline: `pnpm --filter @goatlab/delphi-brain brain:build` or `make build`. Requires Go 1.24+ with CGO enabled.

## Published package

Package name `@goatlab/delphi-brain` is published to npm and consumed in production. Do not rename.

## Relationships

- Provides the judgment plane that `delphi-governance` reads (Decisions, Actions, Classifications).
- Skills call `delphi-core` workflows when executing approved actions.
