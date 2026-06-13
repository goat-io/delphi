---
title: Temporal Queries and As-Of Semantics
region: Spec
kind: research
confidence: 0.68
sources:
  - rfcs/RFC-0024-Delphi-Query-Language-DQL.md
  - rfcs/RFC-0002-Leaf-Protocol.md
  - rfcs/RFC-0003-Knowledge-and-Confidence-Theory.md
  - rfcs/RFC-0022-Dependency-and-Impact-Propagation.md
  - rfcs/RFC-9999-Delphi-Specification-Index.md
---

# Temporal Queries and As-Of Semantics

## Status in the Specification

RFC-9999 lists **Temporal Queries** as a known open area:

> "Temporal Queries — as-of-time traversal; listed as DQL future extension"

RFC-0024 (Delphi Query Language) reserves temporal query syntax but does not specify
semantics. This research document captures what the spec implies about temporality
and what the future extension must define.

---

## Why Temporality Matters in a Knowledge System

Delphi stores **beliefs about reality** (RFC-0003 § Truth Model). Reality changes.
A belief that was true in 2023 may be false in 2026. A system that cannot answer
"what did we believe on 2024-01-01?" cannot support:

- Audit trails for decisions (RFC-0012 § Decision Lifecycle)
- Retrospective evaluation of past confidence (RFC-0005)
- Understanding why a dependency cascade happened at a specific point (RFC-0022)
- Federation import reconciliation when a source Brain changes its history

**Belief:** Temporal query support is a prerequisite for full decision traceability.

---

## What the Current Spec Implies

### Leaf Events (RFC-0002)

RFC-0002 defines that leaves carry an event log. Key event types include:
`CREATED`, `CONFIDENCE_UPDATED`, `MERGED`, `DEPRECATED`, `SUPERSEDED`.
Every event carries a timestamp. This means the full temporal history of a leaf exists
in principle — it is not exposed as a query interface yet.

### Confidence Over Time (RFC-0003)

RFC-0003 establishes that confidence is not static. Confidence changes when:
- New evidence is added or retracted
- Evaluations are updated
- Dependency confidence changes (via RFC-0022 propagation)

The confidence on a leaf at a past timestamp can theoretically be reconstructed from
the event log, but no query mechanism exists for this.

### Index Staleness Timestamps (RFC-0028)

RFC-0028 § Index Staleness specifies:

```ts
interface IndexStaleness {
  lastGeneratedAt: string
  changedLeafCount: number
  changeWeight: number
}
```

This provides temporal metadata on indexes. Reconstructing what an index said at a past
time requires replaying events — currently not supported.

---

## DQL Reserved Syntax (RFC-0024)

RFC-0024 introduces the Delphi Query Language. While temporal queries are listed as a
future extension, the eight DQL query categories established in that RFC provide the
framework into which temporal operators would fit:

The likely syntax for as-of queries would follow the pattern:

```
NAVIGATE Brain/Spec AS OF "2024-01-01"
FIND beliefs WHERE topic = "TigerBeetle" AS OF "2024-01-01"
```

The `AS OF` clause would pin the event log replay to a specific timestamp and return
the knowledge state as it was at that point.

---

## Implementation Requirements for As-Of Semantics

For temporal queries to work, the implementation must guarantee:

1. **Append-only event logs** — no event may be deleted or backdated. Events are the source
   of truth for temporal reconstruction. (RFC-0002 implies this; RFC-0031 § Audit Trail
   makes it explicit for candidates.)

2. **Timestamp precision** — RFC-0002 uses ISO-8601 timestamps throughout. Sub-second
   precision is necessary for high-throughput ingestion scenarios.

3. **Confidence event recording** — every confidence change must be an event, not an
   in-place update, or temporal confidence queries are impossible.

4. **Index history** — to answer "what did the Spec index say on date X?", either index
   versions must be stored or they must be regeneratable from leaf event history.

5. **Dependency graph at a point in time** — RFC-0022 propagation depends on the edge
   graph. As-of queries on impact analysis require the graph to be replayable.

---

## Temporal Query vs. Event Sourcing

Delphi's event log pattern (RFC-0002) is structurally compatible with event sourcing.
If leaf state is always derived by replaying events, then as-of queries are a matter of
replaying events up to a timestamp cutoff. The key constraint is:

**Belief:** As-of semantics are only correct if every state mutation is recorded as an
event. In-place updates without event records make temporal queries impossible without
additional infrastructure (e.g., row versioning in the storage layer).

---

## Impact on Federation

Cross-Brain as-of queries raise additional complexity. If Brain A imported a leaf from
Brain B on 2024-03-01, and Brain B later retracted that leaf, Brain A's local copy
diverges from the source. A temporal query against Brain A's import should reflect
what Brain A knew at the queried time, not what Brain B's current state is.

**Belief:** As-of semantics in a federated context are scoped to the queried Brain's
local event log, not the source Brain's event log.

---

## Canonical Beliefs

1. Temporal query support (AS-OF semantics) is a known DQL future extension, not yet
   specified in any RFC.
2. The leaf event log (RFC-0002) provides the data foundation for temporal reconstruction.
3. As-of semantics require append-only event logs and confidence-change events.
4. Index history for temporal queries requires either version storage or event-replay.
5. In federated contexts, as-of queries are scoped to the queried Brain's local log.
6. Full decision traceability (RFC-0012) depends on temporal query capability.
