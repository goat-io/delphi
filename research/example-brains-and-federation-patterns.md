---
title: Example Brains and Federation Patterns
region: Spec
sources:
  - rfcs/RFC-0016-Example-Brains.md
  - rfcs/RFC-0009-Brains-and-Federation.md
  - rfcs/RFC-0018-Universal-Knowledge-Model.md
  - rfcs/RFC-0001-Delphi-Meta-Model.md
confidence: 0.85
---

# Example Brains and Federation Patterns

## Core Thesis

RFC-0016 validates the Delphi universal model against nine concrete domains. Its purpose
is to prove that the protocol generalizes — that the same primitives (leaves, evidence,
confidence, evaluations, decisions, tasks) can represent physics, law, medicine, engineering,
business, design, research, personal knowledge, and the Delphi spec itself. If any domain
cannot be represented, the model fails.

## The Nine Reference Brains

RFC-0016 defines nine Brain archetypes and their primary goals:

| Brain | Primary Goal | Characteristic Object Type |
|---|---|---|
| World | Represent public human knowledge | Concepts, theories, historical entities |
| Company | Organizational execution | People, systems, projects, ADRs |
| Legal | Compliance and legal reasoning | Laws, regulations, court decisions |
| Medical | Clinical understanding | Diseases, symptoms, treatments, studies |
| Personal | Individual growth | Goals, memories, decisions, learning |
| Research | Continuous discovery | Questions, hypotheses, experiments |
| Design | Quality and accessibility | Design systems, UX research, rubrics |
| Engineering | Technical architecture | Architectures, services, technologies |
| Delphi | Self-modeling | RFCs, ontologies, capabilities, research |

The Delphi Brain is the ninth and most critical: it is the live proof that the protocol
can represent itself.

## Anatomy of a Brain

Every Brain in RFC-0016 follows the same structural pattern regardless of domain:

```
Object → Evidence → Belief → Evaluation → Decision → Task
```

Company Brain example (from RFC-0016):
- Object: TigerBeetle
- Evidence: Benchmarks
- Belief: Suitable for Walliver
- Evaluation: Architecture Review
- Decision: Use TigerBeetle
- Task: Research backup strategy

Legal Brain example:
- Object: GDPR
- Evidence: EU Regulation text
- Belief: Applies to Company X
- Evaluation: Legal Analysis
- Decision: Implement compliance controls

The structural identity is not accidental — it is the direct consequence of RFC-0018's
universal formula: every domain observes, reasons, evaluates, decides, and acts.

## Federation

RFC-0016 demonstrates federation through the relationship between the World Brain and
domain-specific Brains. Example:

```
World Brain (owns: Roman Law)
    ↕ federation
Legal Brain (references: Roman Law)
    ↕ federation
Company Brain (references: GDPR from Legal Brain)
```

The Company Brain can hold a belief about GDPR (from the Legal Brain) without owning the
GDPR leaf. The Legal Brain can reference Roman Law (from the World Brain) without owning it.

RFC-0009 governs the federation protocol. Key rules from RFC-0016:

1. Brains share protocol, not ownership.
2. Knowledge sovereignty is preserved: the World Brain cannot modify Company Brain leaves.
3. Ontologies may differ between federated Brains.
4. Evidence remains traceable across Brain boundaries.

## Knowledge Sovereignty

RFC-0016 explicitly states that Brains own their knowledge exclusively. A Company Brain's
internal ADRs, strategic decisions, and employee knowledge cannot be modified by a federated
World Brain or Legal Brain. This is not a technical constraint — it is a design principle.

Knowledge sovereignty enables trust in federation: organizations can share evidence and
beliefs with external Brains without losing control of their canonical knowledge.

## Ontology Reuse

RFC-0016 describes ontology pack reuse across Brains:

- All Brains install `@delphi/core` (the base primitives)
- Domain Brains add specialized packs: `@delphi/legal`, `@delphi/company`, `@delphi/research`
- Pack types are shared; pack knowledge is not

This means a Company Brain and a Legal Brain both understand what a "court decision" is
(type defined in `@delphi/legal`) even though their leaf populations are entirely different.

## The Self-Brain as Validation

RFC-0016's ninth Brain (Delphi Brain) is the hardest test case. If Delphi cannot model
itself — cannot represent its own RFCs as leaves, its own design decisions as decisions,
its own open questions as questions — then the claim of universality is hollow.

The self-brain in this repository (`.delphi/` runtime, `brain/` canonical export) passes
this test. The bootstrap process ingests all 31 RFCs as assets, extracts beliefs, and
generates indexes. The evolution daemon then runs the research loop on the resulting Brain,
treating the spec's open questions as research targets.

## Validation Questions from RFC-0016

RFC-0016 poses a definitive validation test:

> Can every domain use Leaves, Evidence, Confidence, Evaluations, Decisions, and Tasks?

If yes, the protocol is sufficiently universal.

The nine example Brains answer this affirmatively. The engineering Brain needs
Evaluations (architecture reviews). The legal Brain needs Decisions (legal strategies).
The personal Brain needs Tasks (goals become tasks). The research Brain needs Questions
(the primary driver of the research loop). All nine domains use all six primitives.

## Answered Questions

**Q: Can a Company Brain reference a law from a Legal Brain without importing all legal knowledge?**

Yes. Federation allows selective reference: the Company Brain holds a leaf that references
the GDPR leaf in the Legal Brain by its stable leaf ID. The Company Brain holds its own
belief about how GDPR applies to its operations; the Legal Brain holds the authoritative
source. Evidence traceability crosses Brain boundaries.

**Q: What prevents a federated Brain from overwriting another Brain's leaves?**

Knowledge sovereignty (RFC-0016) and the Leaf Protocol (RFC-0002). Each Brain maintains
its own canonical store. Federated reads are permitted; federated writes are not. A Brain
may propose knowledge to another Brain (RFC-0027 candidate path), but the receiving Brain's
governance process must approve it before canonicalization.

**Q: Are the nine example Brains exhaustive?**

RFC-0016 treats them as illustrative, not exhaustive. The protocol is intended to be
sufficient for any domain that exhibits the universal pattern (RFC-0018). The nine examples
span a wide enough range — from highly formal (Legal) to highly personal (Personal) to
highly technical (Engineering) — to demonstrate generality without claiming completeness.

**Q: Can a single Delphi installation host multiple Brains?**

RFC-0009 and RFC-0016 describe this as federation rather than co-hosting. The current MVP
scope (AGENTS.md) targets a single Brain per installation. Multi-Brain coordination is a
future milestone, after the single-Brain implementation is proven.

**Q: How does the Delphi Brain model its own evolution?**

The evolution daemon (scripts/evolution-daemon.ts) runs the seven-step evolutionary loop
against the self-brain. Each cycle produces: identified coverage gaps → research tasks →
executed research → new leaves → updated indexes → closed questions. The evolution.log.md
records each cycle's output, making the Brain's self-improvement history fully auditable.
