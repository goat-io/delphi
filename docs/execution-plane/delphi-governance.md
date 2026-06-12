---
name: delphi-governance
description: Governance bridge between the Brain judgment plane and delphi-core execution — compiles approved Decisions/Actions into exactly-once workflow runs, gates them through a Constitution, and records Outcomes back
owner: engineering
status: active
---

# delphi-governance

`@goatlab/delphi-governance` is the seam that makes the `delphi-brain` knowledge base *executable*. It reads approved Decisions and Actions from the Brain, guards them through a Constitution, compiles them into `delphi-core` workflow runs with exactly-once semantics, and writes Outcomes back.

## Responsibilities

- Read Decisions, Actions, and Classifications from a `BrainClient` (in-memory or HTTP).
- Run each item through a `ConstitutionGuard` before execution (`allow` / `block` / `require-human`).
- Compile `Action.type` to a `{ workflowName, mapInput }` pair via `CompileRegistry`.
- Start a `delphi-core` workflow run with `idempotencyKey = action.name` (exactly-once; engine deduplicates).
- Record `Outcome` entries back to the Brain when `run.completed` events arrive; `traceId = decision:<name>` is deterministic, so no external lookup is needed.
- Fan out a Decision to N perspective lenses (Finance, Security, Customer, …) via `PerspectiveReviewer`, then aggregate into a `ReviewDecider` verdict.

## Key exports

| Export | Role |
|---|---|
| `BrainClient` / `InMemoryBrainClient` / `HttpBrainClient` | Read Decisions/Actions, record Outcomes |
| `ConstitutionGuard` / `DefaultConstitutionGuard` | Allow / block / require-human based on classification severity |
| `CompileRegistry` | Map `Action.type` → `{ workflowName, mapInput }` |
| `WorkflowStarter` / `fromEngine` | Structural adapter to a `createEngine()` result |
| `DecisionExecutor` | `execute(action)` / `executePending(brain)` |
| `PerspectiveReviewer` | N concurrent lenses → tradeoff matrix |
| `ReviewDecider` / `DefaultReviewDecider` | Matrix → `approved` / `rejected` / `needs_human` |
| `createClaudeCodeChat` / `claudeCodeAvailable` | `ChatLike` backed by the `claude -p` CLI — real LLM review, no API key required |
| `createOutcomeSubscriber` | `onEngineEvent` handler for the Measure seam |
| `createGovernance` | Wires everything: `.reviewDecision()`, `.tick()`, `.onEngineEvent()` |

## Design constraints

- **Independent of delphi-core at compile time**: imports nothing from `delphi-core`; binds structurally via `fromEngine()`.
- **Exactly-once**: `idempotencyKey = action.name` prevents double-execution across loop restarts.
- **Stateless outcome mapping**: deterministic `traceId` eliminates the need for an external correlation store.

## Perspectives model

Perspectives replace approval roles. Before a Decision is approved, it is reviewed by a set of reusable reasoning lenses. Visibility into tradeoffs is the goal — the `ReviewDecider` (the constitution's rules) makes the final call. A single `reject` escalates to human rather than being silently outvoted.

## Published package

Package name `@goatlab/delphi-governance` is published to npm and consumed in production. Do not rename.

## Relationships

- Reads from `delphi-brain` (judgment plane) via `BrainClient`.
- Executes into `delphi-core` (execution plane) via the structural `WorkflowStarter` interface.
- Optionally wires `delphi-ai` (`LLMAdapter`) into perspective evaluation.
