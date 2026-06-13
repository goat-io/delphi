---
name: Frontend Clarity Rubric
description: >-
  Weighted evaluation oracle for the Delphi Evolution Dashboard
  (apps/dashboard/src). Scores how clearly the default (machinery-hidden) view
  communicates, to a non-technical reader on a phone, what the autonomous system
  is trying to achieve, how it is going, and what it is working on now — in that
  priority order. Future agents use these criteria to score and improve the
  dashboard. Verify the build with: pnpm --filter delphi-dashboard build
owner: engineering
status: active
---

# Frontend Clarity Rubric — Delphi Evolution Dashboard

The artifact is the dashboard hero/default view (`components/Missions.jsx`,
`Header.jsx`, `App.jsx` toggle). The reader is an external, mostly NON-technical
human, often on a phone, glancing for a few seconds. Their three questions, in
priority order:

1. What is Delphi trying to achieve?
2. How is it going overall?
3. What is it working on right now, and why?

They do NOT care about keystrokes, ticks, phase codes, or per-cycle logs — those
live behind the `Show the machinery` toggle.

Each criterion is scored 0..1. The dashboard's overall clarity score is the
weight-normalized average: `sum(weight_i * score_i) / sum(weight_i)`.

| # | ID | Criterion | Weight |
|---|----|-----------|--------|
| 1 | `goal-5s-dominant` | Goal sentence wins the 5-second test | 5 |
| 2 | `overall-number-anchored` | One headline progress number, anchored to its target | 5 |
| 3 | `inverted-pyramid-order` | Priority order top-to-bottom, three answers above the fold | 4 |
| 4 | `no-machinery-leak` | No machine jargon in the default view | 4 |
| 5 | `now-preattentive-with-why` | "Working now" is found pre-attentively and says why | 4 |
| 6 | `momentum-visible` | Trajectory/momentum, not a static snapshot | 3 |
| 7 | `status-redundant-legible` | Status uses color + shape + word, legibly sized | 3 |
| 8 | `progressive-disclosure-calm` | One quiet door to detail; calm, self-sufficient default | 3 |
| 9 | `mobile-fit-no-h-scroll` | Mobile-legible, fits above fold, no horizontal scroll | 2 |

---

## 1. `goal-5s-dominant` — Goal sentence wins the 5-second test (weight 5)

The single most important job. A non-technical person shown the first viewport
for 5 seconds must be able to restate what Delphi is trying to do.

- **Good looks like:** The h1 outcome sentence (e.g. "Build a complete,
  evidence-backed understanding of how Delphi is built — then keep it true as it
  evolves") is the largest, highest-contrast non-decorative text on the page,
  top-left aligned, capped at ~2 lines on mobile, written in plain words with no
  noun the reader can't picture. It is a full outcome sentence, not a label
  ("Goals", "Evolution", "Status"). Nothing else competes with it for the first
  glance.
- **Bad looks like:** The framing lives only in a quiet sub-tagline ("watching
  the system improve itself") while a generic title heads the page; the goal is a
  label, not a sentence; abstract jargon ("its own design"); or a brighter/
  animated element (e.g. the Header status pill top-right) out-shouts the goal.
- **How to score:** 1.0 if the goal is a plain full-sentence outcome AND is
  unambiguously the dominant element. Subtract 0.3 if it competes with another
  element for first glance, 0.3 if it is abstract/contains an unpicturable noun,
  0.4 if it is a label rather than a sentence, 0.5 if the only framing is a quiet
  caption. Floor 0.

## 2. `overall-number-anchored` — One headline progress number, anchored to its target (weight 5)

Answers question #2. There must be exactly one overall figure, and it must be
judgeable as good/bad without outside knowledge.

- **Good looks like:** A single "{overall}% understood" figure sits directly
  under the goal, carries its unit word ("understood", not bare "60%"), and is
  visually second only to the goal (promoted to ~28-40px, paired with the bar as
  one unit). The overall bar shows a target/threshold marker (the 75%
  `coverageTarget`) on the same track — matching the per-area `MissionRow` target
  tick — so the fill reads against "how far is enough", not against an implied
  100% finish line. No second top-level number (tick, cycle count, leaf totals)
  competes for "which is THE number?".
- **Bad looks like:** The overall % is small/quiet (rendered 15px while a bright
  pill steals the eye); a bare "60%" with no unit; the overall bar is a plain
  gradient filling to 100% with NO target marker (so 60% is ambiguous); 100% is
  implied as the literal end-state of a self-evolving system; or a competing
  headline number (tick N, +4 leaves) sits in the hero.
- **How to score:** Start at 1.0. Subtract 0.4 if the overall bar has no visible
  target marker, 0.3 if the number lacks a unit word, 0.3 if it is under-weighted
  (not visually second), 0.3 if a competing machinery number appears in the hero.
  Floor 0.

## 3. `inverted-pyramid-order` — Priority order top-to-bottom, three answers above the fold (weight 4)

- **Good looks like:** Reading top-to-bottom yields goal → overall progress →
  what's-being-worked-on-now, then everything else. On a 390x844 phone, all three
  answers (goal, overall %, the "N being worked right now" line) are visible
  without scrolling. Nothing answering a lower-priority question (per-area detail,
  loop, history) appears above something answering a higher-priority one.
- **Bad looks like:** Metrics or machinery sit above "what is it working on now";
  the active/working-now line is pushed below the fold by a too-tall stacked
  Header (title + subtitle + pill) plus a multi-line h1; or sections are ordered
  arbitrarily.
- **How to score:** 1.0 if order is correct AND all three answers fit above the
  fold on a 390-wide viewport. Subtract 0.4 if any answer requires scrolling on
  mobile, 0.4 per inversion (a lower-priority band above a higher-priority one).
  Floor 0.

## 4. `no-machinery-leak` — No machine jargon in the default view (weight 4)

- **Good looks like:** Every visible string in the un-toggled view is something a
  non-technical phone user would say. The Header shows a human state ("working" /
  "thinking" / "resting"), not a raw `{phase}` ("run-agent", "scan", "guard") and
  not "tick {N}". Per-mission reasons use `humanizeAim()`-style outcomes
  ("answering 3 open questions · gathering evidence"); region titles are
  reader-friendly, not RFC/file names. Freshness reads "live" / "updated 30s ago",
  not "snapshot 14:32:07" / "connected via SSE". A grep of the always-visible tree
  for snake_case, SCREAMING_CASE, hex hashes, "tick", "leaves/beliefs/evidence",
  "COVERAGE_GAP", "gate" returns nothing.
- **Bad looks like:** Raw phase + "tick N" in the always-visible Header pill;
  COVERAGE_GAP / GREEN / commit hashes / leaf-belief-evidence counts in the
  default view; an internal-ontology word leaking past the toggle; a region falling
  back to a generic aim while an agent is visibly active on it.
- **How to score:** Start at 1.0; subtract 0.25 per distinct machine token visible
  in the default view (Header phase, "tick N", any enum/hash/internal-primitive
  count, jargon freshness cue). Floor 0.

## 5. `now-preattentive-with-why` — "Working now" is found pre-attentively and says why (weight 4)

- **Good looks like:** Exactly one pulsing element marks each genuinely-active
  row (the blue `#89b4fa` dot + "WORKING NOW · {elapsed}" badge in `MissionRow`),
  the elapsed timer actually ticks, and active rows sort to the top
  (active > not-solid > lowest-score). The accent blue and the only motion in the
  content area are reserved exclusively for "happening now". The reason travels
  with the activity in plain language (badge or adjacent line names the area AND
  the gap being closed, e.g. "closing 3 open questions"), so motive + activity
  read in one glance.
- **Bad looks like:** Motion or the accent blue used in more than one place
  (solid rows, headings, the Header dot all pulsing/blue) so the live row stops
  popping out; a pulsing dot with no motive ("something is happening" but not "on
  what/why"); idle rows animated; or active items not sorted first.
- **How to score:** 1.0 if motion+color are scarce (live rows only), active sorts
  first, and the why is visible. Subtract 0.4 if the accent/motion is reused on
  non-active elements, 0.3 if no plain-language "why" accompanies the active row,
  0.3 if active items don't sort to the top. Floor 0.

## 6. `momentum-visible` — Trajectory, not a static snapshot (weight 3)

- **Good looks like:** The hero conveys direction of travel — a sparkline of
  overall % over recent cycles, a "today: +4% understood" delta, or "2 areas
  reached solid this week" — answerable from the top section alone without opening
  the machinery. (The codebase already has `Sparkline.jsx` and per-cycle health
  deltas; the hero should surface a momentum line, not hide it.)
- **Bad looks like:** The hero is a static still — a bare overall % that can't
  distinguish a climbing system from a stalled one; all trend evidence trapped
  behind the toggle.
- **How to score:** 1.0 if a momentum/trend/delta signal sits in the hero and is
  legible to a non-technical reader. 0.5 if a delta exists but is buried or
  jargon-y. 0 if the hero is a pure snapshot.

## 7. `status-redundant-legible` — Status uses color + shape + word, legibly sized (weight 3)

- **Good looks like:** A consistent 3-4 state legend (green=solid/done,
  blue=active-now, amber=below-bar/in-progress, red=blocked-only) applied
  repo-wide, each state carrying at least two channels — color AND an icon/shape
  (✓ / pulsing dot / ○) AND/or a word ("solid — meets the bar"). Red is never
  reused for normal backlog (e.g. Open-Questions counts must not be red). All
  glanceable status text is ≥12px (badges, labels), and the view stays parseable
  in grayscale / for red-green colorblindness.
- **Bad looks like:** Color-only status with no glyph/word; red meaning both
  "blocked" and "normal backlog"; sub-12px status text (9-10px phase labels or
  badges) the reader must read; inconsistent palette across cards.
- **How to score:** 1.0 if every status has ≥2 channels, palette is consistent,
  red means only blocked, and all status text ≥12px. Subtract 0.3 for color-only
  states, 0.3 for an overloaded/inconsistent color meaning, 0.2 per sub-12px
  must-read status string. Floor 0.

## 8. `progressive-disclosure-calm` — One quiet door to detail; calm, self-sufficient default (weight 3)

- **Good looks like:** Exactly one low-emphasis toggle ("Show the machinery
  (loop, metrics, history)") — muted border/text, defaulted closed — is the only
  expansion affordance, and it honestly previews its contents. The collapsed view
  fully answers the three priority questions without it (Missions sits outside the
  toggle). No "just one more" metric (BrainGrowth, KnowledgeGraph, per-cycle
  CycleFeed) is surfaced above the toggle, and nothing auto-expands.
- **Bad looks like:** Machinery auto-expanded or surfaced above the toggle; a
  generic "Show more" label; multiple competing expansion controls; or a
  collapsed default that omits something needed for the three core questions.
- **How to score:** 1.0 if a single quiet, honestly-labeled, default-closed
  toggle is the only door and the default view is self-sufficient. Subtract 0.4
  if machinery leaks above the toggle, 0.3 for a generic/dishonest label, 0.3 if
  the default view is missing a core answer. Floor 0.

## 9. `mobile-fit-no-h-scroll` — Mobile-legible, fits above fold, no horizontal scroll (weight 2)

- **Good looks like:** At 320px and 390px widths the page never scrolls
  horizontally (no unbroken ID/monospace string widens the viewport); body base
  is ≥16px with primary answers ≥16px and no must-read text below 12px; the three
  priority answers fit within the first ~720px; interactive targets (the toggle)
  are ≥44x44px with ≥8px spacing; spacing follows a consistent scale
  (4/8/12/16/24) with aligned left edges; any horizontal-scroll strip
  (EvolutionLoop) stays behind the toggle.
- **Bad looks like:** Accidental page-level horizontal scroll; 9-11px must-read
  text; a 36px touch target; a too-tall Header/h1 pushing answer #2 or #3 below
  the fold; ad-hoc inconsistent margins; a horizontal carousel promoted to primary
  content.
- **How to score:** Start at 1.0; subtract 0.4 for any horizontal page scroll,
  0.2 per sub-12px must-read text class, 0.2 for a sub-44px primary touch target,
  0.2 if a core answer falls below the fold. Floor 0.
