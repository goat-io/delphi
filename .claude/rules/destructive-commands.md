---
paths: "**/*"
---

# Destructive Commands — NEVER Run Without Explicit User Request

## Production-Breaking Commands

These commands WILL cause production outages if run carelessly. **NEVER run them autonomously.** Only run if the user explicitly asks AND you explain the consequences first.

| Command | Risk | What to do instead |
|---------|------|-------------------|
| `pnpm pgroll:baseline` | Deletes ALL migration files. Breaks every production deploy. | Use `sodium db:migrate --name=desc` |
| `prisma db push` | Runs DDL directly, bypassing pgroll. Causes schema drift. | Use `sodium db:migrate --name=desc` |
| `prisma migrate deploy` | Conflicts with pgroll migration state. | Use `sodium db:migrate --name=desc` |
| `git stash` | Other agents lose their work. | Commit first, then pull/push |
| `git reset --hard` | Destroys uncommitted work from all agents. | Ask user first |
| `git push --force` | Overwrites remote history. | Never do this on main |

## Data-Destroying Commands

| Command | Risk |
|---------|------|
| `DROP DATABASE` | Irrecoverable without backup |
| `DROP TABLE` / `TRUNCATE` | Data loss |
| `pgroll rollback` in prod | Reverts schema, may break running code |
| `permanentlyDeleteTenant` | Destroys all tenant data, infra, and records |

## Multi-Agent Safety

Multiple agents work in this repo concurrently. Before committing:
- Run `git status` to see if other agents have uncommitted changes
- NEVER run `git checkout -- .` or `git restore .` — you'll destroy their work
- NEVER run `git clean -fd` — removes untracked files from other agents
- If there are merge conflicts, resolve them — don't discard changes

## Prisma Schema Changes Require Migrations

**Every `.prisma` file change MUST be accompanied by a migration file.** If you edit a Prisma schema and commit without running `sodium db:migrate --name=desc`, the next deploy will break production — the Prisma client will expect columns that don't exist in the database.

This is not optional. This is not "nice to have." This is a production outage waiting to happen.
