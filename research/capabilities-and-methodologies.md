---
name: capabilities-and-methodologies
type: research
status: closed
region: Spec
topics:
  - capabilities
  - methodologies
  - agent skills
  - capability debt
  - RFC-0013
sources:
  - rfcs/RFC-0013-Capabilities-and-Methodologies.md
  - rfcs/RFC-0000-Delphi-Constitution.md
---

# Capabilities and Methodologies in Delphi

## The Fourth Separation: Knowledge ≠ Capability

RFC-0013 introduces the fourth major separation in the Delphi meta-model:

- RFC-0000 separates Reality from Knowledge.
- RFC-0005 separates Knowledge from Evaluation.
- RFC-0012 separates Beliefs from Decisions.
- RFC-0013 separates **Knowledge from Capability**.

Knowing that WCAG exists is not the same as being able to perform an
accessibility audit. Knowing architecture concepts is not the same as being able
to review an architecture. Capabilities must be explicitly modelled.

**Source:** RFC-0013 §"Core Principle" (lines 35–52).

## What Is a Capability?

A Capability is the ability to perform a class of work. Capabilities are
first-class leaves in the Brain. Examples: Legal Research, Architecture Review,
Accessibility Audit, Scientific Analysis, Market Research, Financial Modeling,
Code Review.

```ts
interface Capability {
  id: string
  name: string
  description: string
  domain: string
  methodologies: string[]
  requiredKnowledge: string[]
  evaluationRubrics: string[]
}
```

**Source:** RFC-0013 §"What Is A Capability?" (lines 54–66) and §"Capability Schema" (lines 68–88).

## Capability Levels

RFC-0013 suggests a six-level competency scale (0–5):

| Level | Label |
|---|---|
| 0 | Unknown |
| 1 | Beginner |
| 2 | Intermediate |
| 3 | Advanced |
| 4 | Expert |
| 5 | Authority |

Agents (and humans) may have different levels per capability. This enables
precise task assignment — a Beginner-level Code Review agent should not perform
a critical Security Assessment.

**Source:** RFC-0013 §"Capability Levels" (lines 90–108).

## What Is a Methodology?

A Methodology is a repeatable process used to perform work. Methodologies are
first-class leaves. Examples: Scientific Method, Design Thinking, Legal
Reasoning, Root Cause Analysis, Architecture Review Process.

```ts
interface Methodology {
  id: string
  name: string
  description: string
  steps: MethodologyStep[]
  expectedOutputs: string[]
}

interface MethodologyStep {
  order: number
  name: string
  description: string
  inputs: string[]
  outputs: string[]
}
```

**Source:** RFC-0013 §"Methodology Schema" (lines 128–163).

## Capability Composition

Capabilities are not atomic — they are built from:
- **Knowledge** (what the agent knows about the domain)
- **Methodologies** (how the agent performs the work)
- **Experience** (past execution history)
- **Evaluation** (rubric-based quality measurement)

This composition model means a capability gap can be diagnosed at the component
level: missing knowledge, missing methodology, missing evaluation rubric, or
insufficient experience.

**Source:** RFC-0013 §"Capability Composition" (lines 177–189).

## Capability Dependencies

Capabilities depend on other capabilities and knowledge regions. An Architecture
Review capability depends on: Systems Knowledge, an Evaluation Rubric, and a
Review Methodology. This mirrors the leaf dependency model (RFC-0022) applied
at the capability level.

**Source:** RFC-0013 §"Capability Dependencies" (lines 191–204).

## Agent and Human Capability Profiles

Both agents and humans may expose capability profiles. A Research Agent
advertises Web Research, Evidence Extraction, and Summarization. A Senior
Architect advertises Architecture Review, System Design, and Mentorship.

The same Capability schema applies to both — humans and agents share the
capability model.

**Source:** RFC-0013 §"Agent Capability Profiles" (lines 206–222), §"Human Capabilities"
(lines 322–336), §"Agent Capabilities" (lines 338–352).

## Capability Confidence and Evaluation

Capabilities carry confidence scores that reflect how successful past executions
have been and how often they produce good outcomes. Capabilities can also be
evaluated against rubrics:

- Architecture Review Capability → Score: 91/100
- Accessibility Audit Capability → Score: 87/100

This creates a feedback loop: executing a capability generates evidence that
updates its confidence.

**Source:** RFC-0013 §"Capability Confidence" (lines 224–233) and §"Capability Evaluation"
(lines 235–249).

## Methodology Evolution

Methodologies version and improve over time. Architecture Review v1 → v2 → v3.
Lineage is preserved, not discarded. Agents should select methodologies based
on context: a Legal Question triggers Legal Reasoning; a Scientific Question
triggers the Scientific Method.

**Source:** RFC-0013 §"Methodology Evolution" (lines 251–261) and §"Methodology Selection"
(lines 263–277).

## Capability Gaps

A capability gap occurs when a task exists but no capability can execute it.
The gap workflow is:

```
Capability Gap → Research → Methodology Discovery → Capability Creation
```

Unresolvable gaps create Capability Debt.

**Source:** RFC-0013 §"Capability Gaps" (lines 279–300).

## Capability Debt

Capability debt occurs when important work cannot be performed due to:
- Missing expertise
- Missing methodology
- Missing evaluator
- Missing reviewer

Like knowledge debt and evaluation debt, capability debt is first-class and
generates tasks that the system must resolve.

**Source:** RFC-0013 §"Capability Debt" (lines 369–381).

## Capability Graph

RFC-0013 defines three canonical capability relationships:
- Capability `→ Uses →` Methodology
- Capability `→ Requires →` Knowledge
- Capability `→ Evaluated By →` Rubric

**Source:** RFC-0013 §"Capability Graph" (lines 383–397).

## Future: Capability Marketplace

RFC-0013 envisions federated discovery of capabilities, methodologies, experts,
and agents across Brain boundaries. A Brain that lacks a Patent Analysis
capability could discover and federate with a Brain that exposes it.

**Source:** RFC-0013 §"Capability Marketplace" (lines 354–367).

## Success Criteria

RFC-0013 defines ten success criteria. The system succeeds when:
1. Capabilities are first-class objects.
2. Methodologies are first-class objects.
3. Agents advertise capabilities.
4. Capability gaps are detectable.
5. Methodologies are reusable.
6. Capabilities are measurable.
7. Capabilities can evolve.
8. Humans and agents share the same model.
9. Capability debt is measurable.
10. The system can discover missing expertise.

**Source:** RFC-0013 §"Success Criteria" (lines 422–435).

## Answered Questions

**Q: What is the difference between a capability and a methodology?**
A capability is *what* an agent can do (Architecture Review). A methodology
is *how* it does it (a six-step Architecture Review Process). A single
capability may use multiple methodologies depending on context. Methodologies
are reusable across capabilities.

**Q: How does Delphi detect capability gaps?**
By comparing task requirements against the capability profiles of available
agents (and humans). If no agent or human exposes a capability at the required
level for a task, a gap is recorded and the Gap Workflow is triggered:
Research → Methodology Discovery → Capability Creation.

**Q: Can capability confidence decrease?**
Yes. Each execution of a capability generates evidence. If outcomes are poor
(low evaluation scores, failed quality gates), the capability's confidence
decreases. This is the same evidence-and-confidence feedback loop that applies
to beliefs in RFC-0003.

**Q: Why do humans and agents share the same capability model?**
Because work assignment should be model-agnostic. A task requiring
"Architecture Review at Expert level" should be assignable to either a human
Senior Architect or an Architecture Review Agent at Expert level without
changing the task schema. The same rubrics, methodologies, and capability
levels apply to both.
