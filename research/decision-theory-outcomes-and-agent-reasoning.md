---
name: decision-theory-outcomes-and-agent-reasoning
type: research
status: closed
region: Spec
topics:
  - decision-theory
  - outcome-review
  - risk-modeling
  - agent-reasoning
  - decision-lifecycle
  - reversibility
  - RFC-0012
  - RFC-0022
  - RFC-0008
sources:
  - rfcs/RFC-0012-Decision-Theory.md
  - rfcs/RFC-0022-Dependency-and-Impact-Propagation.md
  - rfcs/RFC-0008-Agents-and-Research-Engine.md
  - rfcs/RFC-0011-Knowledge-Economics.md
---

# Decision Theory, Outcome Review, and Agent Reasoning in Delphi

## How Should Agents Reason About Decisions?

RFC-0012 §"Core Principle" establishes the foundational distinction:

> A decision is not a belief.
> Belief: TigerBeetle is suitable.
> Decision: Use TigerBeetle.

Agents reason about decisions through the multi-agent review flow defined
in RFC-0012 §"Multi-Agent Decisions":

```
Research Agent   → produces evidence-backed beliefs
Evaluator Agent  → scores against rubrics
Critic Agent     → challenges assumptions, surfaces risks
Planner Agent    → proposes implementation consequences
Decision Review  → commits to a course of action
```

The critical principle: a decision should be judged based on **information
available at the time**, not on the eventual outcome. A good decision can
produce a bad outcome; a bad decision can produce a good outcome. Agents
must distinguish decision quality from outcome quality.

**Source:** RFC-0012 §"Core Principle" (lines 50–70), §"Multi-Agent
Decisions" (lines 192–202).

## Would We Make the Same Decision Again?

This is the outcome review question. RFC-0012 §"Outcome Tracking" specifies
that every decision should be reviewed post-execution:

Questions the review must answer:
1. Was the expected outcome achieved?
2. What assumptions were wrong?
3. What was learned?

The Decision Lifecycle (RFC-0012 §"Decision Lifecycle") runs:
```
Proposed → Evaluated → Approved → Executed → Observed → Reviewed
```

The final "Reviewed" state is where "Would we make the same decision again?"
is answered. If supporting beliefs changed (via RFC-0022 propagation), the
review is triggered automatically with `status: REVIEW_REQUIRED`.

**Source:** RFC-0012 §"Outcome Tracking" (lines 155–168), §"Decision
Lifecycle" (lines 148–153), RFC-0022 §"Decision Reassessment" (lines 148–157).

## Risk — What Happens If This Is Wrong?

RFC-0012 §"Risks" defines risk as uncertainty that may produce harm:

Risk Schema:
```ts
interface Risk {
  id: string
  description: string
  probability: number  // 0.0–1.0
  impact: number       // 0.0–1.0
  mitigation?: string
}
```

The expected harm formula combines probability and impact:
```
Expected Harm = probability × impact
```

RFC-0022 §"Knowledge Shockwaves" shows how being wrong propagates:

```
Wrong Medical Belief
↓ Treatment Belief updates
↓ Clinical Guidelines update
↓ Hospital Procedures update
↓ Training Materials update
```

The higher the propagation depth, the higher the risk. RFC-0022 §"Impact
Radius" classifies risk outcomes as Low / Medium / High / Critical based
on how many downstream consumers are affected.

**Source:** RFC-0012 §"Risks" (lines 92–108), §"Risk Schema" (lines 110–120),
RFC-0022 §"Knowledge Shockwaves" (lines 173–190), §"Impact Radius" (lines 192–200).

## Which Evaluations Are Affected When a Belief Changes?

RFC-0022 §"Evaluation Impact" and §"Dependency Types" define:

> Evaluations should track dependencies. Changes trigger re-evaluation.

Example:
```
Architecture Review
  Depends On: Scalability Analysis
  Depends On: Reliability Assessment

→ If Reliability Assessment changes:
  Architecture Review becomes STALE
  → Re-evaluation task is generated
```

The Propagation Engine (RFC-0022 §"Propagation Engine") is the runtime
component responsible for detecting these staleness events and generating
re-evaluation tasks automatically.

**Source:** RFC-0022 §"Evaluation Impact" (lines 160–172), §"Dependency
Types" — Evaluation Dependency (lines 75–82), §"Propagation Engine"
(lines 205–215).

## What Changes If This Becomes False?

This is answered by the `what_breaks_if` query. RFC-0022 §"Canonical
Questions" lists it explicitly:

> What breaks if this changes?

The impact analysis covers three levels (RFC-0022 §"Impact Categories"):

1. **Direct Impact** — immediate first-hop dependents (e.g., Gravity → Orbital Mechanics)
2. **Indirect Impact** — transitive dependents (Gravity → Orbital Mechanics → GPS)
3. **Systemic Impact** — domain-wide consequences (Gravity affects Physics, Engineering, Astronomy, Navigation)

When a belief becomes false, the Propagation Engine:
1. Recalculates confidence for all dependent beliefs (confidence cannot
   increase through dependency chains without independent evidence)
2. Sets affected decisions to `REVIEW_REQUIRED`
3. Marks affected evaluations as stale
4. Triggers index regeneration for affected regions
5. Generates research tasks to fill the resulting knowledge gaps

**Source:** RFC-0022 §"Canonical Questions" (lines 228–238),
§"Impact Categories" (lines 100–130), §"Propagation Rules" (lines 143–152),
§"Confidence Shockwaves" (lines 155–170).

## Is This Relationship Ambiguous?

RFC-0022 §"Dependency Types" defines six relationship types to remove
ambiguity:

| Type | When to Use |
|------|-------------|
| Logical Dependency | A belief requires another belief to remain valid |
| Evidence Dependency | A belief depends on specific evidence |
| Decision Dependency | A decision depends on beliefs |
| Evaluation Dependency | An evaluation depends on criteria |
| Ontology Dependency | A concept depends on classifications |
| Index Dependency | Indexes depend on leaves (auto-regenerated) |

A relationship is ambiguous when it could be classified as more than one
type. The resolution rule: use the most specific type that accurately
represents the relationship. If still ambiguous, use Logical Dependency
as the default.

**Source:** RFC-0022 §"Dependency Types" (lines 60–95).

## Which School of Thought Supports It?

RFC-0012 §"Decision Inputs" requires decisions to reference:
- Beliefs (which themselves cite evidence and schools of thought)
- Evaluations (which apply rubrics reflecting methodological frameworks)

For Delphi itself, RFC-0012 draws on expected value theory (§"Expected
Value"), portfolio theory (RFC-0011 §"Research Portfolio"), and
Bayesian confidence propagation (RFC-0022 §"Confidence Propagation").

The evidence provenance chain (RFC-0004) carries the original source's
methodology and consensus status, so "which school of thought supports it"
is answerable by tracing evidence back to its original works.

**Source:** RFC-0012 §"Decision Inputs" (lines 80–92), RFC-0004 §"Evidence
Schema", RFC-0022 §"Confidence Propagation" (lines 135–145).

## Decision Debt

RFC-0012 §"Decision Debt" defines decision debt as occurring when:
- No alternatives considered
- No evaluation performed
- Weak evidence
- Missing risks
- Poor documentation

Decision debt creates work items (tasks). The presence of decision debt
is a signal that a decision was made below the quality threshold and
should be either re-evaluated or marked as a known technical/knowledge
debt item.

**Source:** RFC-0012 §"Decision Debt" (lines 175–188).
