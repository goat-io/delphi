---
name: delphi-langgraph
description: LangGraph StateGraph executor for delphi-core — Postgres checkpointing, HITL interrupts, and budget reporting for complex graph-based agent workflows
owner: engineering
status: active
---

# delphi-langgraph

`@goatlab/delphi-langgraph` bridges LangGraph's `StateGraph` abstraction into the `@goatlab/delphi-core` workflow engine. It runs a compiled LangGraph as a single durable step — with Postgres checkpoints, HITL pause/resume, and token-cost reporting back to the engine's budget system.

## Responsibilities

- Execute a LangGraph `StateGraph` as a first-class `delphi-core` step executor.
- Persist LangGraph checkpoints to Postgres via `@langchain/langgraph-checkpoint-postgres`.
- Map LangGraph `interrupt()` calls to `delphi-core` `WAITING_HUMAN` step state.
- Collect token usage from `AIMessage` annotations and return it in `StepResult.usage`.
- Propagate graph errors as `StepResult.error`, triggering the engine's normal retry/back-off.

## Key concepts

- **createLangGraphExecutor**: factory that accepts a `pgPool` and returns a `StepExecutor`; registered into the engine via `engine.registerExecutor('langgraph', ...)`.
- **executorConfig**: per-step config on the workflow definition — includes the compiled `graph` reference and a `threadIdFrom` strategy (`'runId'` binds one LangGraph thread per engine run).
- **Checkpoint sharing**: the same Postgres pool used by `delphi-core` stores LangGraph checkpoints, so no additional infrastructure is required.

## Mapping summary

| LangGraph concept | delphi-core equivalent |
|---|---|
| Graph compile | Executor config (graph reference) |
| Checkpoint | Postgres (shared pool) |
| `interrupt()` | Step → `WAITING_HUMAN` |
| `Send` / conditional edges | Internal to the step; engine sees one step boundary |
| Token usage on `AIMessage` | `StepResult.usage` → budget |
| Graph error | `StepResult.error` → retry/back-off |

## When to use

Use `delphi-langgraph` when graph topology is dynamic (conditional edges, model-driven routers, fan-out via `Send`). For linear or statically-known fan-out, plain `delphi-core` DAGs have lower overhead and direct queue integration.

## Published package

Package name `@goatlab/delphi-langgraph` is published to npm and consumed in production. Do not rename.

## Relationships

- Peer dependency on `@goatlab/delphi-core` for the `StepExecutor` interface.
- Peer dependency on `@langchain/langgraph` and `@langchain/langgraph-checkpoint-postgres`.
