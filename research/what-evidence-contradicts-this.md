---
leaf_id: leaf_8e68071ef45049aba1a04d4e
question: "What evidence contradicts this?"
verdict: extraction_noise
region: Spec
answered_at: "2026-06-13"
---

# Verdict: Extraction Noise

The leaf "What evidence contradicts this?" is a rhetorical methodology fragment, not a researchable question.

## Why This Is Noise

The question was extracted from asset `asset_cdf7fa1603d549458a93a543`, chunk `chunk_af20af8572224d6989449533`, which contains this template block:

> What evidence supports this?
> What evidence contradicts this?
> What evidence is missing?
> ---
> A belief without evidence creates Knowledge Debt.

These three lines are a reusable prompting template for evaluating any belief — they appear in Delphi's own RFC documentation describing the Knowledge Debt model. The phrase "this" has no specific referent in isolation; it is a placeholder in an evaluation methodology, not a standalone question about a specific claim.

The repeated aliases ("What contradicts this?" × 3) confirm the extractor encountered this template multiple times across the same or similar source sections, further indicating it is structural methodology prose rather than domain knowledge.

## Evidence

- `brain/evidence.jsonl` — `evd_9457a1f29693498393a51144`: citation is the bare string "What evidence contradicts this?" extracted from the same chunk as the surrounding template questions.
- `brain/evidence.jsonl` — `evd_12db53cf62da402eaa8f76eb`, `evd_3b0c66dcb8d742e0a25a81b5`, `evd_8e8de73534fe41adb023cb47`: same chunk citation, all pointing to the Knowledge Debt methodology section.
- Delphi AGENTS.md / RFC philosophy: the Dependency Model section lists "What breaks if I become false?" and related prompts as methodology questions for belief evaluation — not as independent knowledge claims.

## Recommendation

Mark this leaf `ARCHIVED` or `DEPRECATED`. The underlying methodology (evaluate every belief for supporting evidence, contradicting evidence, and missing evidence) is correctly captured by the Knowledge Debt doctrine in the Spec region. No new belief needs to be created; no research is required.
