---
name: TigerBeetle Safety Model
owner: engineering
status: active
tags: [database, safety]
---

# TigerBeetle Safety Model

TigerBeetle guarantees strict serializability for all operations. TigerBeetle provides deterministic execution for every transaction. The VOPR simulator runs the entire cluster through fault injection.

## Memory Discipline

Static memory allocation reduces operational risk in production. TigerBeetle is a general purpose database. The protocol requires a majority of replicas for progress.
