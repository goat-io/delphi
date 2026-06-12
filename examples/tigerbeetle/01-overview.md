---
name: TigerBeetle Overview
owner: engineering
status: active
tags: [database, ledger]
---

# TigerBeetle Overview

TigerBeetle is a distributed financial transactions database. TigerBeetle is designed for mission critical ledger workloads. The system uses the Viewstamped Replication protocol for consensus.

## Design Goals

TigerBeetle provides deterministic execution for every transaction. Deterministic execution enables simulation testing of the whole cluster. TigerBeetle is suitable for high-volume ledger workloads.

## Open Questions

Can TigerBeetle survive a full region failure? How does TigerBeetle compare to PostgreSQL for ledgers?
