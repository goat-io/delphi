---
paths: "**/prisma/**/*.prisma, **/pgroll-migrations/**/*"
---

# Migration Patterns

## Zero-Downtime Principle
**ALL migrations must be zero-downtime and non-breaking.** pgroll's expand/contract model enables this:
- **Expand** creates new columns/tables alongside old ones (both schemas coexist)
- **Deploy** rolls out new code that uses the new schema
- **Contract** drops the old schema views

This means:
- Never drop columns, tables, or rename in a single step — use expand/contract (add new → migrate data → drop old)
- New NOT NULL columns must have defaults (so existing rows survive the expand)
- Never change column types in-place — add new column, backfill, switch reads, drop old
- Foreign key additions must not lock large tables — pgroll handles this via backfill

## Core Architecture
- **Prisma = schema + types ONLY. pgroll = ALL DDL.** Never run `prisma db push`, `prisma migrate deploy`, or any Prisma DDL command against any database.
- Workflow: `sodium db:migrate --name=desc` → `sodium db:sync` (local), CI deploy via `/release` (prod).

## Schema Changes — MANDATORY WORKFLOW
When modifying ANY `.prisma` file:
1. Edit the Prisma schema
2. Run `sodium db:migrate --name=desc` to generate the pgroll migration
3. Review the generated JSON (check for drift, duplicates, correct nullable/FK)
4. Commit BOTH the `.prisma` changes AND the migration files together
5. **If you skip step 2, the next deploy will break production** — new code expects columns that don't exist

Additional rules:
- Schema changes must land in the DB BEFORE the code that uses them.
- Never hand-write pgroll migration JSON — always use `sodium db:migrate` or `pgroll:diff`.
- Each table must be created in exactly ONE migration file.
- `sodium db:migrate` may capture unrelated drift — trim the output to only your intended changes.

## Auto-Generated Migration Review (REQUIRED)
`sodium db:migrate` auto-generates pgroll JSON from Prisma schema diffs. The tool auto-fixes:
- NOT NULL columns with defaults: adds `nullable: false` + `up` backfill expression
- TODO placeholders from `pgroll convert`: replaced with correct NULL/identity expressions
- FK constraints on new tables: inlined into `create_table` ops to avoid backfill errors
- FK constraints on new columns: inlined into `add_column` `references` field to avoid contract-phase shadow column mismatch
- FK modifications (drop+recreate): converted to raw SQL ops to avoid column deletion during contract
- Global numbering: scans all dirs (shared + all tenants) to prevent merge conflicts

**You MUST still review the output before committing.** Check for:
- Correct `nullable` / `up` values on `add_column` ops (especially NOT NULL with defaults)
- No duplicate operations from earlier migration files
- No unrelated drift (tables/enums from other PRs leaking in)
- Correct foreign key `on_delete` behavior (CASCADE vs SET NULL)
- Index uniqueness (`unique: true` vs regular index)

## pgroll Init
- pgroll init requires superuser — it's a provisioning-time operation (done by `pgroll-init.sql`), not runtime. Backend migration engine skips init when no superuser URL is available.
- `pgroll-init.sql` version MUST match the installed pgroll binary version exactly. Update both when upgrading pgroll.

## Baselines — DANGER ZONE
- **NEVER run `pnpm pgroll:baseline`** unless you are setting up a brand-new project or recreating ALL databases from scratch. It deletes every migration file and regenerates from the current Prisma schema. Production pgroll state tracks migrations BY NAME — deleting them causes production outages (see INC-001).
- The script now blocks if incremental files exist. If you truly need it: `pnpm pgroll:baseline -- --i-know-i-will-destroy-prod`
- For normal schema changes, always use `sodium db:migrate --name=desc`.
- Schema composition: `prisma/schema/` (shared) + `prisma/tenants/<type>/` (tenant-specific). `prisma/compose.ts` merges them. `TENANT_ID` controls which composition is used.

## Verification
- After migrations, verify core tables (`accounts`, `roles`, `categories`) exist in `public` schema before setting checkpoints. pgroll can return "up_to_date" without creating tables if not initialized or files are missing.
- Throw if no `DB_URL` is available instead of silently skipping migrations.

## Timeouts & Performance
- pgroll CLI timeout is 600,000ms (10 min). Full schema `--complete` on downsized instances takes 3-5 min.

## Production Deploy Pipeline
- pgroll expand (pre-deploy) → Cloud Run deploy → pgroll complete (post-deploy). If deploy fails → pgroll rollback.
- Cold start: when `migrateLeader()` returns `pgroll_skip`, the ENTIRE migration pipeline must be skipped — including `enqueueAllTenants()`.

## Key Commands
| Command | Purpose |
|---------|---------|
| `sodium db:migrate --name=desc` | Generate migration from schema diff |
| `sodium db:sync` | Apply pending migrations to all tenants |
| `pnpm pgroll:baseline` | Regenerate baselines from Prisma schema |
| `sodium migrations:status --env prod` | Per-tenant migration status |
