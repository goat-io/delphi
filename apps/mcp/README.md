---
name: "delphi-mcp — Model Context Protocol Server"
description: "MCP server exposing the Delphi brain as seven tools for LLM agents: navigate_index, search, get_leaf, trace_dependencies, what_breaks_if, ask, and propose_knowledge."
owner: engineering
status: active
tags: [delphi, knowledge-plane]
---

# delphi-mcp

`delphi-mcp` makes the Delphi knowledge brain available to LLM agents over the Model Context Protocol. It connects to the same PGlite or PostgreSQL database used by the bootstrap pipeline and registers seven MCP tools that expose navigation, search, leaf inspection, dependency tracing, impact analysis, question answering, and knowledge proposal. The server implements the MCP surface described in RFC-0014 (APIs and Contracts) and the self-improvement loop described in DELPHI-MVP-0003 (Delphi Builds Delphi).

On startup the server requires the brain named `"delphi"` to exist — created by `pnpm brain:bootstrap` — and exits with an error if it is absent. The data directory defaults to `.delphi/brain` and can be overridden with the `DELPHI_DATA_DIR` environment variable. Communication uses the stdio transport from `@modelcontextprotocol/sdk`, so the process is driven by a host that spawns it as a subprocess.

The `propose_knowledge` tool allows an agent to write new knowledge directly into the brain. For `DECISION` kind it creates a DECISION leaf directly in the `Decisions` region. For `OBJECT`, `BELIEF`, and `QUESTION` kinds it creates a synthetic asset and chunk for the session and runs the full `canonicalize` + `resolveCandidate` pipeline, meaning proposed knowledge is subject to the same entity resolution logic as file-ingested knowledge. A single session-scoped asset is reused across all `propose_knowledge` calls within one server process.

## Key exports

The package exposes no TypeScript API; its sole entry point is the MCP server process started by `pnpm mcp`.

## Behavior

The server resolves the brain by name on startup and caches the `brainId` for the lifetime of the process; it does not support switching brains at runtime. The `navigate_index` tool returns all regions with their `summaryTiny`, `keyConcepts`, and `keyQuestions` when called without a `region` argument, enabling an agent to survey the full knowledge structure before drilling in. The `trace_dependencies` tool traverses `DEPENDS_ON` edges to a configurable depth of 1 or 2 hops, returning source and target titles alongside IDs so an agent does not need a secondary `get_leaf` call for display purposes. The `what_breaks_if` tool performs a reverse BFS over incoming `DEPENDS_ON` edges to find all transitively dependent leaves, then appends any `DECISION` leaves related to the impacted set, marking them with hops value 99 to indicate indirect relationship. The `ask` tool delegates entirely to `answerQuestion` and returns the full `AnswerResult` JSON including the navigation path, so an agent can trace exactly which index region was consulted.
