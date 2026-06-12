Pause all work. Create a complete handover in two steps:

## Step 1: Capture Lessons Learned

Before writing the handover, reflect on this session. Run `/lessons` to capture any hard-won knowledge into the lessons-learned files.

## Step 2: Write the Handover

Update the single `AGENT_HANDOVER.md` in the **root** of the project with this structure:

```markdown
# Agent Handover - Sodium

**Last Updated:** <today's date> (Session N)

## Current State
What was the goal? What got done? What's still in progress?
Use a table: Component | Status | Details

## Blockers / Open Issues
For each blocker, do a 5-why root cause analysis so the next agent can pick up immediately.

## Key Decisions
Important architectural or design decisions made this session that affect future work.

## Key Files Changed
Group by app/package. Only list files that matter for context — not every single edit.

## Tips for Next Agent
Actionable tips that will save the next agent time. Include:
- Running processes or tunnels that may still be open
- Gotchas specific to the current state
- What to do first vs. what can wait

## Production State
Current versions, tenant status, health.
```

Rules:
- **Only update the ROOT `AGENT_HANDOVER.md`** — do NOT update or create per-app handover files.
- Replace the previous session's content entirely — this is not an append log.
- Be specific and actionable. The next agent starts cold with zero context.
- If you worked on `.planning/` roadmap files, update those as well.
