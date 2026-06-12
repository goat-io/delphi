---
name: delphi-ui
description: React workflow dashboard for delphi-core — real-time run/step visualisation, drag-and-drop graph editor, human-approval UI, and a self-contained test server for E2E and load benchmarks
owner: engineering
status: active
---

# delphi-ui

`@goatlab/delphi-ui` is the browser-side dashboard for the `delphi-core` workflow engine. It visualises runs, steps, worker health, and queue depth in real time via server-sent events, and ships a drag-and-drop graph editor for authoring workflow templates without hand-writing DSL.

## Responsibilities

- List workflows and inspect individual runs, steps, and logs.
- Surface human-approval pauses (`WAITING_HUMAN` steps) with an approve/reject form.
- Show worker liveness and queue depth metrics.
- Provide a React Flow + dagre visual editor for authoring workflow templates.
- Render a smart trigger form that introspects a workflow's declared input schema.
- Ship a self-contained `test-server` (`test-server/server.ts`) with real Postgres and Redis testcontainers for Playwright E2E and k6 load benchmarks.

## Key exports

- React components exported from the package root.
- Styles at `@goatlab/delphi-ui/styles.css`.

## Test server

`test-server/server.ts` spins up Postgres and Redis via testcontainers, registers all executors, and wires queue-first ingestion. It supports Node cluster mode (`CLUSTER_MODE=auto` forks one worker per CPU core minus one) and is load-tested with `packages/delphi-core/loadtest/k6-workflow.js`.

Key env vars for the test server:

| Env | Default | Purpose |
|---|---|---|
| `PORT` | 4444 | HTTP port |
| `PG_POOL_SIZE` | 20 | Postgres pool per process |
| `WORKER_CONCURRENCY` | 50 | BullMQ concurrency per queue per process |
| `CLUSTER_MODE` | `auto` | `auto`, `off`, or an integer |

## HTTP surface (test server)

The test server exposes the full engine HTTP API: `POST /workflows/start`, `/workflows/start-async`, `/workflows/start-batch`, `/workflows/status`, `/workflows/cancel`, `/workflows/human-input`, `/workflows/signal`, `/workflows/query`, `/workflows/ingest-event`, `/workers/*`, `GET /health`.

## Development

```bash
VITE_API_URL=http://localhost:4444 pnpm dev   # dashboard dev server (port 5173)
pnpm test:server                               # test server
npx playwright test e2e/workflow-editor.spec.ts
```

## Published package

Package name `@goatlab/delphi-ui` is published to npm and consumed in production. Do not rename.

## Relationships

- Visualises runs produced by `@goatlab/delphi-core`.
- Test server registers executors from `delphi-ai`, `delphi-sandbox`, and `delphi-langgraph`.
