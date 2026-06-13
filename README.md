# Delphi

**A framework for building self-evolving systems.**

> Evolution is not intelligence. Evolution is the process by which intelligence
> emerges.

Most AI projects start with agents. Delphi starts with **evolution**. We believe
any system that can continuously run this loop improves over time:

1. **Understand** the current state
2. **Learn** from existing knowledge and prior attempts
3. **Generate** new hypotheses or actions
4. **Execute** changes
5. **Evaluate** outcomes
6. **Incorporate** successful adaptations
7. **Repeat** indefinitely

But evolution requires knowledge — a system cannot improve itself if it cannot
understand what already exists, what was tried before, why decisions were made,
and what the consequences were. So Delphi is the **knowledge substrate** that
makes the loop possible: it represents knowledge, evidence, decisions,
assumptions, relationships, outcomes, and confidence as interconnected
structures that both humans and agents can search, navigate, evaluate, and
apply. It transforms documents into navigable, evidence-backed,
confidence-scored knowledge — leaves, indexes, and maps.

The goal is not smarter agents. The goal is systems capable of continuous,
self-directed evolution; agents are merely one mechanism through which it occurs.

> Intelligence is not knowing everything. Intelligence is knowing how to find,
> evaluate, and apply the right knowledge at the right time.

Read the full [MANIFESTO.md](./MANIFESTO.md), the working agreement in
[AGENTS.md](./AGENTS.md), and the specification in `rfcs/` (start at
`rfcs/RFC-9999-Delphi-Specification-Index.md`). This MVP implementation follows
`rfcs/DELPHI-MVP-0001-First-Implementation-Plan.md`.

### Delphi evolves itself

This repository is its own proof. Its knowledge is a live Delphi Brain
(`brain/`), and an autonomous daemon runs the seven-step loop against the repo
continuously — scanning for knowledge gaps and goals, dispatching agents to
close them, evaluating the result against rubrics, and incorporating what passes
back into the Brain and the codebase. Humans approve only actions that affect
outside parties (see [CONSTITUTION.md](./CONSTITUTION.md)); everything else is
autonomous.

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
