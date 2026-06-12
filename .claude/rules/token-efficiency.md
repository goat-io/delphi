---
paths: "**/*"
---

# Token Efficiency — Mandatory Dispatch & Context Discipline

Tokens are a budget. The biggest sinks are (1) speculative exploration, (2) subagents re-reading what the controller already knows, and (3) rework from degraded long-context sessions. These rules attack all three. (Distilled from obra/superpowers, 2026-06.)

## 1. Model Roles — Fixed Hierarchy

Each model tier has a role. Don't blur them:

| Tier | Role | Does | Never does |
|------|------|------|------------|
| **Fable / Opus** | Planner & Reviewer | Understand the need, design the solution, write detailed plans, review subagent output, make judgment calls. **Finally responsible for everything produced.** | Low-level actionable tasks: writing the code, running the test loops, mechanical edits. Their time and context are the scarcest resource — protect both. |
| **Sonnet** | Executor | Implement planned tasks: write the failing test, make it pass, commit. Multi-file integration, focused debugging with known scope. | Design decisions, scope changes, "improving" the plan. |
| **Haiku** | Summarizer | Digest data: summarize logs/diffs/files/test output, extract facts, report status. | Writing or modifying code. |

**Fable's main job is the plan.** Before dispatching anything, get a clear view of what's needed and design the solution. Then write the plan for an enthusiastic subagent with zero project context and questionable taste: exact file paths, the actual code, the exact commands with expected output. If you can't write that spec, you don't understand the problem yet — explore (via Haiku/Explore agents) until you do.

**Executors work red/green.** Every implementation task follows the cycle: write the failing test → run it, watch it fail → write minimal code → run it, watch it pass → commit. The plan must be structured so each task supports this. Red/green means different things per domain — the plan must state which applies:

| Domain | "Red" (define failure first) | "Green" (prove it) |
|--------|------------------------------|--------------------|
| Backend/frontend/packages code | Failing unit/functional test | Test passes, `pnpm lint` + `typecheck` clean |
| Infra (Pulumi, Helm, k8s YAML, alerts) | State the observable check BEFORE the change: the alert that must fire, the `kubectl`/`curl` assertion, the fire-test or drill | Run that exact check after; alerts get fire-tested, not assumed |
| Migrations (pgroll) | The schema diff you expect | Generated JSON manually reviewed (CLAUDE.md rule 13), zero-downtime verified |
| Docs/config-only | The question the doc must answer / behavior the config must change | Re-read as the target audience / observe the behavior change |

**Dispatch and review use the templates** in `.planning/docs/patterns/agent-dispatch.md` — implementer prompt (full task text, exact paths, constraints, verification command, return format) and the two-stage review prompts (spec compliance first, then code quality). Don't freestyle dispatch prompts.

**Tasks are really specific and bite-sized.** One task = one self-contained change an executor can finish without asking questions. Independent tasks go to different agents — dispatch them in parallel. Tasks touching the same files stay sequential.

**Escalation:** if an executor reports BLOCKED, fix the plan or the context — don't drop to doing the task yourself in main context, and never retry unchanged. If a task genuinely needs judgment, it was a planning task mislabeled as execution; take it back.

**Accountability:** delegation never delegates responsibility. Fable/Opus reviews what comes back (spec compliance first, then quality) and owns the final output.

## 1b. When an Agent Deviates — Root-Cause It, Then Encode the Fix

If a subagent didn't follow what you told it, the deviation is a signal, not just a defect to patch over. Figure out **why** it happened:

- **Ambiguous prompt?** The spec allowed two readings and the agent picked the other one.
- **Missing context?** The agent couldn't know something you knew and improvised.
- **Wrong tier?** The task needed judgment you sent to an executor.
- **Conflicting instruction?** A rule, CLAUDE.md line, or skill pulled it the other way.
- **Plan defect?** The task wasn't actually executable as written.

Then **fix it for future Fable/Opus models**, not just for this dispatch:

1. Fix the immediate issue (re-dispatch with the corrected prompt/context).
2. Encode the lesson where the next planner will find it: this rule file (dispatch patterns), `.claude/rules/` (path-scoped lessons), `.planning/lessons-learned/` (domain incidents), or the relevant agent definition in `.claude/agents/` (if the agent's own instructions caused it).
3. If the same deviation has happened twice, the encoding from the first time failed — strengthen it, don't re-write the same note.

This is how the place stays evolving: every deviation either improves a prompt pattern, a rule, or an agent definition. A lesson that lives only in your session dies with it.

## 2. Curated Context — Never Make Subagents Re-Read

The controller (you) constructs exactly what the subagent needs. Subagents never inherit session history and should never re-discover what you already know.

- **Paste, don't point.** Include the full task text, relevant code snippets, error messages, and file paths IN the dispatch prompt. "Read the plan at docs/plan.md" wastes a full file-read per subagent; extract once, paste N times.
- **Exact paths, exact scope.** "Fix `apps/backend/src/api/posts/posts.service.ts:140-180`" — never "find where posts are saved".
- **State constraints.** "Do NOT change production code", "tests only", "don't touch other agents' files".
- **Specify the return.** Tell the subagent exactly what to report back (e.g. "return root cause + diff summary, not file contents"). Subagent output is tokens in YOUR context.

## 3. Plan Before Dispatch, Explore Before Plan

Unplanned exploration by an expensive model is the #1 token sink.

- For multi-step work, write the plan first (plan mode). Each task in the plan should carry exact file paths and enough detail that a fresh agent with zero context could execute it. No "handle edge cases appropriately" placeholders — vague plans push discovery cost onto every executor.
- Use the `Explore` agent (read-only, excerpt-based) for broad searches instead of grepping/reading file-by-file in main context. You need the conclusion, not the file dumps.
- One focused question per exploration dispatch. Parallel independent searches go in one message.

## 4. Keep the Main Context Lean

- Delegate anything that would pull >2-3 full files into main context just to produce a small conclusion.
- Read only the parts of files you need (offsets/limits); don't re-read files after editing them.
- Don't echo large tool outputs back in prose — summarize the conclusion.
- If a session has gone long and quality is degrading, prefer dispatching fresh subagents over pushing through — rework is the most expensive token cost of all.

## What This Does NOT Mean

- Don't sacrifice correctness for tokens — a wrong cheap answer costs more than a right expensive one.
- Don't skip verification (lint/typecheck/test) to save tokens.
- Don't dispatch subagents for trivia: simple questions, single-file reads, edits under 5 lines stay in main context (per CLAUDE.md).
