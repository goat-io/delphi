---
name: agents-and-research-engine
type: research
status: closed
region: Spec
topics:
  - agents
  - research-engine
  - navigator-agent
  - research-agent
  - critic-agent
  - synthesizer-agent
  - knowledge-debt
  - continuous-learning
  - RFC-0008
sources:
  - rfcs/RFC-0008-Agents-and-Research-Engine.md
  - rfcs/RFC-0026-Tasks-and-Questions.md
---

# Agents and the Research Engine in Delphi

## Core Principle: Agents Improve Brains, Not Answer Questions

Traditional AI systems answer questions. Delphi agents improve Brains.

```
Traditional AI:
Question → Search → Context → Answer

Delphi:
Question → Index → Navigation → Knowledge → Evidence → Evaluation → Answer
                 ↓
         [Brain receives new Evidence and updated Belief]
```

The goal is not retrieval. The goal is improving the Brain. Every agent
action should reduce uncertainty, improve understanding, or improve evidence
quality.

**Source:** RFC-0008 §"Core Principle" (lines 43–50) and
§"The New Agent Model" (lines 53–72).

## The Eternal Loop

Agents never stop. The research loop has no terminal state:

```
Observation → Question → Navigation → Research → Evidence
→ Belief Update → Evaluation → Gap Detection → New Questions → Repeat
```

New knowledge always generates new questions. Knowledge debt is never zero.

**Source:** RFC-0008 §"The Eternal Loop" (lines 78–88).

## Agent Philosophy

- **Agents do not own knowledge.** Brains own knowledge.
- **Agents are stateless.** Session state is not canonical.
- **Memory belongs to the Brain.** Indexes are the primary interface between
  agents and knowledge.
- **Every agent action must be auditable:** who proposed it, why, which
  evidence supports it, which evaluation approved it.

**Source:** RFC-0008 §"Agent Philosophy" (lines 91–99),
§"Agent Memory" (lines 522–528), §"Agent Accountability" (lines 530–541).

## Eight Specialized Agent Types

RFC-0008 defines eight roles. Each is a separate capability; one system may
compose multiple roles:

### Navigator Agent
Finds the best path through knowledge. Reads indexes, builds navigation plans,
discovers related topics, minimizes context usage. Outputs navigation paths
and recommended reading orders.

### Research Agent
Acquires knowledge. Searches sources, gathers evidence, generates findings,
creates research leaves. Inputs are questions, gaps, and tasks. Outputs are
evidence, findings, and claims.

### Critic Agent
Challenges beliefs. Finds contradictions, detects assumptions, challenges
confidence, identifies weak evidence. Outputs are contradictions, research
tasks, and confidence adjustments.

### Synthesizer Agent
Creates understanding. Merges findings, updates beliefs, generates indexes,
produces summaries. Outputs are beliefs, knowledge updates, and index updates.

### Evaluator Agent
Applies rubrics. Scores outputs, measures quality, recommends improvements.
Outputs are evaluation results and quality reports.

### Ontology Steward
Maintains ontology health. Detects gaps, merges duplicates, proposes new
types and relationships. Outputs are ontology tasks and migrations.

### Auditor Agent
Ensures trustworthiness. Verifies provenance and citations, detects stale
knowledge and missing evidence. Outputs are audit reports.

### Planner Agent
Converts uncertainty into work. Generates tasks, prioritizes research,
allocates resources. Outputs are action plans and research backlogs.

**Source:** RFC-0008 §"Agent Taxonomy" (lines 127–135) and all subsequent
agent sections (lines 137–302).

## The Multi-Agent Research Pipeline

The recommended collaboration flow:

```
Navigator → Researcher → Synthesizer → Critic → Evaluator → Auditor
```

Each stage refines the output of the previous. The pipeline is reproducible
because every step produces auditable leaves in the Brain.

**Source:** RFC-0008 §"Multi-Agent Collaboration" (lines 503–518).

## Six Types of Knowledge Debt

RFC-0008 names six distinct debt types that agents must continuously reduce:

| Debt Type | Meaning |
|---|---|
| **Evidence Debt** | Claims exist without evidence |
| **Evaluation Debt** | Knowledge exists without quality assessment |
| **Ontology Debt** | Reality cannot be represented cleanly |
| **Confidence Debt** | Beliefs have insufficient confidence |
| **Research Debt** | Open questions without associated tasks |
| **Navigation Debt** | Knowledge exists but cannot be discovered efficiently |

Each debt type automatically triggers task creation of the appropriate type.

**Source:** RFC-0008 §"Knowledge Debt" (lines 394–410) and
§"Navigation Debt" (lines 412–420).

## Automatic Task Creation Triggers

RFC-0008 specifies that tasks are created automatically when:

- Confidence drops below threshold → `RESEARCH` task
- Evidence becomes stale → `RESEARCH` task
- Contradictions appear → `REVIEW` task
- Ontology gaps appear → `ONTOLOGY` task
- Indexes become stale → `INDEX_REFRESH` task
- Evaluations expire → `EVALUATION` task

**Source:** RFC-0008 §"Automatic Task Creation" (lines 426–440).

## Index-Aware Research

Research begins with indexes, not leaves:

```
Brain Index → Domain Index → Topic Index → Leaves → Evidence
```

This reduces context usage dramatically. An agent that reads the index first
can determine in milliseconds whether a topic is relevant before spending
tokens on leaf content.

**Source:** RFC-0008 §"Index-Aware Research" (lines 361–379).

## Brain Health Metrics

A Brain exposes health signals that agents use to prioritize work:

- Average Confidence
- Knowledge Debt (count and type)
- Navigation Debt
- Open Questions
- Evaluation Coverage
- Ontology Coverage

**Source:** RFC-0008 §"Brain Health" (lines 443–460).

## Research Prioritization Factors

Agents prioritize work by:
1. Impact — how widely is this belief depended upon?
2. Risk — what happens if this is wrong?
3. Confidence Gap — how far below target confidence?
4. Knowledge Debt — how many open questions exist?
5. Navigation Debt — how hard is this to find?
6. Strategic Importance — does this affect active decisions?

**Source:** RFC-0008 §"Research Prioritization" (lines 483–498).

## Questions Are First-Class Objects

Questions are not metadata. They are leaves with `kind: QUESTION`. They
represent tracked, explicit uncertainty. The system knows what it does not
know. Examples from RFC-0008:

- "Can TigerBeetle survive region failure?"
- "Which architecture scales best?"
- "How does Swedish law differ from EU law?"

**Source:** RFC-0008 §"Questions Are First-Class" (lines 321–338).

## How Agents Should Reason

When approaching any knowledge problem, agents should follow the navigation
principle: read indexes before leaves, read topic indexes before evidence,
and always ask "what debt exists in this region?" before diving into content.

Every action must improve the Brain, not just answer a question. A research
agent that finds no new evidence should create a question leaf documenting
the gap. That question becomes a task. That task becomes future work.

**Source:** RFC-0008 §"The Navigation Principle" (lines 105–119) and
§"Gap Detection" (lines 381–392).

## Canonical Questions This Answers

- *What is the primary purpose of agents in Delphi?* — Improving Brains, not
  answering questions. Every agent action should reduce uncertainty or improve
  the Brain's understanding.
- *Do agents own knowledge?* — No. Brains own knowledge. Agents are stateless
  temporary workers.
- *What are the eight agent types?* — Navigator, Research, Critic,
  Synthesizer, Evaluator, Ontology Steward, Auditor, Planner.
- *What is the recommended multi-agent pipeline?* — Navigator → Researcher
  → Synthesizer → Critic → Evaluator → Auditor.
- *How should agents reason about a topic?* — Read the Brain Index first,
  navigate to the relevant domain index, then topic index, then leaf. Never
  jump to raw retrieval.
- *What are the six types of knowledge debt?* — Evidence, Evaluation,
  Ontology, Confidence, Research, Navigation debt.
- *Which architecture scales best for Delphi?* — RFC-0008 does not prescribe
  a single architecture but mandates that agents be stateless, knowledge be
  stored in Brains, and communication happen through indexes — not through
  direct storage access or in-agent memory.
