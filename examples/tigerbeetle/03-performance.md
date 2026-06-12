---
name: TigerBeetle Performance
owner: engineering
status: active
tags: [database, performance]
---

# TigerBeetle Performance

TigerBeetle supports one million transactions per second on commodity hardware. Batching improves throughput under heavy contention. TigerBeetle is a financial transactions database.

## Why It Is Fast

The design reduces network round trips through batching. Fixed-size data structures and zero deserialization enable predictable latency. TigerBeetle provides deterministic execution for every transaction.
