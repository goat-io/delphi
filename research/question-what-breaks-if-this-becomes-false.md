---
title: "What breaks if this becomes false?"
source_leaf: leaf_73fed69841844353bf6470b5
question_type: system-capability-requirement
verdict: real-question-answered
region: Spec
---

# Verdict

This phrase is RFC-0022 Success Criterion #12 — not a researchable open question in isolation. However, it encodes a precise system-capability requirement: the Brain must be able to answer "What breaks if this becomes false?" for any belief. Treated as such, the question is answerable from RFC-0022 itself and resolved here.

# Answer

If the dependency-impact propagation capability described in RFC-0022 fails (i.e., the Brain cannot answer "What breaks if this becomes false?"), the following breaks:

**1. Dependent beliefs become silently stale.**
When a belief's confidence drops or its truth changes, downstream beliefs that depend on it cannot be flagged for re-evaluation. Confidence can only equal or decrease through dependency chains (RFC-0022 §Propagation Rules), so a stale upstream belief leaves transitive dependents with falsely high confidence.

**2. Decisions built on invalidated beliefs are not re-triggered.**
Decisions depend on beliefs (RFC-0022 §Decision Dependency). Without impact tracing, a decision built on a belief that became false remains in force, yielding wrong action plans.

**3. Evaluations using stale criteria are not invalidated.**
Evaluations depend on rubric criteria and supporting beliefs (RFC-0022 §Evaluation Dependency). Without propagation, an evaluation's verdict stands even when the evidence it was scored against has changed.

**4. Indexes become incoherent.**
Indexes depend on leaves and are only regenerated when leaves change (RFC-0022 §Index Dependency). Without impact propagation, index regeneration is never triggered by upstream belief changes, so navigation surfaces outdated summaries.

**5. Research is never automatically triggered.**
RFC-0022 §Canonical Rules rule 12 states: "Research should be triggered automatically." Without impact tracing, no agent knows which open questions are activated by a belief change, so Knowledge Debt accumulates silently.

**6. The Brain loses internal coherence.**
RFC-0022 §Why This Exists states explicitly: without propagation, a belief changes but nothing else updates, making the Brain inconsistent. Coherence — the invariant that all dependent beliefs reflect the current state of their foundations — is the foundational property the propagation system guards.

# Scope of "this"

In RFC-0022:631 the pronoun "this" refers to any belief node in the dependency graph. The question generalizes: for any belief B, the system must be able to enumerate all nodes whose validity is conditional on B being true.

# Evidence

| Source | Location | Claim |
|--------|----------|-------|
| RFC-0022 | §Why This Exists (lines 77–93) | Without propagation the Brain becomes inconsistent; with it the Brain remains coherent |
| RFC-0022 | §Confidence Propagation (lines 267–298) | Confidence can only equal or decrease through chains; stale upstreams cause falsely high downstream confidence |
| RFC-0022 | §Decision Dependency (lines 140–149) | Decisions depend on beliefs; belief invalidation must reach decisions |
| RFC-0022 | §Index Dependency (lines 176–181) | Indexes are regenerated when leaves change; requires propagation to know which leaves changed |
| RFC-0022 | §Canonical Rules (lines 600–614) | Rules 11–12: research triggers automatically; Brain must remain internally coherent |
| RFC-0022 | §Success Criteria line 631 | "A Brain can answer: 'What breaks if this becomes false?'" — the capability requirement this file resolves |
| AGENTS.md | §Navigation Debt | Navigation Debt exists when knowledge exists but cannot be discovered efficiently — stale indexes create Navigation Debt |
