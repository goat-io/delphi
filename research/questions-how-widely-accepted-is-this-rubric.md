---
leafId: leaf_4864537bc3c54078ac11fd3f
trigger: OPEN_QUESTION
verdict: extraction-noise
source: rfcs/RFC-0005-Evaluation-and-Rubrics.md
sourceLines: "305-311"
date: 2026-06-13
---

# Verdict: Extraction Noise

The text "Questions: How widely accepted is this rubric?" is not a genuine open research question. It is one of three illustrative interrogative templates appearing in RFC-0005 §Rubric Confidence (lines 305–311), listed to define the *dimensions* by which a Rubric's own confidence score is measured:

> Questions:
> How widely accepted is this rubric?
> How much evidence supports it?
> How successful have outcomes been?

The pronoun "this rubric" has no antecedent — there is no specific rubric being queried. The three questions collectively describe a meta-evaluation pattern, not a concrete research task.

## Declarative Beliefs Derived From Context

Rubric confidence is a first-class concept in Delphi: a Rubric is not assumed to be authoritative simply because it exists.

A Rubric's confidence is determined by three dimensions: (1) social acceptance (how widely the rubric is used or endorsed), (2) evidential support (how many successful applications back it), and (3) outcome quality (how well evaluations using the rubric predict real-world results).

These three dimensions are defined in the RFC as a reusable interrogative template applicable to *any* rubric in the Brain, not a specific one.

The pattern is analogous to the `confidence` object already present on every `RUBRIC` leaf in `brain/leaves.jsonl`, which includes `consensus`, `evidenceStrength`, `sourceDiversity`, `sourceReliability`, and `freshness` sub-scores — a direct implementation of RFC-0005 §Rubric Confidence.

## Evidence

- `rfcs/RFC-0005-Evaluation-and-Rubrics.md` lines 301–312: §Rubric Confidence defines the three interrogative dimensions.
- `brain/leaves.jsonl`: Every `RUBRIC`-kind leaf carries a `confidence` object with sub-scores that operationalize these dimensions (e.g. `leaf_1815851910634e608d7bb0ba` Cycle Atomicity Rubric, `leaf_14098a77fa184dd09f6a062a` Origin Push Rubric).
- Prior art: `research/what-evidence-contradicts-this.md` — same extraction-noise class: a reusable methodology template fragment with no specific referent, classified as noise by the same reasoning.
