---
name: delphi-core
description: Durable Postgres workflow engine — step DAGs, exactly-once execution, HITL gates, and queue-first ingestion for the Delphi execution plane
owner: engineering
status: active
---

# delphi-core

`@goatlab/delphi-core` is the durable workflow engine that underpins the Delphi execution plane. It runs TypeScript step DAGs over Postgres with exactly-once external actions, human-in-the-loop (HITL) approval gates, and queue-first event ingestion capable of 5 000+ req/s on modest hardware. Redis is optional.

## Responsibilities

- Schedule and execute step DAGs defined as TypeScript classes.
- Provide step-level state persistence, retries, and back-off via Postgres (`FOR UPDATE SKIP LOCKED`).
- Gate workflows at human-approval pauses (`waitForHuman`) and resume on explicit input.
- Enforce per-workflow token/cost budgets; cancel steps that exceed limits.
- Emit run and step lifecycle events (`run.started`, `run.completed`, `step.failed`, etc.).
- Support multi-tenant isolation: every run is scoped to a `tenantId`.

## Key concepts

- **Workflow**: a class extending `Workflow<TInput>` that declares an ordered list of `steps`.
- **Step**: a class extending `FunctionStep<TInput, TOutput>` with a `handle()` method.
- **Auto-pass wiring**: when consecutive steps' types match, outputs are forwarded automatically; a `mapInput` callback bridges mismatches.
- **Engine**: created via `createEngine({ database, workflows, tenantId })`. Accepts a connection string or an existing `pg.Pool`.
- **Queue-first ingestion**: `start-async` path writes to Postgres then enqueues (~2 ms); a pool of ingest workers drains the queue.

## Infrastructure

- **Required**: Postgres 14+. All durable state (runs, steps, events, budgets) lives there.
- **Optional**: Redis + `@goatlab/tasks-adapter-bullmq` for throughput above ~5 000 req/s.

## Published package

Package name `@goatlab/delphi-core` is published to npm and consumed in production. Do not rename.

## Relationships

- `delphi-ai` registers an `AIStepExecutor` into the engine.
- `delphi-langgraph` registers a `LangGraphStepExecutor` into the engine.
- `delphi-sandbox` registers a `SandboxStepExecutor` into the engine.
- `delphi-governance` binds to the engine structurally via `fromEngine()`.
- `delphi-ui` visualises runs, steps, workers, and queue depth via this engine's HTTP API.
