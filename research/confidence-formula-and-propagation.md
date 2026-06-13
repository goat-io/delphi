---
name: confidence-formula-and-propagation
type: research
status: closed
region: Spec
topics:
  - confidence
  - beliefs
  - propagation
  - RFC-0003
sources:
  - rfcs/RFC-0003-Knowledge-and-Confidence-Theory.md
  - rfcs/RFC-0022-Dependency-and-Impact-Propagation.md
---

# How Confidence Is Calculated and Propagates in Delphi

## Core Definition

Delphi does not store truth. It stores *beliefs* — assertions with confidence
scores. Confidence is a floating-point value in `[0.0, 1.0]` where 0.0 means
completely unsupported and 1.0 means maximum confidence. Facts are not a
separate primitive; they are high-confidence beliefs (≥ 0.95) treated
operationally as fact-like.

**Source:** RFC-0003 §"Confidence" (lines 162–173) and §"Facts" (lines 102–120).

## The Initial Confidence Formula

RFC-0003 specifies the MVP confidence formula as a weighted sum of six
components:

```
confidence =
  (0.30 × evidenceStrength)
+ (0.20 × sourceReliability)
+ (0.15 × sourceDiversity)
+ (0.15 × freshness)
+ (0.20 × consensus)
- (0.20 × contradictionRisk)
```

Positive weights sum to 1.0, so a belief with perfect components and zero
contradiction risk reaches confidence 1.0. The result is clamped to
`[0.0, 1.0]`. The six inputs are:

| Component | Weight | What It Measures |
|---|---|---|
| `evidenceStrength` | 0.30 | How well evidence supports the assertion |
| `sourceReliability` | 0.20 | Trustworthiness of the originating sources |
| `sourceDiversity` | 0.15 | Number of independent sources |
| `freshness` | 0.15 | How recently evidence was produced or verified |
| `consensus` | 0.20 | Degree of agreement across sources |
| `contradictionRisk` | −0.20 | Strength of contradicting evidence |

**Source:** RFC-0003 §"Initial Confidence Formula" (lines 192–210) and
§"Confidence Components" (lines 178–200).

## Confidence Levels (Interpretation Scale)

| Range | Label |
|---|---|
| 0.00–0.20 | Very Weak |
| 0.20–0.40 | Weak |
| 0.40–0.60 | Moderate |
| 0.60–0.80 | Strong |
| 0.80–0.95 | Very Strong |
| 0.95–1.00 | Fact-Like |

**Source:** RFC-0003 §"Confidence Levels" (lines 216–235).

## How Confidence Propagates Through Dependencies

Confidence propagates *downward* through dependency chains — a belief cannot
be more reliable than the beliefs it depends on unless it has independent
evidence of its own.

The propagation rule (RFC-0022): **confidence can only remain equal or decrease
through a dependency chain**. When a foundational belief drops from 0.95 to
0.50, every dependent belief may need recalculation. The Dependency Engine
traverses the directed dependency graph, identifies all consumers, and queues
them for confidence recalculation.

Example chain (RFC-0022 §"Confidence Propagation", lines 268–289):

```
Belief A: 0.95
  └── Belief B depends on A → B: 0.90
        If A drops to 0.50 → B needs recalculation
```

**Source:** RFC-0022 §"Propagation Rules" (lines 291–299) and
§"Confidence Propagation" (lines 268–289).

## Knowledge Shockwaves

A major belief change creates a *Knowledge Shockwave*: a cascading update
across the dependency graph. The canonical path (RFC-0022 §"Confidence
Shockwaves"):

```
New Scientific Evidence
→ Theory Update
→ Belief Updates
→ Decision Reassessment
→ Research Tasks Generated
```

When confidence drops below the configured threshold, the Dependency Engine
automatically triggers research tasks (trigger: `CONFIDENCE_DROP`) per
RFC-0026 §"Automatic Task Generation".

**Source:** RFC-0022 §"Confidence Shockwaves" (lines 303–318) and
RFC-0026 §"Automatic Task Generation" (lines 275–300).

## Freshness and Decay

Knowledge decays at domain-specific rates. Technology knowledge decays
quickly; historical knowledge decays slowly. Freshness directly influences the
confidence formula — stale evidence reduces `freshness`, which reduces
confidence, which may trigger research tasks automatically.

**Source:** RFC-0003 §"Freshness" (lines 360–371).

## Contradictions Are First-Class

When contradicting evidence appears, the `contradictionRisk` component
increases and the overall confidence decreases. Delphi does not hide
disagreements. Both the supporting evidence and the contradiction remain
visible, and their net effect is expressed through the confidence score.

**Source:** RFC-0003 §"Contradictions" (lines 321–338) and §"Consensus"
(lines 340–355).

## Canonical Questions This Answers

- *How is confidence calculated?* — Weighted sum of six components per the
  RFC-0003 formula above.
- *Can a dependent belief have higher confidence than its dependency?* — No,
  per the RFC-0022 propagation rule.
- *What happens to decisions when supporting beliefs weaken?* — Decision
  status becomes `REVIEW_REQUIRED`; a REVIEW task is auto-generated
  (RFC-0022 §"Decision Reassessment", RFC-0026 §"Automatic Task Generation").
- *Does Delphi store facts separately from beliefs?* — No; facts are
  high-confidence beliefs (≥ 0.95), not a distinct primitive.
