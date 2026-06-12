# RFC-0016 — Example Brains
## Reference Implementations of the Delphi Model

Status: Draft
Depends On:
- RFC-0000 through RFC-0015

---

# Purpose

A theory is only useful if it works in practice.

This RFC validates the Delphi model against real-world domains.

Goals:

- Validate universality
- Identify ontology gaps
- Demonstrate portability
- Demonstrate federation

---

# Core Principle

Every Brain uses the same protocol.

Different Brains may have completely different knowledge.

The protocol remains identical.

---

# Example 1 — World Brain

Purpose:

Represent public human knowledge.

Domains:

- Physics
- Biology
- Mathematics
- History
- Law
- Engineering

Example:

Object:
Roman Law

Evidence:
Historical Documents

Belief:
Roman Law influenced Civil Law

Decision:
None

Research:
Open historical questions

---

# Example 2 — Company Brain

Purpose:

Represent organizational knowledge.

Examples:

- People
- Teams
- Projects
- Systems
- ADRs
- Processes

Example:

Object:
TigerBeetle

Belief:
Suitable for Walliver

Evidence:
Benchmarks

Evaluation:
Architecture Review

Decision:
Use TigerBeetle

Task:
Research backup strategy

---

# Example 3 — Legal Brain

Purpose:

Represent legal knowledge.

Objects:

- Laws
- Regulations
- Jurisdictions
- Court Decisions

Example:

Object:
GDPR

Evidence:
EU Regulation

Belief:
Applies to Company X

Evaluation:
Legal Analysis

Decision:
Implement Compliance Controls

---

# Example 4 — Medical Brain

Purpose:

Represent medical knowledge.

Objects:

- Diseases
- Symptoms
- Treatments
- Studies

Example:

Object:
Type 2 Diabetes

Evidence:
Clinical Study

Belief:
Treatment A improves outcome

Evaluation:
Clinical Review

Research:
Ongoing studies

---

# Example 5 — Personal Brain

Purpose:

Represent personal knowledge.

Objects:

- Goals
- Projects
- Decisions
- Memories
- Learning

Example:

Goal:
Build Delphi

Belief:
Knowledge systems are insufficient

Decision:
Create Delphi

Task:
Design ontology system

---

# Example 6 — Research Brain

Purpose:

Continuously generate knowledge.

Objects:

- Questions
- Findings
- Hypotheses
- Experiments

Workflow:

Question
→ Research
→ Evidence
→ Belief
→ New Questions

---

# Example 7 — Design Brain

Purpose:

Represent design expertise.

Objects:

- Design Systems
- Accessibility Standards
- UX Research

Example:

Belief:
Clear navigation improves usability

Rubric:
Accessibility Review

Evaluation:
Design Score

---

# Example 8 — Engineering Brain

Purpose:

Represent technical knowledge.

Objects:

- Architectures
- Systems
- Services
- Technologies

Example:

Object:
PostgreSQL

Evidence:
Benchmarks

Evaluation:
Architecture Rubric

Decision:
Adopt PostgreSQL

---

# Example 9 — Delphi Brain

Purpose:

Represent Delphi itself.

Objects:

- RFCs
- Ontologies
- Capabilities
- Research

The Delphi Brain should be capable of evolving its own ontology.

---

# Federation Example

World Brain
↕
Legal Brain
↕
Company Brain

Company Brain references:

Roman Law

from

World Brain

without owning it.

---

# Ontology Reuse

All brains use:

@delphi/core

Some add:

@delphi/legal

@delphi/company

@delphi/research

@delphi/design

---

# Knowledge Sovereignty

Example:

Goatlab Brain

owns:

- Internal ADRs
- Employee Knowledge
- Strategic Decisions

World Brain cannot modify them.

---

# Shared Objects

Brains may share:

- Ontologies
- Rubrics
- Research Findings
- Capabilities

while retaining ownership.

---

# Brain Comparison

| Brain | Primary Goal |
|---------|--------------|
| World | Knowledge |
| Company | Execution |
| Legal | Compliance |
| Medical | Clinical Understanding |
| Personal | Growth |
| Research | Discovery |
| Design | Quality |
| Engineering | Systems |

---

# Validation Questions

Can every domain use:

- Leaves?
- Evidence?
- Confidence?
- Evaluations?
- Decisions?
- Tasks?

If yes:

The protocol is sufficiently universal.

---

# Canonical Rules

1. Brains share protocol.
2. Brains do not share ownership.
3. Ontologies may differ.
4. Federation is optional.
5. Knowledge remains portable.
6. Evidence remains traceable.
7. Evaluations remain reproducible.
8. Decisions remain auditable.
9. Research remains continuous.
10. The protocol remains universal.

---

# Success Criteria

A Delphi implementation successfully implements this RFC when:

1. Multiple domains can use the same protocol.
2. Federation works across domains.
3. Ontology reuse is possible.
4. Knowledge sovereignty is preserved.
5. Portability is maintained.
6. Brains remain independent.
7. Evidence remains traceable.
8. Evaluations remain consistent.
9. Research loops function.
10. Delphi can model itself.
