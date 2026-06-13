---
name: indexes-answer-what-exists-here
type: research
status: closed
verdict: extraction-noise
leaf_id: leaf_687f99438b3e4c6099bb88c3
---

## Verdict

This is extraction noise. The fragment "Indexes answer: - What exists here?" was lifted verbatim from AGENTS.md and RFC-0019, where it appears as a spec definition, not an open question.

## Substantive Answer

Knowledge Indexes in Delphi answer the question "what exists here?" by providing compressed, hierarchical summaries of a knowledge region. Each index carries a `summary` (full description), a `summaryTiny` (token-efficient navigation hint), and pointers to child indexes and canonical leaves. When an agent enters a region, the index describes what leaves are present, which sub-topics exist, and what the most salient content is — without forcing the agent to read every leaf.

Indexes are generated projections, not canonical. Leaves remain the source of truth. The index is updated whenever the region's content changes, ensuring the "what exists here" answer stays current.

## Evidence

- **RFC-0019 §"Indexes should answer"** (line 364–368): "Indexes should answer: What exists here? What matters most? What should I read next?" — the three canonical questions an index must satisfy.
- **RFC-0019 §"Knowledge Index Schema"** (lines 94–130): the `summary` and `summaryTiny` fields are the structural realisation of the "what exists here" answer; `childIndexes` and `leafIds` make the region's contents discoverable.
- **RFC-0019 §"Core Principle"** (lines 32–44): the book-analogy (Table of Contents → Chapter → Section → Paragraph) confirms that indexes exist to orient agents before retrieval, which is precisely the "what exists here" function.
- **AGENTS.md §"Understanding ≠ Navigation"**: "Indexes explain: 'What exists here?'" — confirms the index role is orientation, not retrieval.
- **RFC-0007 §"Navigation First"**: mandates that agents navigate via indexes before issuing any retrieval call, relying on the "what exists here" answer to pick the right branch of the knowledge tree.
