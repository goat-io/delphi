# The Delphi Manifesto

Version: 1.0 · Owner: ignacio.cabrera@goatlab.io

> **Evolution is not intelligence. Evolution is the process by which
> intelligence emerges.**

---

## Delphi starts with evolution

Most AI visions start with agents. Delphi does not.

Delphi is a framework for building **self-evolving systems**.

We believe evolution follows a set of fundamental dynamics that recur across
nature, science, organizations, software, and intelligence itself:

1. **Understand** the current state.
2. **Learn** from existing knowledge and prior attempts.
3. **Generate** new hypotheses or actions.
4. **Execute** changes.
5. **Evaluate** outcomes.
6. **Incorporate** successful adaptations.
7. **Repeat** indefinitely.

Any system capable of performing this cycle continuously can improve over time.

---

## The central problem

Evolution requires knowledge. A system cannot improve itself if it cannot
understand what already exists, what has been tried before, why decisions were
made, and what the consequences were.

This leads to the question at the heart of Delphi:

> **What is knowledge, and how can it be represented in a way that makes it
> searchable, navigable, evaluable, and usable by both humans and agents?**

We believe intelligence is not the ability to know everything simultaneously.
Intelligence is the ability to efficiently **retrieve, connect, evaluate, and
apply** relevant knowledge when needed.

Just as humans rely on memory, books, scientific literature, and social
learning, autonomous systems require structured knowledge to evolve effectively.

---

## What Delphi represents

Delphi provides the foundations for the evolutionary loop by representing:

- Knowledge
- Evidence
- Decisions
- Assumptions
- Relationships
- Outcomes
- Confidence

as interconnected structures that can be explored and reasoned about by
autonomous agents.

By sharing a model of knowledge, agents can:

- Understand their environment.
- Learn from previous work.
- Discover alternative approaches.
- Evaluate competing solutions.
- Measure outcomes.
- Refine their behavior over time.

---

## The goal

The goal of Delphi is **not** to create smarter agents.

The goal is to create systems capable of **continuous, self-directed
evolution**. Agents are merely one mechanism through which that evolution
occurs. Delphi is the substrate that enables the evolutionary loop itself.

> **Intelligence is not knowing everything. Intelligence is knowing how to
> find, evaluate, and apply the right knowledge at the right time.**

Delphi is a knowledge and evolution substrate — not an agent framework, not AI
infrastructure. The knowledge model exists to serve the loop; the loop is the
point.

---

## This repository evolves itself

Delphi is not only a description of the loop — it runs the loop on itself. This
codebase is a live Delphi Brain (`brain/`, navigable via the `delphi` MCP
server) driven by an autonomous evolution daemon that continuously executes the
seven steps above against the repository's own knowledge, goals, and governance.
See [AGENTS.md](./AGENTS.md) for the working agreement and
[CONSTITUTION.md](./CONSTITUTION.md) for the human boundary.
