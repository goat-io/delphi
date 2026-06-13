---
title: "Examples: - Can TigerBeetle recover after node failure?"
leaf_id: leaf_2f1ce1e194394cef98657a5e
type: noise-verdict
date: 2026-06-13
status: closed
verdict: extraction-noise
---

# Verdict: Extraction Noise

This leaf is not a genuine open research question. It is an extraction artifact.

## What Happened

The extractor merged two adjacent text elements from RFC-0003 §Questions:

```
Examples:

- Can TigerBeetle recover after node failure?
- Which architecture scales better?
```

The "Examples:" label and the first bullet were concatenated into a single candidate leaf: `Examples: - Can TigerBeetle recover after node failure?`. This is a rhetorical fragment, not a standalone research question.

## Why This Is Noise

1. The phrase "Can TigerBeetle recover after node failure?" is used in RFC-0003 only to *illustrate* what a Question leaf looks like — it is a teaching example, not a question the Delphi brain is expected to answer.
2. TigerBeetle does not appear anywhere in the Delphi codebase as a dependency. It is referenced in the RFCs solely as a named-entity example in decision theory (RFC-0012), knowledge economics (RFC-0011), example brains (RFC-0016), and index lifecycle (RFC-0028).
3. Delphi's own storage layer uses PostgreSQL / PGlite, not TigerBeetle. No research on TigerBeetle's failure-recovery properties is required by any Delphi component.
4. The sibling bullet ("Which architecture scales better?") was correctly discarded as too vague; this bullet should have been discarded as contextually non-applicable for the same reason.

## Evidence

- RFC-0003-Knowledge-and-Confidence-Theory.md, §Questions (lines 149–157): lists "Can TigerBeetle recover after node failure?" under "Examples:" as a pedagogical illustration.
- RFC-0008-Agents-and-Research-Engine.md, line 330: "Can TigerBeetle survive region failure?" — same pattern, different wording, same purpose.
- RFC-0011-Knowledge-Economics.md, lines 143–149: uses "Can TigerBeetle survive region failure?" as an example question with high potential impact, again pedagogical.
- RFC-0012-Decision-Theory.md, lines 46–52: TigerBeetle used as example belief/decision pair, not a live architectural choice for Delphi.
- Codebase grep: no import, dependency, or config referencing TigerBeetle exists in packages/ or apps/.

## Disposition

This leaf should be marked as `NOISE` or `CLOSED` in the Brain. No research is warranted. The extraction pipeline (delphi-extraction) should be improved to detect and discard list-item bullets that appear under illustrative "Examples:" headers in specification documents when the named entity is not present in the codebase.
