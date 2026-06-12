# RFC-0012 — Decision Theory
## How Delphi Makes Better Decisions

Status: Draft
Depends On:
- RFC-0000
- RFC-0001
- RFC-0002
- RFC-0003
- RFC-0004
- RFC-0005
- RFC-0006
- RFC-0007
- RFC-0008
- RFC-0009
- RFC-0010

---

# Purpose

Knowledge exists to improve decisions.

Evaluation exists to improve decisions.

Research exists to improve decisions.

This RFC defines:

- Decisions
- Alternatives
- Tradeoffs
- Consequences
- Risk
- Uncertainty
- Reversibility
- Expected Value
- Decision Quality

---

# Core Principle

A decision is not a belief.

Belief:

TigerBeetle is suitable.

Decision:

Use TigerBeetle.

A decision may be good even when the outcome is bad.

A decision may be bad even when the outcome is good.

Decisions should be judged based on information available at the time.

---

# What Is A Decision?

A decision is a commitment to a course of action.

Decisions are first-class leaves.

Examples:

Use TigerBeetle

Expand into Chile

Adopt OAuth2

Hire Candidate A

---

# Decision Schema

```ts
interface Decision {
  id: string

  title: string

  description: string

  status:
    | "PROPOSED"
    | "APPROVED"
    | "REJECTED"
    | "SUPERSEDED"

  alternatives: string[]

  supportingBeliefs: string[]

  evaluations: string[]

  risks: string[]

  consequences: string[]
}
```

---

# Decision Inputs

Every decision should reference:

Beliefs

Evidence

Evaluations

Research

---

# Decision Outputs

Decisions create:

Plans

Tasks

Actions

Future Observations

---

# Alternatives

A decision without alternatives is weak.

Examples:

Alternative A:
TigerBeetle

Alternative B:
PostgreSQL

Alternative C:
FoundationDB

Alternatives should be explicit.

---

# Tradeoffs

Every decision involves tradeoffs.

Examples:

Performance
vs
Cost

Speed
vs
Reliability

Flexibility
vs
Complexity

Tradeoffs should be modeled.

---

# Tradeoff Schema

```ts
interface Tradeoff {
  dimension: string

  benefit: string

  cost: string

  rationale: string
}
```

---

# Risks

Risk represents uncertainty.

Examples:

Vendor Lock-In

Performance Unknowns

Operational Complexity

Legal Exposure

---

# Risk Schema

```ts
interface Risk {
  id: string

  description: string

  probability: number

  impact: number

  mitigation?: string
}
```

---

# Consequences

Every decision has consequences.

Immediate

Short-Term

Long-Term

Positive

Negative

Unknown

---

# Consequence Graph

Decision
→ Consequence
→ Consequence
→ Consequence

Delphi should model consequence chains.

---

# Reversibility

A key decision property.

Examples:

Database Migration
Low Reversibility

UI Color Change
High Reversibility

---

# Reversibility Scale

0.0
Irreversible

1.0
Fully Reversible

---

# Expected Value

Delphi should estimate expected value.

Simplified:

Expected Value =
Benefit × Probability

minus

Cost × Probability

---

# Opportunity Cost

Every decision excludes alternatives.

Question:

What are we not doing?

Opportunity costs should be explicit.

---

# Decision Confidence

Decisions inherit confidence from:

Beliefs

Evidence

Evaluations

Research Coverage

---

# Decision Quality

Quality is separate from outcome.

Decision Quality Factors:

Evidence Coverage

Evaluation Coverage

Alternative Coverage

Risk Analysis

Research Completeness

---

# Decision Rubrics

Decisions should be evaluated.

Examples:

Architecture Decision Rubric

Investment Decision Rubric

Hiring Decision Rubric

---

# Decision Debt

Decision debt occurs when:

No alternatives considered.

No evaluation performed.

Weak evidence.

Missing risks.

Poor documentation.

Decision debt creates tasks.

---

# Decision Lifecycle

Proposed
→ Evaluated
→ Approved
→ Executed
→ Observed
→ Reviewed

---

# Outcome Tracking

Decisions should be reviewed later.

Questions:

Was the expected outcome achieved?

What assumptions were wrong?

What was learned?

---

# Feedback Loops

Decision
→ Action
→ Observation
→ Knowledge Update
→ Future Decisions

This closes the Delphi loop.

---

# Multi-Agent Decisions

Recommended flow:

Research Agent
→ Evaluator Agent
→ Critic Agent
→ Planner Agent
→ Decision Review

---

# Human Oversight

Certain decisions should require humans.

Examples:

Legal

Medical

Hiring

Financial

Strategic

---

# Decision Lineage

Decisions should explain:

Which beliefs influenced them.

Which evidence was considered.

Which alternatives were rejected.

---

# Decision Graph

Relationships:

Decision
→ Uses
→ Belief

Decision
→ Uses
→ Evaluation

Decision
→ Creates
→ Task

Decision
→ Leads To
→ Consequence

---

# Canonical Questions

Why was this decision made?

What evidence supported it?

What alternatives existed?

What risks were considered?

How reversible is it?

What happened afterward?

Would we make the same decision again?

---

# Success Criteria

A Delphi system successfully implements this RFC when:

1. Decisions are first-class leaves.
2. Alternatives are explicit.
3. Tradeoffs are modeled.
4. Risks are tracked.
5. Consequences are linked.
6. Decision quality is measurable.
7. Outcome reviews are supported.
8. Decision debt is measurable.
9. Decisions improve future knowledge.
10. Better decisions emerge over time.
