# RFC-0009 — Brains & Federation
## Knowledge Sovereignty and Distributed Intelligence

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

---

# Purpose

Delphi is not a single knowledge base.

Delphi is a protocol for many independent Brains.

This RFC defines:

- Brains
- Sovereignty
- Federation
- Import
- Export
- References
- Forks
- Synchronization
- Conflict Resolution

---

# Core Principle

Brains own their knowledge.

Brains share protocols.

Not ownership.

This principle is called:

Knowledge Sovereignty.

---

# What Is A Brain?

A Brain is an independent Delphi knowledge system.

Examples:

- Goatlab Brain
- Careium Brain
- Personal Brain
- Legal Brain
- Medical Brain
- World Brain

A Brain owns:

- Leaves
- Evidence
- Confidence
- Ontology Extensions
- Evaluations
- Decisions
- Research Agenda

---

# Brain Identity

Every Brain requires:

```ts
interface Brain {
  id: string

  name: string

  owner: string

  description: string

  supportedOntologyPacks: string[]

  federationPolicy: FederationPolicy
}
```

---

# Brain Boundaries

A Brain is a trust boundary.

Inside:

Full control.

Outside:

Federation contracts apply.

---

# Knowledge Sovereignty

Brains decide:

What to share.

What to hide.

What to export.

What to import.

No Brain can modify another Brain directly.

---

# Visibility Levels

```ts
type Visibility =
  | "PRIVATE"
  | "INTERNAL"
  | "PARTNER"
  | "PUBLIC"
```

---

# Federation Model

Brains communicate through leaves.

Brains never exchange databases.

Brains exchange knowledge objects.

---

# Reference Model

Brains should prefer references over copies.

Example:

Goatlab Brain

references

World Brain
→ Roman Law

instead of duplicating it.

---

# External References

```ts
interface ExternalReference {
  brainId: string

  leafId: string

  version: string
}
```

---

# Imports

Imports create local copies.

Use cases:

Offline operation.

Customization.

Historical preservation.

---

# Import Strategies

Reference Only

Read Through

Snapshot Import

Continuous Synchronization

---

# Exports

Brains may export:

Leaves

Ontology Packs

Rubrics

Evaluations

Research Findings

---

# Forking

Brains may fork knowledge.

Example:

World Brain
→ Legal Ontology

forked into

Company Legal Ontology

---

# Fork Rules

Forks preserve lineage.

Forks record ancestry.

Forks remain compatible when possible.

---

# Synchronization

Brains may synchronize.

Synchronization is optional.

Synchronization should be explicit.

---

# Sync Strategies

Manual

Scheduled

Event Driven

Continuous

---

# Versioning

Knowledge must be versioned.

Examples:

Roman Law v1

Roman Law v2

Architecture Rubric v3

---

# Compatibility

Brains should advertise:

Supported Protocol Version

Supported Ontology Packs

Supported Federation Features

---

# Federation Policies

```ts
interface FederationPolicy {
  allowImports: boolean

  allowExports: boolean

  allowReferences: boolean

  allowForks: boolean
}
```

---

# Conflict Resolution

Conflicts are expected.

Example:

Brain A:

Confidence 0.95

Brain B:

Confidence 0.40

Both beliefs may coexist.

---

# Truth Conflicts

Federation does not require agreement.

Brains may disagree.

Disagreement is represented.

Not hidden.

---

# Ontology Federation

Brains may:

Use shared ontology packs.

Extend ontology packs.

Fork ontology packs.

---

# Rubric Federation

Brains may share:

Rubrics

Evaluation Standards

Quality Frameworks

---

# Research Federation

Brains may share:

Questions

Findings

Evidence

Research Agendas

---

# Trust Model

Brains should assign trust levels.

Examples:

Government Brain
0.95

Academic Brain
0.90

Internal Brain
0.80

Unknown Brain
0.40

Trust influences confidence.

---

# Brain Discovery

Brains should expose metadata.

Examples:

Name

Owner

Ontology Packs

Capabilities

Public Leaves

---

# Public Knowledge Network

Long-term vision:

Many independent brains connected through federation.

Examples:

Personal Brains

Company Brains

Scientific Brains

Legal Brains

Public World Brains

---

# Brain Health

Brains should expose:

Knowledge Debt

Evaluation Coverage

Confidence Distribution

Research Backlog

Ontology Debt

---

# Security

Brains control:

Authentication

Authorization

Sharing Policies

Visibility

---

# Canonical Questions

Who owns this knowledge?

Where did it come from?

Can I trust it?

Can I reference it?

Can I import it?

Can I fork it?

Which version do I have?

---

# Success Criteria

A Delphi system successfully implements this RFC when:

1. Brains are independent.
2. Knowledge sovereignty is preserved.
3. References are supported.
4. Imports are supported.
5. Exports are supported.
6. Forks preserve lineage.
7. Synchronization is optional.
8. Disagreements can coexist.
9. Federation is versioned.
10. A distributed network of brains is possible.
