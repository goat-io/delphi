---
leaf_id: leaf_edb571412e6e4730b1377cf9
title: "Ontology vs Capability: Structural Classification vs Agent Capacity"
type: research
status: answered
question: "Ontology defines: Types, Relationships, Validation Rules — Capability answers: What can an agent do?"
verdict: real_question
confidence: 0.95
---

Ontology and Capability are orthogonal primitives in the Delphi meta-model that answer fundamentally different questions and must not be conflated.

**Ontology** (RFC-0006) is the structural layer. It classifies reality by defining what types of things can exist in a Brain, what relationships are valid between them, and which constraints must hold. Ontology answers: "What is this thing, and how does it relate to other things?" An Ontology Type (e.g., `Person`, `Law`, `Belief`) is a Leaf that tells the system how to categorize knowledge. A Relationship Type (e.g., `SUPPORTS`, `DEPENDS_ON`) constrains which graph edges are valid. A Validation Rule enforces structural constraints — for example, "a Decision must reference at least one Belief." Critically, ontology is represented as leaves, making it queryable, evolvable, and subject to confidence scoring like any other knowledge.

**Capability** (RFC-0013) is the agency layer. It describes the ability of an agent (or human) to perform a class of work — not what something *is*, but what something can *do*. A Capability (e.g., `Legal Research`, `Architecture Review`, `Accessibility Audit`) is also a first-class Leaf, but it carries methodologies, required knowledge, and evaluation rubrics. The key separation is explicit in RFC-0013: "Knowing WCAG exists ≠ Being able to perform an accessibility audit." Knowing (ontology-bounded facts) does not imply doing (capability to act). An agent's capability profile declares its competency level across domains and is evaluated over time by outcomes.

**The relationship between them:** Capabilities depend on Ontology but are not a subset of it. A Capability Leaf may reference Ontology Types to describe its domain, and Ontology's classification of agents as a type enables capability profiles to be attached to agents as evidence. However, changing the ontology does not change what agents can do, and a new capability does not require an ontology change unless a new type category is needed.

**In implementation terms:** Ontology governs knowledge structure at ingest and query time (validation, classification, navigation). Capabilities govern task routing and agent selection at execution time (which agent can handle this task, via which methodology, evaluated by which rubric).

---

## Evidence

| Source | Relevant Section |
|--------|-----------------|
| `rfcs/RFC-0006-Ontology-System.md` | "Ontology answers: What is this? How is it classified? What relationships are valid? How should agents reason about it?" — Core Principle section |
| `rfcs/RFC-0006-Ontology-System.md` | Types, Relationships, and Validation Rules are all implemented as Leaves — "Core Principle" |
| `rfcs/RFC-0013-Capabilities-and-Methodologies.md` | "Knowledge is not Capability" — Core Principle section; WCAG example |
| `rfcs/RFC-0013-Capabilities-and-Methodologies.md` | Capability Schema includes `requiredKnowledge`, `methodologies`, `evaluationRubrics` — explicit composition model |
| `rfcs/RFC-0001-Delphi-Meta-Model.md` | Both Ontology and Capability are enumerated as distinct meta-model primitives |
