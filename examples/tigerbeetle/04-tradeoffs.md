---
name: TigerBeetle Tradeoffs
owner: engineering
status: active
tags: [database, tradeoffs]
---

# TigerBeetle Tradeoffs

TigerBeetle is not a general purpose database. The schema is fixed to accounts and transfers by design. Complex relational queries require a separate analytical store.

## Operational Notes

Operating TigerBeetle requires understanding of its replication protocol. The fixed schema reduces flexibility for evolving domain models. Careful capacity planning improves cluster stability.
