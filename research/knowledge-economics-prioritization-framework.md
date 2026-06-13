---
name: knowledge-economics-prioritization-framework
type: research
status: closed
region: Spec
topics:
  - knowledge-economics
  - research-roi
  - prioritization
  - knowledge-debt
  - confidence-gap
  - uncertainty-cost
  - belief-impact
  - RFC-0011
  - RFC-0022
  - RFC-0012
sources:
  - rfcs/RFC-0011-Knowledge-Economics.md
  - rfcs/RFC-0022-Dependency-and-Impact-Propagation.md
  - rfcs/RFC-0012-Decision-Theory.md
  - rfcs/RFC-0017-Implementation-Roadmap.md
---

# Knowledge Economics and Prioritization in Delphi

## Core Problem: Which Research Has Highest ROI?

A Brain can never learn everything. Time, attention, compute, and research
capacity are finite. RFC-0011 defines the system that answers the central
question:

> Given 1000 unanswered questions, which one should we investigate first?

The answer is formalized as **Research ROI**:

```
Research ROI = Knowledge Value Created ÷ Research Cost
```

Questions with high potential impact and medium research cost rank highest.
RFC-0011 §"Example" demonstrates with the question
"Can TigerBeetle survive region failure?" — Very High impact, Medium cost,
therefore High ROI: prioritize.

**Source:** RFC-0011 §"Research ROI" and §"Example" (lines 80–102).

## What Uncertainty Is Most Expensive?

Not all uncertainties cost the same. The cost formula from RFC-0011:

```
Cost Of Uncertainty ≈ Probability Of Being Wrong × Impact Of Being Wrong
```

Examples of high-cost uncertainty:
- Medical Diagnosis: wrong → patient harm (high probability × catastrophic impact)
- Core architecture choice: wrong → full rewrite
- Legal compliance: wrong → regulatory penalty

Examples of low-cost uncertainty:
- Button color preference: wrong → minor UX degradation

**Source:** RFC-0011 §"Cost Of Uncertainty" and §"Cost Formula" (lines 106–122).

## Prioritization Score Formula

RFC-0011 §"Prioritization Score" provides the canonical formula:

```
Priority = Impact × Confidence Gap × Dependency Count × Risk Reduction
           ÷ Estimated Cost
```

The four multipliers mean:
- **Impact**: beliefs used by more decisions rank higher (see RFC-0022 §"Dependency Economics")
- **Confidence Gap** = Desired Confidence − Current Confidence. Large gaps increase priority.
- **Dependency Count**: a belief supporting 100 decisions is more valuable than one supporting 1 (RFC-0011 §"Dependency Economics")
- **Risk Reduction**: knowledge that removes a high-stakes unknown has extra value

**Source:** RFC-0011 §"Prioritization Score" (lines 164–180), §"Confidence Gap" (lines 145–150), RFC-0022 §"Impact Analysis" (lines 100–125).

## Which Belief Has Highest Impact?

RFC-0022 §"Critical Beliefs" defines high-impact beliefs as those with
"unusually high impact" — beliefs that, if falsified, would trigger a
knowledge shockwave rippling through many downstream beliefs, decisions,
and evaluations.

Identifying high-impact beliefs:

1. **Dependency Count**: traverse DEPENDS_ON edges outward; beliefs with the
   most transitive consumers have highest impact.
2. **Impact Radius**: RFC-0022 §"Impact Radius" labels impact as Low / Medium /
   High / Critical. Critical beliefs require active monitoring.
3. **Fragility Check**: a belief depending on few sources with weak evidence
   (RFC-0022 §"Fragile Beliefs") combines high impact with high risk —
   the most dangerous combination.

The `what_breaks_if` query (RFC-0022 §"Dependency Query Examples") returns
the full consumer graph. Beliefs that appear in many such answers are the
highest-impact beliefs in the Brain.

**Source:** RFC-0022 §"Critical Beliefs", §"Fragile Beliefs", §"Impact Radius",
§"Dependency Query Examples" (lines 188–240).

## Confidence Gap — How Far Below Target Confidence?

RFC-0011 §"Confidence Gap" defines:

```
Confidence Gap = Desired Confidence − Current Confidence
```

A belief at confidence 0.40 targeting 0.80 has a gap of 0.40 — large gap
→ high research priority. Gaps are surfaced by the Knowledge Debt Engine
(RFC-0010 §"Knowledge Debt Engine") which continuously produces
"Missing Evidence Tasks" and "Missing Evaluation Tasks" as work items.

The Brain health metric "Average Confidence" (RFC-0011 §"Brain Health Metrics")
tracks the aggregate confidence state. When average confidence is below 0.5,
the entire corpus is under-evidenced and broad evidence-gathering campaigns
should be prioritized over narrow deep dives.

**Source:** RFC-0011 §"Confidence Gap" (lines 145–152), RFC-0010 §"Knowledge
Debt Engine" (lines 188–198), RFC-0011 §"Brain Health Metrics" (lines 241–255).

## Knowledge Debt — How Many Open Questions Exist?

Knowledge Debt is accumulated uncertainty:

```
Knowledge Debt = Importance × Uncertainty
```

Sources of knowledge debt (RFC-0011 §"Knowledge Debt"):
- Missing evidence
- Weak confidence
- Missing evaluations
- Ontology gaps
- Open contradictions
- Unreviewed assumptions

Open questions are the most visible form of knowledge debt. RFC-0011
§"Research Backlog" prescribes ranking open questions by Priority score
and organizing them into five queues: Critical, High, Medium, Low,
Exploratory.

The goal is not zero open questions — new knowledge always generates new
questions (RFC-0008 §"The Eternal Loop"). The goal is that the
highest-priority questions are being actively researched.

**Source:** RFC-0011 §"Knowledge Debt" (lines 55–70), §"Research Backlog"
(lines 188–202), RFC-0008 §"The Eternal Loop" (lines 78–88).

## Where Should Resources Be Invested?

RFC-0011 §"Research Portfolio" prescribes a portfolio allocation:

```
70% Strategic Research   — high-impact, decision-driving
20% Operational Research — supporting current work
10% Exploratory Research — open-ended, speculative
```

Resource allocation should follow the Prioritization Score. RFC-0017
§"Phase 8 — Knowledge Economics" places the Knowledge Debt Engine and
Research ROI Engine as Phase 8 deliverables — after basic storage,
search, evaluation, and decision layers are in place — because you need
those layers to calculate meaningful priority scores.

**Source:** RFC-0011 §"Research Portfolio" (lines 207–220), RFC-0017
§"Phase 8" (lines 148–162).

## But Which Should Be Explored First?

The exploration ordering principle from RFC-9999 §"Recommended Reading Order":
read foundations before advanced topics. For a new Brain:

1. Start with highest-impact beliefs that have the largest confidence gaps
   and most transitive dependents.
2. Among equal-priority questions, prefer the one whose answer is a
   prerequisite for the most other answers (compounds fastest).
3. Prefer knowledge with high reusability — authentication architecture
   shared by 50 services outranks a one-off configuration detail
   (RFC-0011 §"Reusability").

The question "But which should be explored first?" is answered by running
the Prioritization Score across all open questions and picking the top of
the Critical queue.

**Source:** RFC-9999 §"Recommended Reading Order" (lines 55–180),
RFC-0011 §"Reusability" (lines 138–144), §"Research Queues" (lines 203–211).

## Navigation Debt — How Hard Is This to Find?

Navigation Debt exists when knowledge cannot be discovered efficiently even
though it exists. RFC-0010 §"New Metric" introduces Navigation Efficiency:

> How quickly an agent reaches relevant knowledge.

Poor navigation means agents spend excess context on dead-end traversals.
The remedy is new or improved Knowledge Indexes (RFC-0019) and Maps
(RFC-0023) for the affected knowledge region.

Navigation Debt creates index-generation tasks rather than research tasks.

**Source:** RFC-0010 §"New Metric" (lines 207–215), RFC-0019, RFC-0023.

## Strategic Importance — Does This Affect Active Decisions?

RFC-0012 §"Decision Dependency" models decisions as explicitly depending on
beliefs. When a belief changes, every decision marked `status: REVIEW_REQUIRED`
that referenced it surfaces for reassessment (RFC-0022 §"Decision Reassessment").

Strategic importance = number and criticality of active decisions that depend
on this belief. High strategic importance beliefs that are currently uncertain
represent the highest-ROI research targets.

**Source:** RFC-0012 §"Decision Inputs" (lines 80–90), RFC-0022
§"Decision Reassessment" (lines 145–155).
