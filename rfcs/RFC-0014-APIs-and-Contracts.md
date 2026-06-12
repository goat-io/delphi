# RFC-0014 — APIs & Contracts
## The Delphi Protocol Surface

Status: Draft
Depends On:
- RFC-0000 through RFC-0013

---

# Purpose

This RFC defines the external contract of Delphi.

The purpose is to ensure:

- Brain interoperability
- Agent interoperability
- Federation compatibility
- Client compatibility

This RFC defines:

- REST APIs
- Event Contracts
- Agent Contracts
- Federation Contracts
- Versioning Rules

---

# Core Principle

Brains communicate through contracts.

Never through database access.

Never through internal implementation details.

The API is the protocol.

---

# API Design Principles

1. Brains own their data.
2. APIs expose capabilities.
3. Events expose change.
4. Federation uses APIs.
5. Agents use APIs.
6. Everything is versioned.

---

# API Versioning

All APIs must be versioned.

Example:

/api/v1

Future:

/api/v2

Breaking changes require new versions.

---

# Authentication

Recommended:

OIDC

OAuth2

JWT

---

# Authorization

Suggested roles:

- Admin
- Editor
- Researcher
- Evaluator
- Reader
- Agent

---

# Leaf APIs

## Create Leaf

POST /api/v1/leaves

Request:

```json
{
  "kind": "BELIEF",
  "title": "TigerBeetle is suitable for Walliver"
}
```

Response:

```json
{
  "id": "leaf_123"
}
```

---

# Get Leaf

GET /api/v1/leaves/{id}

---

# Update Leaf

PATCH /api/v1/leaves/{id}

PATCH does not mutate in place.

It creates a new leaf version and emits LEAF_UPDATED (RFC-0002).

Prior versions remain readable.

---

# Search Leaves

GET /api/v1/search?q=...

---

# Evidence APIs

Create Evidence

POST /api/v1/evidence

Get Evidence

GET /api/v1/evidence/{id}

---

# Evaluation APIs

Create Evaluation

POST /api/v1/evaluations

Get Evaluation

GET /api/v1/evaluations/{id}

---

# Decision APIs

Create Decision

POST /api/v1/decisions

Get Decision

GET /api/v1/decisions/{id}

---

# Task APIs

Create Task

POST /api/v1/tasks

Update Task

PATCH /api/v1/tasks/{id}

---

# Research APIs

Create Question

POST /api/v1/questions

Create Research Task

POST /api/v1/research/tasks

Get Findings

GET /api/v1/research/findings/{id}

---

# Ontology APIs

Get Types

GET /api/v1/ontology/types

Create Type

POST /api/v1/ontology/types

Create Migration

POST /api/v1/ontology/migrations

---

# Capability APIs

Get Capabilities

GET /api/v1/capabilities

Create Capability

POST /api/v1/capabilities

---

# Brain APIs

Get Brain

GET /api/v1/brains/{id}

Brain Health

GET /api/v1/brains/{id}/health

---

# MCP Surface

REST is the protocol between Brains and systems.

MCP is the protocol between Brains and agents.

Every Brain should expose an MCP server mirroring the
navigation-first retrieval model:

- navigate_index (brain → domain → topic)
- get_leaf
- get_evidence
- trace_dependencies
- what_breaks_if
- query (DQL, RFC-0024)

Agents never get raw database access through MCP —
the same contracts apply (see DELPHI-MVP-0002 for prior art).

---

# Federation APIs

Reference Leaf

POST /api/v1/federation/reference

Import Leaf

POST /api/v1/federation/import

Export Leaf

GET /api/v1/federation/export/{id}

---

# Event Model

Every change emits an event.

---

# Event Envelope

```json
{
  "eventId": "evt_123",
  "eventType": "LEAF_CREATED",
  "brainId": "goatlab",
  "entityId": "leaf_123",
  "timestamp": "2026-01-01T00:00:00Z",
  "payload": {}
}
```

---

# Core Events

LEAF_CREATED

LEAF_UPDATED

LEAF_ARCHIVED

Leaves are never hard-deleted (RFC-0002, RFC-0015).
Archival is a status change, recorded as an event.

EVIDENCE_ADDED

CONFIDENCE_CHANGED

TASK_CREATED

TASK_COMPLETED

DECISION_CREATED

EVALUATION_CREATED

ONTOLOGY_CHANGED

---

# Agent Contract

Agents should never directly modify storage.

Agents submit proposals.

---

# Proposal Schema

```json
{
  "agentId": "research-agent",
  "action": "CREATE_BELIEF",
  "reasoning": "...",
  "evidence": []
}
```

---

# Agent Workflow

Task
→ Agent
→ Proposal
→ Validation
→ Event
→ Projection Update

---

# Validation APIs

Validate Proposal

POST /api/v1/validation/proposals

Validate Ontology

POST /api/v1/validation/ontology

---

# Federation Contract

Brains exchange:

Leaves

Evidence

Rubrics

Capabilities

Ontology Packs

---

# Brain Manifest

```json
{
  "brainId": "goatlab",
  "protocolVersion": "1.0.0",
  "ontologyPacks": [
    "@delphi/core"
  ]
}
```

---

# Compatibility Rules

Brains must advertise:

Protocol Version

Ontology Versions

Supported Features

---

# Pagination

All collections should support:

limit

offset

cursor

Cursor pagination preferred.

---

# Filtering

Support:

kind

status

confidence

ontology type

brain

updatedAt

---

# Webhooks

Brains may subscribe to:

Leaf Events

Research Events

Decision Events

Ontology Events

---

# Webhook Contract

```json
{
  "eventType": "LEAF_UPDATED",
  "entityId": "leaf_123"
}
```

---

# Idempotency

Mutating APIs should support:

Idempotency-Key

---

# Auditability

Every mutation should capture:

Actor

Reason

Timestamp

Affected Objects

---

# Error Model

Example:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Rubric not found"
}
```

---

# Canonical Rules

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

---

# Success Criteria

A Delphi implementation successfully implements this RFC when:

1. Brains can interoperate.
2. Agents can operate through APIs.
3. Events describe all changes.
4. Federation works through contracts.
5. Versioning is enforced.
6. Compatibility is measurable.
7. Auditability is guaranteed.
8. Validation is centralized.
9. APIs remain implementation-independent.
10. The protocol can support multiple runtimes.
