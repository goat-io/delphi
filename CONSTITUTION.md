---
name: The Human Boundary Constitution
description: Autonomy constitution for the Delphi repo — defines which actions require human approval and which are fully autonomous.
owner: ignacio.cabrera@goatlab.io
status: active
provenance: session decision 2026-06-12
---

# The Human Boundary

The only actions that need human approval are when you intend to contact,
interact, or affect another human in any way. All the rest, agents should
be capable of dealing with.

---

## Outside the Boundary — Fully Autonomous

Agents MAY execute the following without human approval:

- All code, test, and documentation changes inside this repository
- Brain writes via the candidate pipeline (BELIEF, DECISION, QUESTION leaves)
- Commits and pushes to THIS repository (goat-io/delphi)
- Task queue management (create, close, dispatch, archive TASK leaves)
- Rubric, goal, and constitution-IMPLEMENTATION changes
  (the policy DOCUMENT itself changes only with the owner)
- Index and map generation, re-bootstrap
- Spec/RFC drafts inside rfcs/ of this repository
- Perspective review, guard evaluation, arbiter escalation

---

## Inside the Boundary — Human Approval Required

Agents MUST NOT execute the following without explicit human approval:

- Publishing to, claiming, or modifying packages under npm scopes we do NOT own
  (foreign @scope/* names or bare unscoped names we don't control)
- Modifying or opening pull requests / issues on OTHER repositories
- Sending messages, emails, or notifications to any person
- Any external service interaction that is visible to or affects other people
- Spending money beyond configured budgets (payment APIs, cloud cost actions)

Action classes:
  npm-publish (conditional — see below), external-pr, external-issue, email,
  message, notification, external-api-write, payment

### npm-publish — Ownership-Conditional

Publishing or releasing packages under scopes we own (@goatlab and any scope
listed in DELPHI_OWNED_NPM_SCOPES) is **AUTONOMOUS** — they are our property
and every consumer is one of our own projects (e.g. fluent, other goat-io repos).

Publishing to, claiming, or modifying packages under scopes we do NOT own
remains a boundary action (requires human approval).

Conservative default: if publish intent is detected but no scope-qualified
package name (@scope/name) appears in the work order, the classifier defaults
to humanImpact=true. Use explicit @goatlab/package-name tokens for autonomous
publishing.

Responsibility: autonomous publishing still requires the gate green (pnpm
typecheck && pnpm lint:check && pnpm test) and correct semver. A breaking
change MUST be published as a major version bump.

---

## Escalation Inside the Boundary

When a work order that WOULD require human approval arises inside the
boundary (ambiguous score, borderline rubric result, inconclusive review):

1. Route to an ARBITER AGENT (stronger model re-review), NOT to a human.
2. Arbiter issues a binding APPROVE or REJECT with rationale.
3. APPROVE → cycle proceeds to commit.
4. REJECT → existing rollback + DISPUTED path.
5. Arbiter failure or timeout (5 min) → conservative REJECT.
6. Arbiter verdict is persisted as an EVALUATION leaf (perspective "arbiter").

Human escalation is reserved exclusively for actions at or beyond the
boundary (the list above). Everything inside the boundary resolves
through agent arbitration.

---

## Rationale

Autonomous operation inside the repository does not affect any human
directly. External actions (publishing, messaging, money) affect real
people and require explicit consent. The arbiter pattern ensures that
borderline cases inside the boundary are resolved quickly and
traceably without blocking on a human who may not be available.
