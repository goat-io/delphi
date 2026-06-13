---
name: apis-and-protocol-surface
type: research
status: closed
region: Spec
topics:
  - api
  - contracts
  - events
  - federation
  - mcp
  - versioning
  - agent-contract
  - RFC-0014
sources:
  - rfcs/RFC-0014-APIs-and-Contracts.md
  - rfcs/RFC-0002-Leaf-Protocol.md
  - rfcs/RFC-0015-Migration-and-Versioning.md
---

# Delphi APIs & Protocol Surface

## Core Principle

RFC-0014 establishes that Brains communicate through contracts, never through
database access and never through internal implementation details. "The API is
the protocol." All interoperability — between brains, agents, and federation
partners — goes through the same versioned contract surface.

**Source:** RFC-0014 §"Core Principle" (lines 33–39).

## Six API Design Principles

RFC-0014 §"API Design Principles" (lines 43–51) defines the rules that govern
every Delphi API:

1. Brains own their data.
2. APIs expose capabilities.
3. Events expose change.
4. Federation uses APIs.
5. Agents use APIs.
6. Everything is versioned.

## Versioning Model

All APIs are versioned. Breaking changes require a new version; backwards-compatible
changes should avoid version bumps. The URL prefix is `/api/v1`, with future
versions at `/api/v2`, etc. "Protocols outlive implementations" — the contracts are
treated as more durable than any particular runtime.

**Source:** RFC-0014 §"API Versioning" (lines 53–67) and §"Canonical Rules" line 10.

## Authentication and Authorization

RFC-0014 recommends OIDC / OAuth2 / JWT for authentication. Authorization uses
six roles: Admin, Editor, Researcher, Evaluator, Reader, Agent. The Agent role
exists because agents interact with Brains through the same API surface as humans —
never through direct storage access.

**Source:** RFC-0014 §"Authentication" (lines 70–79) and §"Authorization" (lines 81–92).

## Leaf API Surface

| Operation | Method + Path |
|-----------|---------------|
| Create Leaf | `POST /api/v1/leaves` |
| Get Leaf | `GET /api/v1/leaves/{id}` |
| Update Leaf | `PATCH /api/v1/leaves/{id}` |
| Search Leaves | `GET /api/v1/search?q=...` |

`PATCH` does not mutate a leaf in place. It creates a new leaf version and emits
a `LEAF_UPDATED` event (RFC-0002). Prior versions remain readable. Leaves are
never hard-deleted; archival is a status change recorded as a `LEAF_ARCHIVED` event.

**Source:** RFC-0014 §"Leaf APIs" (lines 95–145).

## Evidence, Evaluation, Decision, Task APIs

Each primitive type has a standard create + get surface under its own resource
collection:

- `POST/GET /api/v1/evidence/{id}`
- `POST/GET /api/v1/evaluations/{id}`
- `POST/GET /api/v1/decisions/{id}`
- `PATCH /api/v1/tasks/{id}`

Research is a first-class concern: `POST /api/v1/questions`,
`POST /api/v1/research/tasks`, `GET /api/v1/research/findings/{id}`.

**Source:** RFC-0014 §"Evidence APIs" through §"Research APIs" (lines 144–204).

## MCP Surface

RFC-0014 §"MCP Surface" (lines 248–266) draws a clear division:

- **REST** is the protocol between Brains and external systems.
- **MCP** is the protocol between Brains and agents.

Every Brain should expose an MCP server mirroring the navigation-first retrieval
model with at minimum these tools:

- `navigate_index` (brain → domain → topic traversal)
- `get_leaf`
- `get_evidence`
- `trace_dependencies`
- `what_breaks_if`
- `query` (DQL, RFC-0024)

Agents never get raw database access through MCP — the same contracts apply.

## Agent Contract

Agents must **never directly modify storage**. The prescribed agent workflow is:

```
Task → Agent → Proposal → Validation → Event → Projection Update
```

Agents submit structured proposals:

```json
{
  "agentId": "research-agent",
  "action": "CREATE_BELIEF",
  "reasoning": "...",
  "evidence": []
}
```

**Source:** RFC-0014 §"Agent Contract" (lines 333–355) and §"Agent Workflow" (lines 356–363).

## Core Event Types

Every mutation emits an immutable event. RFC-0014 §"Core Events" (lines 306–330)
defines the canonical set:

| Event | Trigger |
|-------|---------|
| `LEAF_CREATED` | New leaf written |
| `LEAF_UPDATED` | PATCH creates new version |
| `LEAF_ARCHIVED` | Status change (never hard-delete) |
| `EVIDENCE_ADDED` | New evidence linked |
| `CONFIDENCE_CHANGED` | Confidence recalculated |
| `TASK_CREATED` | New task queued |
| `TASK_COMPLETED` | Task resolved |
| `DECISION_CREATED` | Decision recorded |
| `EVALUATION_CREATED` | Evaluation scored |
| `ONTOLOGY_CHANGED` | Ontology pack modified |

Every event carries an envelope with `eventId`, `eventType`, `brainId`, `entityId`,
`timestamp`, and `payload`.

## Federation Contract

Brains exchange Leaves, Evidence, Rubrics, Capabilities, and Ontology Packs.
Federation uses the same API contracts. Brains advertise their capabilities via a
Brain Manifest:

```json
{
  "brainId": "goatlab",
  "protocolVersion": "1.0.0",
  "ontologyPacks": ["@delphi/core"]
}
```

Federation endpoints: `POST /api/v1/federation/reference`,
`POST /api/v1/federation/import`, `GET /api/v1/federation/export/{id}`.

**Source:** RFC-0014 §"Federation APIs" (lines 269–285) and §"Brain Manifest" (lines 394–404).

## Pagination and Filtering

All collection APIs support `limit`, `offset`, and `cursor` pagination (cursor
preferred). Standard filters include: `kind`, `status`, `confidence`,
ontology type, `brain`, and `updatedAt`.

**Source:** RFC-0014 §"Pagination" and §"Filtering" (lines 419–449).

## Webhooks and Idempotency

Brains may subscribe to events via webhooks (Leaf, Research, Decision, Ontology
events). Mutating APIs should accept an `Idempotency-Key` header to allow safe
retries. Every mutation captures Actor, Reason, Timestamp, and Affected Objects
for full auditability.

**Source:** RFC-0014 §"Webhooks" (lines 451–473) and §"Idempotency" (lines 475–478).

## Canonical Rules

RFC-0014 §"Canonical Rules" (lines 511–523) defines the invariants that bind all
implementations:

1. APIs are versioned.
2. Events are immutable.
3. Agents submit proposals.
4. Brains own data.
5. Federation uses contracts.
6. Everything is auditable.
7. Contracts are backwards compatible when possible.
8. Breaking changes require version bumps.
9. Every event has provenance.
10. Protocols outlive implementations.
