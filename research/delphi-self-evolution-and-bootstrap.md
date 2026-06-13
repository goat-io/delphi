---
name: delphi-self-evolution-and-bootstrap
type: research
status: closed
region: Spec
topics:
  - self-evolution
  - bootstrap
  - delphi-builds-delphi
  - agent-loop
  - brain-bootstrap
  - DELPHI-MVP-0003
  - RFC-0008
  - RFC-0016
  - RFC-0026
  - RFC-0027
sources:
  - rfcs/DELPHI-MVP-0003-Delphi-Builds-Delphi.md
  - rfcs/RFC-0008-Agents-and-Research-Engine.md
  - rfcs/RFC-0016-Example-Brains.md
  - rfcs/RFC-0026-Tasks-and-Questions.md
  - rfcs/RFC-0027-Extraction-and-Entity-Resolution.md
---

# Delphi Self-Evolution: How Delphi Builds and Consumes Itself

## Core Principle: The First User of Delphi Is Delphi

DELPHI-MVP-0003 establishes the guiding rule for this repo:

> Every capability ships only when this repo itself uses it.

The Delphi monorepo is 100% AI-authored and every component for the
self-evolution loop already exists. The goal of DELPHI-MVP-0003 is to close
the loop: Delphi consuming its own knowledge rather than re-deriving it from
scratch in every session.

**Source:** DELPHI-MVP-0003 §"Purpose" and §"Principle".

## The Four Phases of Loop Closure

DELPHI-MVP-0003 defines four sequential phases:

### Phase A — The Brain Bootstrap

`pnpm brain:bootstrap` ingests the 32 RFC documents from `rfcs/`, `AGENTS.md`,
and package READMEs into a persistent Brain (PGlite). Seeded regions are:
Spec, Knowledge Plane, Execution Plane, Decisions, Operations.

The bootstrap is idempotent: files that have not changed are skipped via
checksum; changed documents are re-extracted. This dogfoods the extraction
pipeline (RFC-0027) on the corpus the team knows best and validates
RFC-0016 Example 9 (the Delphi self-brain example).

**Source:** DELPHI-MVP-0003 §"Phase A — The Delphi Brain".

### Phase B — MCP Server (Retrieval Becomes Agent-Driven)

The MCP surface (RFC-0014) exposes the Brain via:
`navigate_index`, `get_leaf`, `get_evidence`, `search`,
`trace_dependencies`, `what_breaks_if`, `ask`.

Wired into `.mcp.json` so every Claude Code session navigates the Brain
instead of re-reading raw RFC files. Without this, every agent session
re-pays the full context cost of re-deriving what the Brain already knows.

**Source:** DELPHI-MVP-0003 §"Phase B — MCP Server".

### Phase C — Decision Capture (Sessions Write Back)

Every working session ends by writing knowledge back to the Brain:
- DECISION leaves for choices made (rationale + evidence: commit hashes, PR links)
- BELIEF leaves for lessons learned (via RFC-0027 candidate pipeline — never written directly)
- QUESTION leaves for what was left open

Agents never write leaves directly. They write candidates via `POST /candidates`
and the extraction/resolution pipeline (RFC-0027) handles promotion.

**Source:** DELPHI-MVP-0003 §"Phase C — Decision Capture".

### Phase D — The Task Loop (Building Becomes Agent-Driven)

The full loop:

```
Debt detectors (RFC-0026 triggers) run on delphi-core cron
→ TASK leaves created with origin + closure criteria
→ Open questions and RFC deltas generate additional tasks
→ Executor harness (Claude Code headless / Agent SDK in delphi-sandbox)
  claims engineering tasks: plan → code → test → PR
→ PR link and CI results flow back as evidence
→ Merge closes the task
→ Beliefs update
```

`delphi-governance`'s Propose → Review → Decide loop governs spec changes
and high-risk merges.

**Source:** DELPHI-MVP-0003 §"Phase D — The Task Loop".

## Why This Matters: The Key Insight

Without Phase C (write-back), every future session re-litigates settled
decisions. Without Phase B (MCP), every agent pays full context cost to
re-derive what the Brain already knows. Without Phase A, there is no Brain
to navigate.

The loop closes only when all four phases are operational.

**Source:** DELPHI-MVP-0003 §"Without this…" notes in each phase description.

## The Seven-Step Evolutionary Dynamics

Every self-evolving system runs the same loop (RFC-9999 §"Vision"):

1. **Understand** the current state.
2. **Learn** from existing knowledge and prior attempts.
3. **Generate** new hypotheses or actions.
4. **Execute** changes.
5. **Evaluate** outcomes.
6. **Incorporate** successful adaptations.
7. **Repeat** indefinitely.

The Delphi Brain is the substrate that makes this loop possible. Without a
Brain that remembers what was tried, why decisions were made, and what
the consequences were, each iteration rediscovers the same ground.

**Source:** AGENTS.md §"What Is Delphi?" and RFC-9999 §"Vision".

## The Bootstrap Sequence

The canonical `brain:bootstrap` sequence is:

```
importBrain(brain/)              → restore committed canonical knowledge
ensureSeededRegions()            → create/reuse Spec, Knowledge Plane, …
ingestFile(rfcs/*.md)            → produce assets + chunks
extractAsset(…, specRegionId)    → extract candidates → promote to leaves
ingestFile(research/*.md)        → additional evidence for Spec region
ingestFile(AGENTS.md, …)         → Operations region
ingestFile(packages/*/README.md) → Knowledge Plane region
generateIndexes()                → 4-tier indexes per region
generateMaps()                   → navigation maps
exportBrain(brain/)              → commit canonical state
```

The `research/` directory is explicitly ingested into the Spec region,
making research files a first-class mechanism for improving Spec coverage.

**Source:** `scripts/bootstrap-brain.ts` §"Source list" (lines 91–150).

## Canonical Questions This Answers

- *What does "Delphi builds Delphi" mean?* — The repo is 100% AI-authored
  and runs its own evolutionary loop: extracting knowledge from its own
  RFCs, capturing decisions, generating tasks, and using agents to execute
  them — all fed back into the Brain.
- *Why does every session start with navigation rather than file-reads?* —
  Phase B (MCP server) makes Brain navigation cheaper than re-reading raw
  RFC files; the Brain already knows the answers agents would otherwise
  re-derive.
- *Can agents write leaves directly to the Brain?* — No. They write
  candidates via `POST /candidates`. The RFC-0027 pipeline promotes
  candidates to leaves after resolution.
- *What is the purpose of the `research/` directory?* — Research files are
  ingested into the Spec region during bootstrap, providing additional
  evidence-backed beliefs that complement the raw RFC extraction.
- *What is the build order for Delphi-as-a-product?* — Phase A (bootstrap)
  → Phase B (MCP) → Phase C (write-back) → Phase D (task loop). Each phase
  depends on the previous.
- *Is the evolutionary loop running on this repo?* — The bootstrap (`pnpm
  brain:bootstrap`) and evolution daemon run continuously; the task loop
  is the mechanism by which this repo improves itself.
