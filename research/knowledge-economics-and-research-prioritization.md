---
title: Knowledge Economics and Research Prioritization
region: Spec
sources:
  - rfcs/RFC-0011-Knowledge-Economics.md
  - rfcs/RFC-0022-Dependency-and-Impact-Propagation.md
  - rfcs/RFC-0012-Decision-Theory.md
  - rfcs/RFC-0026-Tasks-and-Questions.md
confidence: 0.88
---

# Knowledge Economics and Research Prioritization

## Core Thesis

A Brain that cannot prioritize what to learn next will waste its research capacity on
low-value uncertainty. RFC-0011 defines the economic framework that prevents this:
knowledge has value, uncertainty has cost, and research should maximize expected
value created per unit of effort.

The fundamental constraint is finite capacity: time, compute, agent cycles, and human
attention are all limited. RFC-0011 asserts this explicitly — "A Brain can never learn
everything. Time is limited. Attention is limited. Compute is limited."

## Knowledge as an Asset

RFC-0011 models knowledge as a productive asset, not a static record. A belief that
supports many decisions has higher value than an isolated fact. A belief that reduces
risk in high-stakes domains has higher value than one that does not.

Knowledge value dimensions (RFC-0011):

- **Decision Impact** — how many decisions depend, directly or transitively, on this belief
- **Risk Reduction** — does knowing this prevent a downstream failure or cascade
- **Revenue / Cost Impact** — economic consequence of being wrong
- **Strategic Importance** — alignment with active goals
- **Research Reusability** — can this knowledge feed multiple downstream beliefs

## Knowledge Debt

Knowledge Debt is the accumulated cost of uncertainty. RFC-0011 defines it conceptually as:

```
Knowledge Debt = Importance × Uncertainty
```

Debt arises from:
- Missing evidence (beliefs held without citation)
- Weak confidence (beliefs below the desired threshold)
- Unanswered questions (open questions without assigned research)
- Ontology gaps (concepts that cannot be classified)
- Open contradictions (conflicting beliefs with no resolution)

High debt in a high-impact region is an active threat to decision quality.

## Research ROI

RFC-0011 treats research as investment. The return is knowledge value created; the cost is
agent effort expended. The ROI formula:

```
Research ROI = Knowledge Value Created ÷ Research Cost
```

The canonical example in RFC-0011: "Can TigerBeetle survive region failure?" has very high
potential impact (a production architecture decision) and medium research cost (a bounded
technical investigation), producing a high ROI. This task should be prioritized over
low-impact uncertainty about, say, button color preferences.

## Priority Score

RFC-0011 gives the prioritization formula for ranking open questions and tasks:

```
Priority = Impact × Confidence Gap × Dependency Count × Risk Reduction
           ÷ Estimated Cost
```

Where:
- **Impact** — the count of transitively dependent leaves and decisions (per RFC-0022 dependency graph)
- **Confidence Gap** = Desired Confidence − Current Confidence (per RFC-0003 confidence model)
- **Dependency Count** — direct consumers of the target belief
- **Risk Reduction** — probability that completing this research prevents a downstream cascade
- **Estimated Cost** — projected effort in token-equivalents, updated after each execution

RFC-0030 applies this formula inside the Task Scheduler to produce the active task queue
ordering. The queue is rebuilt on every significant knowledge-state change.

## Cost of Uncertainty

Every unresolved uncertainty carries a cost, even when nothing is actively breaking.
RFC-0011 states:

```
Cost of Uncertainty ≈ Probability of Being Wrong × Impact of Being Wrong
```

High-impact beliefs with low confidence create the greatest urgency. A medical diagnosis
uncertainty is more expensive than a UI preference uncertainty.

## Research Portfolio

RFC-0011 recommends maintaining a structured portfolio to avoid over-indexing on any
one category. Suggested allocation:

- 70% Strategic Research — high-impact, high-confidence-gap beliefs
- 20% Operational Research — blocking open questions with active tasks waiting
- 10% Exploratory Research — speculative hypotheses with no immediate dependency

Exploratory research matters because it seeds future compounding: understanding a concept
early may enable 10 downstream beliefs to be formed at much lower cost later.

## Knowledge Compounding

RFC-0011 identifies compounding as the strongest multiplier of research value. A foundational
belief — like understanding how PostgreSQL handles MVCC — may directly support beliefs about
storage design, caching strategy, analytics queries, and migration safety simultaneously.
Knowledge with compounding effects should be prioritized over equivalent-effort isolated facts.

## Brain Health Metrics

RFC-0011 defines the metrics by which a Brain's research health is measured:

| Metric | Meaning |
|---|---|
| Average Confidence | Mean confidence across all active beliefs |
| Knowledge Debt | Weighted sum of (Importance × Uncertainty) across open questions |
| Research ROI | Rolling average of value created per task completed |
| Decision Quality | Fraction of decisions backed by high-confidence evidence |
| Evaluation Coverage | Fraction of beliefs that have at least one evaluation |
| Open Questions | Count of active QUESTION leaves without an assigned research task |

These metrics are surfaced in the Delphi Evolution Dashboard (see the evolution.log.md).

## Research Waste

RFC-0011 identifies four sources of research waste to eliminate:

1. **Duplicate research** — the same question investigated twice without knowledge of the prior run
2. **Already-answered questions** — creating new tasks for questions already CLOSED in the brain
3. **Low-value uncertainty** — exploring beliefs with near-zero impact and dependency count
4. **Ignored evidence** — evidence that exists but has not been linked to beliefs

The Brain's deduplication logic (RFC-0031 candidate staging) directly prevents the first
two categories by checking for existing leaves before creating new ones.

## Answered Questions

**Q: How does the Brain decide which of 1000 open questions to research first?**

It applies the priority formula from RFC-0011, using the dependency graph from RFC-0022
to compute Impact and Dependency Count, and the confidence model from RFC-0003 to
compute Confidence Gap. The result is a deterministic, fully explainable rank order.
The Task Scheduler (RFC-0030) maintains this as a live queue.

**Q: What prevents the research queue from growing without bound?**

RFC-0030 prunes the queue when tasks are superseded, duplicate, or when the originating
question is closed. RFC-0011's budget constraints (reserving capacity for critical and
human-request origins) further bound the active queue.

**Q: How is research cost estimated before a task runs?**

RFC-0011 acknowledges that cost defaults by task type and is updated post-execution.
Over time, the Brain accumulates cost-estimate calibration data and improves its forecasts.

**Q: Does high confidence mean a belief is correct?**

No. RFC-0003 and RFC-0021 are explicit: Delphi stores beliefs, not truth. High confidence
means the evidence supports the belief strongly. It does not mean the belief cannot later
be revised. The confidence model allows downward revision when contradicting evidence arrives.
