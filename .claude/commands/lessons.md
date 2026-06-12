Reflect on everything you did this session. Identify mistakes, surprises, gotchas, or non-obvious knowledge that another agent would likely stumble on without your context.

> **Prefer `/document-learnings`** — it updates platform docs first, then runs this command. Use `/lessons` standalone only when you have no doc-worthy knowledge to add.

## Step 1: Review existing lessons

Read the `.planning/lessons-learned/` files for the domains you worked on. Check if any existing lessons are now **outdated, wrong, or misleading** based on what you learned this session. Things change — a lesson that was correct 3 months ago might now cause harm if followed.

- **Update** lessons where the rule is still valid but details changed (e.g., new file paths, different commands, updated versions).
- **Delete** lessons that are no longer true (e.g., a workaround for a bug that's been fixed, a constraint that no longer exists).
- **Correct** lessons where you discovered the original rule was wrong or incomplete.

## Step 2: Add new lessons

For each new lesson:
1. **Check it doesn't already exist** — don't duplicate.
2. **Verify before writing** — grep or read the code to confirm any file paths, commands, or behaviors you reference are still current. Don't write lessons based on assumptions.
3. **Is this a lesson or a doc?** If your lesson explains "how X works" rather than "what went wrong", it belongs in `.planning/docs/`, not here. Lessons are about mistakes and surprises; docs are about how the platform works.
4. **Pick the right file** — `backend.md`, `frontend.md`, `infrastructure.md`, `deployment.md`, `migrations.md`, `secrets.md`, `tenants.md`, `ai-service.md`, or `general.md`.
5. **Use the standard format:**
   ```
   ### N. Short title
   **What happened:** One sentence describing the failure or surprise.
   **Rule:** One sentence stating the rule to follow going forward.
   ```
6. **Be brief.** If the next agent reads the rule and avoids the mistake, the lesson is good enough.

Only write lessons that are:
- **Non-obvious** — another agent would make the same mistake without this knowledge
- **Actionable** — there's a clear rule to follow
- **Durable** — not a one-time fix but a pattern that will recur
- **Verified** — you confirmed the details are accurate against the current codebase

Do NOT write lessons about things that are already obvious from the code, documented in pattern docs, or only relevant to this specific session.
