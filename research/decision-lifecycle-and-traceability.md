---
name: decision-lifecycle-and-traceability
type: research
status: closed
region: Spec
topics:
  - decisions
  - decision-lifecycle
  - traceability
  - RFC-0012
sources:
  - rfcs/RFC-0012-Decision-Theory.md
  - rfcs/RFC-0022-Dependency-and-Impact-Propagation.md
  - rfcs/RFC-0026-Tasks-and-Questions.md
---

# Decisions in Delphi: Lifecycle, Schema, and Traceability

## Core Principle: Decisions Are Not Beliefs

A decision is a commitment to a course of action, distinct from any belief that
supports it. The belief "TigerBeetle is suitable" may remain true while the
decision "Use TigerBeetle" is reversed. Decisions are judged on the quality of
the information available at the time they were made, not on outcomes alone.

**Source:** RFC-0012 §"Core Principle" (lines 44–60) and
RFC-0003 §"Decision Separation" (lines 444–462).

## Decision Schema

Decisions are first-class leaves (`LeafKind: DECISION`). Their schema
(RFC-0012 §"Decision Schema", lines 80–106):

```ts
interface Decision {
  id: string
  title: string
  description: string
  status: "PROPOSED" | "APPROVED" | "REJECTED" | "SUPERSEDED"
  alternatives: string[]       // explicit rejected alternatives
  supportingBeliefs: string[]  // beliefs that informed the decision
  evaluations: string[]        // evaluations used
  risks: string[]
  consequences: string[]
}
```

Every decision **must** reference the beliefs, evidence, and evaluations that
informed it. A decision without alternatives is considered weak per RFC-0012
§"Alternatives" (lines 138–153).

## Lifecycle

```
Proposed → Evaluated → Approved → Executed → Observed → Reviewed
                                          ↘ Superseded
```

Outcome reviews answer (RFC-0012 §"Outcome Tracking", lines 385–397):
- Was the expected outcome achieved?
- What assumptions were wrong?
- What was learned?

**Source:** RFC-0012 §"Decision Lifecycle" (lines 374–383).

## Decision Quality Is Measured Independently of Outcome

Decision quality factors (RFC-0012 §"Decision Quality", lines 325–338):

1. Evidence Coverage
2. Evaluation Coverage
3. Alternative Coverage
4. Risk Analysis
5. Research Completeness

A decision can be high-quality with a bad outcome, or low-quality with a good
outcome. Quality measures the rigor of the process; outcomes measure the world's
response.

## Tradeoffs, Risks, and Consequences

Every decision in Delphi models:

**Tradeoffs** (RFC-0012 §"Tradeoff Schema", lines 178–194):
```ts
interface Tradeoff {
  dimension: string  // e.g. "Performance"
  benefit: string
  cost: string
  rationale: string
}
```

**Risks** (RFC-0012 §"Risk Schema", lines 210–226):
```ts
interface Risk {
  id: string
  description: string
  probability: number  // [0,1]
  impact: number       // [0,1]
  mitigation?: string
}
```

**Consequences** are modeled as chains (RFC-0012 §"Consequence Graph"):
`Decision → Consequence → Consequence → ...`

## Reversibility

Every decision carries a reversibility score in `[0.0, 1.0]`. A database
migration scores near 0.0 (irreversible); a UI color change scores near 1.0
(fully reversible). Reversibility informs how much evidence is required before
committing. **Source:** RFC-0012 §"Reversibility" (lines 258–281).

## Expected Value

Delphi estimates expected value for decisions (RFC-0012 §"Expected Value"):

```
Expected Value = (Benefit × Probability) − (Cost × Probability)
```

Opportunity cost — what alternatives are excluded by committing — must also be
made explicit.

## Decision Debt

Decision debt (RFC-0012 §"Decision Debt", lines 355–370) accumulates when:
- No alternatives were considered
- No evaluation was performed
- Evidence is weak
- Risks are missing
- Documentation is poor

Decision debt generates tasks automatically (trigger: `EVIDENCE_DEBT` or
`EVALUATION_DEBT` per RFC-0026 §"Task Origin").

## Impact Propagation: When Supporting Beliefs Change

When a belief that supports a decision weakens or is contradicted, the decision
enters `REVIEW_REQUIRED` status (RFC-0022 §"Decision Reassessment", lines
345–353). A `REVIEW` task is automatically created. This is the feedback loop
that keeps decisions coherent with the current state of knowledge.

```
Supporting Belief confidence drops
→ Decision.status = REVIEW_REQUIRED
→ REVIEW Task created (RFC-0026 trigger: DEPENDENCY_CHANGE)
→ Decision re-evaluated against current beliefs
```

## Canonical Questions This Answers

- *What is a decision in Delphi?* — A first-class leaf committing to a course
  of action, distinct from the beliefs that support it.
- *How is decision quality measured?* — Five quality factors: evidence,
  evaluation, alternative, risk, and research coverage.
- *What happens to a decision when supporting beliefs weaken?* — It enters
  REVIEW_REQUIRED and a REVIEW task is generated.
- *Must alternatives be explicit?* — Yes; a decision without explicit
  alternatives is considered weak per RFC-0012.
- *How does Delphi track decision lineage?* — Via `supportingBeliefs`,
  `evaluations`, and `consequences` fields on the Decision schema.
