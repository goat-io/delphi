# Delphi

A Knowledge Operating System. Delphi transforms documents into navigable,
evidence-backed, confidence-scored knowledge — leaves, indexes, and maps —
per the RFC specification in `rfcs/` (start at `rfcs/RFC-9999-Delphi-Specification-Index.md`).

This is the MVP implementation per `rfcs/DELPHI-MVP-0001-First-Implementation-Plan.md`.

## Stack

- TypeScript (strict), ESM, pnpm workspaces
- PostgreSQL via `DATABASE_URL`, or embedded PGlite when unset (zero setup)
- Anthropic API when `ANTHROPIC_API_KEY` is set; deterministic heuristic
  extraction/summarization otherwise (fully offline-capable)

## Layout

| Path | Role |
|---|---|
| `packages/delphi-protocol` | Zod contracts for all RFC primitives + confidence math |
| `packages/delphi-knowledge` | Storage: Db interface (pg / PGlite), migrations, BrainStore |
| `packages/delphi-ingestion` | Files → Assets + Chunks (frontmatter-aware, checksum-idempotent) |
| `packages/delphi-extraction` | Chunks → Candidates → resolution (merge/create/link/flag) → Leaves + Evidence (RFC-0027) |
| `packages/delphi-indexer` | Regions (seeded + hub), 4-tier indexes, maps, debounced scheduler (RFC-0028) |
| `packages/delphi-agent` | Question → index navigation → leaves → evidence → answer (RFC-0008) |
| `apps/api` | Fastify HTTP API (RFC-0014 subset) |
| `examples/tigerbeetle` | Self-contained demo corpus |

## Run

```bash
pnpm install
pnpm bt        # typecheck + all tests
pnpm demo      # ingest examples/, build indexes+maps, answer a question
pnpm api       # start the HTTP API on :3001
```

The demo works with no environment configuration. Set `ANTHROPIC_API_KEY`
to switch extraction/summarization/answers to LLM quality; set
`DATABASE_URL` to use a real Postgres.

## License

MIT — see [LICENSE.md](./LICENSE.md).
