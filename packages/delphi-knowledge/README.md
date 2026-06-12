---
name: "delphi-knowledge — Persistence Layer & BrainStore"
description: "Database abstraction, schema migration, and the BrainStore CRUD facade for all canonical Delphi entities."
owner: engineering
status: active
tags: [delphi, knowledge-plane]
---

# delphi-knowledge

`delphi-knowledge` is the persistence layer for the Delphi Knowledge Operating System. It owns the SQL schema, the migration runner, and the `BrainStore` class — the single interface through which every other package reads and writes canonical knowledge. The package implements the storage requirements described in RFC-0002 (Leaf Protocol) and RFC-0010 (Infrastructure and Runtime).

The database backend is selected at runtime: when the `DATABASE_URL` environment variable is present the package connects to a PostgreSQL server via the `pg` driver; when it is absent the package falls back to `@electric-sql/pglite`, an in-process PostgreSQL-compatible engine that stores data in a local directory. This dual-mode design allows the same code to run in development without a server and in production against a real Postgres cluster.

The `migrate` function creates all tables idempotently using `CREATE TABLE IF NOT EXISTS`. The schema covers brains, assets, chunks, leaves, leaf_events, relationships, evidence, regions, indexes, and maps. Composite indexes are created on brain_id, leaf_id, source/target relationship columns, and chunk asset_id to support the expected query patterns.

## Key exports

- `createDb(opts?)` — constructs and returns a `Db` instance backed by PGlite or pg depending on `DATABASE_URL`
- `migrate(db)` — runs all DDL statements idempotently; safe to call on every startup
- `BrainStore` — stateful facade providing typed CRUD and query methods for every entity type
- `Db` — interface with `query<T>(sql, params?)` and `close()` signatures

## Behavior

`BrainStore.createRelationship` uses `ON CONFLICT (source_leaf_id, target_leaf_id, type) DO NOTHING`, meaning duplicate relationship triples are silently de-duplicated rather than raising an error. Every `createLeaf` call appends a `LEAF_CREATED` event to the `leaf_events` table, and every `updateLeaf` call appends a `LEAF_UPDATED` event, providing a per-leaf audit trail. The `markRegionDirty` method increments `changed_leaf_count` and sets `stale = true` on the region's index row, signalling that the index needs regeneration. `searchLeaves` attempts Postgres full-text search first using `plainto_tsquery`; if no results are returned or if FTS is unavailable it falls back to ILIKE matching on words longer than three characters. The `health` method returns eight aggregate counters — leaves, beliefs, evidence, relationships, orphanBeliefs, avgConfidence, staleIndexes, and openQuestions — in a single round-trip set of queries.
