# DELPHI-MVP-0002 — Prior Art & Reuse
## What Existing Goatlab Code Feeds Delphi

Status: Implementation Blueprint

---

# Purpose

Delphi is not built from zero.

Two existing codebases contain proven pieces of it.

This document records what to reuse, what to reimplement,
and what to deliberately leave behind — so AI authors harvest
instead of rediscovering.

---

# Source 1 — careium-brain

Location:

/Users/igca/Documents/Code/careium-brain

A working proto-Delphi: git-versioned, agent-readable company
knowledge base with a Go CLI (SQLite FTS5 + local embeddings),
hybrid search, RAG chat, facets, and backlinks.

The RFCs cite "Careium Brain" as an example Brain (RFC-0016).
This is it.

## Reimplement in Delphi

| careium-brain artifact | Becomes | RFC |
|---|---|---|
| `brain/kinds.md` + `brain/schema/*.schema.json` + migrations | `@delphi/company` ontology pack — port, don't redesign | RFC-0006 |
| `brain/health-checks.md` (freshness, `_TODO_` markers, broken links, orphan files, duplicates, coverage) | First Knowledge Debt detectors | RFC-0003, RFC-0008, RFC-0022 |
| `brain/skills/promote-candidate` | Candidate → leaf resolution workflow | RFC-0027 |
| `brain/skills/propose-kind`, `propose-edge` | Ontology proposal workflow | RFC-0025 |
| `brain/skills/brain-evolve`, `catchup`, `ingest`, `document-learning` | Seed Capabilities + Methodologies | RFC-0013 |
| Indexer `content_hash` embedding cache | delphi-indexer incremental embedding | RFC-0028 |
| `catalog/_seeds` + `_structure.json` | Seeded regions at Brain creation | RFC-0028 |
| `brain/telemetry/` (events.jsonl + rollup) | Usage-frequency ranking signal; map-generation input | RFC-0007, RFC-0023 |
| Frontmatter conventions (name, description, last-updated, owner, status, tags, audience) | Leaf metadata conventions; status maps to LeafStatus | RFC-0002 |
| catalog/ vs narratives/ split | Leaves vs Assets separation, validated in practice | RFC-0020 |

## Use as-is

Careium Brain becomes the SECOND validation corpus
(after TigerBeetle, per DELPHI-MVP-0001):

686 documents with real frontmatter, real relationships,
and a real catalog. Importing it validates the Company Brain
example end to end (RFC-0016).

## Design precedent: MCP as the agent-facing surface

codebase-memory-mcp proves the consumption model Delphi needs:

a knowledge graph exposed as MCP tools
(`search_graph`, `trace_path`, `query_graph` — a read-only
Cypher subset, prior art for DQL / RFC-0024),
achieving ~99% token reduction vs file-by-file reading —
empirical validation of navigation-before-retrieval (RFC-0007).

Delphi Brains must expose an MCP server alongside REST:

navigate_index, get_leaf, get_evidence, trace_dependencies,
what_breaks_if, query (DQL).

Recorded as an addition to RFC-0014.

## New requirement it surfaces

careium-brain is git-as-database: human-readable, versioned,
reviewable markdown.

Delphi is Postgres-canonical.

Bridge: a markdown import/export format —
ingest a brain-repo as a Brain; export a Brain back to a
reviewable git repo.

This is also the cheapest first federation transport (RFC-0009).
Candidate for a future RFC.

## Leave behind

- Go CLI (Delphi core is TypeScript)
- SQLite FTS5 + in-memory KNN (Delphi uses Postgres FTS + pgvector;
  the patterns carry, the storage does not)
- Ollama local chat (Delphi agents use the Anthropic API)

---

# Source 2 — sodium

Location:

/Users/igca/Documents/Code/sodium

## Use as-is

`apps/ai-service` — the extraction sidecar (see AGENTS.md):

- BGE-M3 embeddings (1024-dim, multilingual, ONNX)
- PaddleOCR
- faster-whisper transcription
- Stateless FastAPI over HTTP, Cloud Run ready

Called by delphi-ingestion / delphi-extraction.
Never reimplement; never duplicate.

`packages/backend-observability` — prom-client metrics wrapper
for RFC-0010 observability.

## Adopt the conventions

- `packages/shared-schemas` pattern: Zod schemas as a workspace
  package consumed by every app — this is the delphi-core shape
- Monorepo tooling: pnpm workspaces + turbo + biome,
  `bt` (build+lint+test) script convention
- Test split: unit / functional / integration via vitest

Delphi's monorepo should look like a sodium workspace so
AI-generated code lands in a familiar, verifiable shape.

## Not relevant

`apps/company-analysis` (Laravel/PHP) — different domain, no reuse.

---

# Source 4 — fluent's delphi packages (now merged into this repo)

fluent's @goatlab/delphi-* family is the EXECUTION PLANE:
agents-as-workflows. It was migrated into this monorepo (June 2026),
keeping published names/versions untouched (prod consumers).

| Package | Role in the spec |
|---|---|
| @goatlab/delphi-core | Workflow engine: RFC-0026 task runtime, RFC-0028 scheduler, budgets, lineage, human-in-the-loop gates |
| @goatlab/delphi-sandbox | Sandboxed autonomous researchers |
| @goatlab/delphi-langgraph | Research agent graphs as steps |
| @goatlab/delphi-ai | Provider adapter + multi-agent consensus (RFC-0005 multi-agent evaluation substrate) |
| @goatlab/delphi-brain | Git/markdown Brain — the import/export bridge |
| @goatlab/delphi-ui | Workflow dashboard; grows brain/review views |

Integration phases: (1) pipeline + index jobs as engine DAGs,
(2) FLAGGED candidates as HITL gates rendered by delphi-ui,
(3) markdown-brain ingestion adapter (careium corpus),
(4) sandboxed researchers emitting candidates.

---

# Source 3 — External Open Source

Goal: fully autonomous agents generating knowledge for Brains.

The governing principle:

Autonomous researchers produce ASSETS or CANDIDATES.

Never leaves directly.

All generated knowledge enters through the RFC-0027 pipeline
(candidates → resolution → leaves), keeping hallucination
guards intact regardless of who or what did the research.

## Adopt as-is

| Project | License | Role |
|---|---|---|
| yt-dlp | Unlicense | Video/audio acquisition in delphi-ingestion; feeds sodium whisper transcription (RFC-0020) |
| gpt-researcher | Apache 2.0 | Phase 1 autonomous research: runs as a report generator; reports + citations stored as ASSETS, then extracted normally (RFC-0008, RFC-0027) |
| lunaroute | Apache 2.0 | Local LLM proxy in front of all agent traffic: session recording = agent accountability audit trail (RFC-0008); token metrics = budget measurement (RFC-0028); PII redaction; provider routing seam for future local models |
| codebase-memory-mcp (DeusData) | MIT | Source-code extractor for REPOSITORY assets: tree-sitter graph (functions, classes, routes; CALLS/IMPORTS edges) in SQLite, incremental via git diff, single static binary. delphi-extraction invokes it and maps its graph into candidates/evidence (RFC-0020, RFC-0027). Its `ingest_traces` = runtime traces as observation evidence (RFC-0004) |

## Reimplement the pattern

| Project | Pattern to port | RFC |
|---|---|---|
| gpt-researcher | Planner → parallel executors → publisher loop, rebuilt as a native Researcher that navigates indexes first and emits CANDIDATES with evidence refs (not prose reports) | RFC-0008, RFC-0027 |
| Youtube2Webpage | Transcript + timestamped keyframes as video derivatives; timestamp-addressable passages for evidence | RFC-0020 |
| mira-OSS | Memory decay by USE-DAYS (not calendar days); retention earned through access, references, entity links. Apply to freshness and region importance | RFC-0003, RFC-0028 |

⚠️ mira-OSS is AGPL-3.0 — ideas only, never vendor code.
⚠️ attn is GPL-3.0 — same rule.

## Meta-tooling (for building Delphi, not inside it)

| Project | License | Role |
|---|---|---|
| pilot | BUSL-1.1 (internal use OK) | Ticket → plan → code → PR autonomy on Claude Code; candidate harness for Delphi's own 100% AI-authored development. Its dev/stage/prod autonomy levels are the pattern for supervising research agents |
| attn | GPL-3.0 | Human cockpit for parallel agent sessions; personal tooling |
| claude-pty-wrapper | MIT | ADOPTED: PTY executor for the evolution loop — interactive Claude session keeps usage on the subscription (user requirement, June 2026); headless claude -p remains the fallback executor |

## Watch, don't adopt

| Project | Why not now | What to keep |
|---|---|---|
| youtu-agent | Python agent framework conflicts with TS core | YAML-defined agents reinforce RFC-0013 capabilities-as-data |
| gpt-oss (OpenAI open-weight models) | Adds inference infra + quality risk at MVP | Future cost lever for the high-volume extraction tier, routed via lunaroute with zero Delphi code changes |

---

# Canonical Rules

1. Port the careium-brain kind taxonomy; do not redesign it.
2. Health checks become debt detectors.
3. Skills become capabilities and methodologies.
4. Careium Brain is the second validation corpus.
5. The sodium ai-service is called, never copied.
6. Sodium workspace conventions are Delphi's house style.
7. A markdown import/export bridge is future work, recorded here.
8. Autonomous researchers produce assets or candidates — never leaves.
9. All agent LLM traffic flows through the lunaroute proxy.
10. AGPL/GPL projects contribute ideas only — no vendored code.
