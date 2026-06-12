# DELPHI-MVP-0003 — Delphi Builds Delphi
## Closing the Loop: Agent-Driven Construction, Knowledge, and Retrieval

Status: Implementation Blueprint

Depends On:
- DELPHI-MVP-0001, DELPHI-MVP-0002
- RFC-0008, RFC-0014, RFC-0016 (Example 9), RFC-0026, RFC-0027

---

# Purpose

This repo is 100% AI-authored, and the goal was always:

1. The repo is BUILT autonomously by agents.
2. Knowledge generation is agent-driven.
3. Knowledge retrieval is agent-driven.

Every component for this exists in the monorepo.

The loop is not closed: Delphi has never consumed Delphi.

This blueprint defines the closure, in dependency order.

---

# Principle

The first user of Delphi is Delphi.

Every capability ships only when this repo itself uses it.

---

# Phase A — The Delphi Brain (bootstrap)

Build the Brain of this repo using the knowledge plane:

- `pnpm brain:bootstrap` ingests rfcs/ (32 docs), AGENTS.md,
  READMEs into a persistent Brain (PGlite file, committed or
  rebuilt on clone).
- Seeded regions: Spec, Knowledge Plane, Execution Plane,
  Decisions, Operations.
- Re-run is idempotent (checksum skip; changed docs re-extract).

Validates RFC-0016 Example 9 and dogfoods extraction quality
on the corpus we know best.

---

# Phase B — MCP Server (retrieval becomes agent-driven)

Implement RFC-0014's MCP surface over the knowledge API:

navigate_index, get_leaf, get_evidence, search,
trace_dependencies, what_breaks_if, ask (answerQuestion).

Wire it into this repo's .mcp.json so every Claude Code session
navigates the Brain instead of re-reading files.

This is the highest-leverage missing piece: until it exists,
agents pay full context cost to re-derive what the Brain knows.

---

# Phase C — Decision Capture (sessions write back)

Every working session ends by writing knowledge:

- DECISION leaves for choices made (with rationale + evidence:
  commit hashes, PR links, conversation refs).
- BELIEF leaves for lessons learned (via the RFC-0027 candidate
  pipeline — agents never write leaves directly).
- QUESTION leaves for what was left open.

Port careium-brain's document-learning / promote-answer skills
as the capture workflow. Add `POST /candidates` to the API as
the agent write path (RFC-0014 agent contract).

Without this, every future session re-litigates settled
decisions (e.g. the stack choice).

---

# Phase D — The Task Loop (building becomes agent-driven)

Wire the existing pieces:

1. Debt detectors (careium health checks, RFC-0026 triggers)
   run on the delphi-core engine's cron → create TASK leaves
   with origin + closure criteria.
2. Open questions and RFC deltas also generate tasks.
3. An executor harness (Claude Code headless / Agent SDK,
   running in delphi-sandbox) claims engineering tasks:
   plan → code → test → PR.
4. The PR link and CI results flow BACK as evidence;
   merge closes the task; beliefs update.
5. delphi-governance's Propose → Review → Decide loop governs
   spec changes (RFC proposals) and high-risk merges; FLAGGED
   anything pauses on a human-in-the-loop gate.

This is the Constitution's loop applied to this repo:
Decision → Task → Execution → Observation → Learning.

## Remote Workers (implemented)

The task loop now supports out-of-process and cross-machine workers
via two complementary paths:

**Path A — pglite-socket (local / single-machine):**
`pnpm evolve:server --no-local-worker` boots the embedded PGlite engine
and exposes it over the Postgres wire protocol on localhost:5444 (or
PGLITE_PORT) via @electric-sql/pglite-socket. Any number of remote
workers on the same machine connect with:
  ENGINE_URL=postgres://localhost:5444/delphi pnpm evolve:worker

**Path B — Real Postgres (multi-machine):**
Set DATABASE_URL on the server; skip pglite-socket entirely. Workers
anywhere on the network point ENGINE_URL at the same Postgres instance.
Schema migrations are idempotent on both paths.

**Claim contract (RFC-0029):**
Workers use delphi-core's native `PgConnector.listen()` which issues
`FOR UPDATE SKIP LOCKED` against `workflow_steps` — the same contract
regardless of whether the worker is local or remote. Multiple workers
compete fairly; the Postgres lock ensures each step is claimed by
exactly one worker. LISTEN/NOTIFY is disabled on pglite-socket workers
(falls back to 200ms polling); enabled automatically when a real pg Pool
is available.

**Files:** `scripts/evolution-steps.ts` (shared step definitions),
`scripts/evolution-server.ts` (pnpm evolve:server),
`scripts/evolution-worker.ts` (pnpm evolve:worker).
**Verified:** two-process demo (server pid ≠ worker pid) with scan and
create-task claimed and executed by the worker, run-agent in progress.

---

# Phase E — Evaluation (the loop learns)

- The Answer Quality Benchmark (DELPHI-MVP-0001) becomes a
  RUBRIC leaf; the engine runs it after every pipeline change;
  scores are EVALUATION leaves with lineage.
- Governance Perspectives review both code PRs and knowledge
  changes (multi-agent evaluation, RFC-0005).
- Brain health (debt, coverage, confidence) is tracked over
  time; the loop's job is to make those numbers improve.

---

# What "done" looks like

A maintainer-less week: detectors find debt, tasks are created,
sandboxed agents ship reviewed PRs, sessions write decisions
back, the Brain's health improves, and a human only touches
HITL gates. The repo is then both the spec and the proof.

---

# Canonical Rules

1. Delphi is its own first user.
2. Agents retrieve through the Brain (MCP), not by re-reading files.
3. Agents write knowledge only through candidates (RFC-0027).
4. Every session ends with decision capture.
5. Every task has origin and closure evidence (RFC-0026).
6. Spec changes flow through governance proposals.
7. The benchmark gates pipeline changes.
