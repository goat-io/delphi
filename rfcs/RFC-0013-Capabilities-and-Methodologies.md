# RFC-0013 — Capabilities & Methodologies
## How Agents Perform Work

Status: Draft
Depends On:
- RFC-0000 through RFC-0012

---

# Purpose

Knowledge tells us what we know.

Evaluation tells us what is good.

Decisions tell us what we should do.

Methodologies tell us HOW to do it.

Capabilities define WHAT an agent can do.

This RFC defines:

- Capabilities
- Methodologies
- Workflows
- Skills
- Competencies
- Domain Expertise
- Capability Evolution

---

# Core Principle

Knowledge is not Capability.

Example:

Knowing WCAG exists
≠
Being able to perform an accessibility audit.

Knowing architecture concepts
≠
Being able to review an architecture.

Capabilities must be explicitly modeled.

---

# What Is A Capability?

A capability is the ability to perform a class of work.

Examples:

- Legal Research
- Architecture Review
- Accessibility Audit
- Scientific Analysis
- Market Research
- Financial Modeling
- Code Review

Capabilities are first-class leaves.

---

# Capability Schema

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

---

# Capability Levels

Suggested scale:

0 - Unknown

1 - Beginner

2 - Intermediate

3 - Advanced

4 - Expert

5 - Authority

Agents may have different levels per capability.

---

# What Is A Methodology?

A methodology is a repeatable process used to perform work.

Examples:

- Scientific Method
- Design Thinking
- Legal Reasoning
- Root Cause Analysis
- Architecture Review Process
- Security Assessment Process

Methodologies are first-class leaves.

---

# Methodology Schema

```ts
interface Methodology {
  id: string

  name: string

  description: string

  steps: MethodologyStep[]

  expectedOutputs: string[]
}
```

---

# Methodology Step

```ts
interface MethodologyStep {
  order: number

  name: string

  description: string

  inputs: string[]

  outputs: string[]
}
```

---

# Example

Scientific Method

1. Question
2. Hypothesis
3. Experiment
4. Observation
5. Analysis
6. Conclusion

---

# Capability Composition

Capabilities are built from:

Knowledge
+
Methodologies
+
Experience
+
Evaluation

---

# Capability Dependencies

Examples:

Architecture Review

Depends On:

- Systems Knowledge
- Evaluation Rubric
- Review Methodology

---

# Agent Capability Profiles

Agents should advertise capabilities.

Example:

Research Agent

Capabilities:

- Market Research
- Technical Research
- Evidence Collection

---

# Capability Confidence

Capabilities should have confidence.

Questions:

How successful has this capability been?

How often does it produce good outcomes?

---

# Capability Evaluation

Capabilities can be evaluated.

Examples:

Architecture Review Capability

Score:
91/100

Accessibility Audit Capability

Score:
87/100

---

# Methodology Evolution

Methodologies improve.

Example:

Architecture Review v1
→ v2
→ v3

Lineage should be preserved.

---

# Methodology Selection

Agents should choose methodologies based on context.

Example:

Legal Question
→ Legal Reasoning Methodology

Scientific Question
→ Scientific Method

---

# Capability Gaps

A capability gap occurs when:

A task exists but no capability can execute it.

Example:

Need Patent Analysis

No Patent Analysis Capability Exists

---

# Gap Workflow

Capability Gap
→ Research
→ Methodology Discovery
→ Capability Creation

---

# Domain Expertise

Capabilities may belong to domains.

Examples:

Legal

Medical

Engineering

Design

Finance

Research

---

# Human Capabilities

Humans may expose capabilities.

Example:

Senior Architect

Capabilities:

- Architecture Review
- System Design
- Mentorship

---

# Agent Capabilities

Agents may expose capabilities.

Example:

Research Agent

Capabilities:

- Web Research
- Evidence Extraction
- Summarization

---

# Capability Marketplace

Future Vision:

Brains discover:

- Capabilities
- Methodologies
- Experts
- Agents

through federation.

---

# Capability Debt

Capability debt occurs when:

Important work cannot be performed.

Examples:

Missing expertise

Missing methodology

Missing evaluator

Missing reviewer

---

# Capability Graph

Relationships:

Capability
→ Uses
→ Methodology

Capability
→ Requires
→ Knowledge

Capability
→ Evaluated By
→ Rubric

---

# Canonical Questions

What can this agent do?

How does it do it?

Which methodology is used?

How good is it?

What expertise is missing?

How can this capability improve?

---

# Success Criteria

A Delphi system successfully implements this RFC when:

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
