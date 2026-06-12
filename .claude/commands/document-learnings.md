Reflect on everything you learned this session. Your goal is to improve the platform's knowledge base so future agents waste less time.

This is a two-phase process: first document what you learned, then extract lessons.

---

## Phase 1: Update Platform Documentation

Review what you discovered, built, debugged, or changed this session. Identify knowledge that belongs in `.planning/docs/` — the curated source of truth about how this platform works.

### What belongs in docs

- How a system actually works (not how you wish it worked)
- Architectural patterns, data flows, integration points
- Configuration that isn't obvious from the code
- Gotchas that affect multiple future tasks
- Corrections to things the docs currently get wrong

### What does NOT belong in docs

- Session-specific details (ticket numbers, temporary state)
- Things obvious from reading the code directly
- Speculative plans or ideas not yet implemented
- Duplicate information already well-covered

### Process

1. **Read the relevant docs first.** Before writing anything, read the pattern docs and any other `.planning/docs/` files related to what you worked on. You cannot improve docs you haven't read.

2. **Verify before writing.** Every claim you add must be something you confirmed this session through code, logs, or testing. If you're not sure something is true, grep the codebase or check the code before documenting it. Do not document assumptions.

3. **Fix what's wrong.** If you found that existing docs contain incorrect information, outdated paths, wrong commands, or misleading descriptions — fix them. The docs are not append-only. Remove or correct stale content.

4. **Add what's missing.** If you discovered how something works that isn't documented anywhere, add it to the appropriate file:
   - `patterns/` — for recurring patterns (deployment, secrets, migrations, multi-tenancy, environment, conventions, authorization)
   - `architecture/` — for significant architectural decisions (create an ADR)
   - `infrastructure/` — for infra-specific knowledge (observability, load testing)
   - Update existing files rather than creating new ones when possible

5. **Keep quality high.** These docs are read by agents who need to make decisions. Write clearly, be specific, include file paths and commands. Don't pad with fluff. If a section is 3 lines, that's fine.

6. **Update the README if needed.** If you added a new doc file, make sure `.planning/docs/README.md` references it.

### Quality checklist before moving to Phase 2

- [ ] Every fact I added is something I verified this session
- [ ] I read the existing docs before modifying them
- [ ] I didn't duplicate information already present
- [ ] I removed or corrected any stale/wrong content I found
- [ ] File paths and commands I referenced are current

---

## Phase 2: Extract Lessons Learned

Now run the `/lessons` command to capture actionable lessons from mistakes, surprises, and gotchas.
