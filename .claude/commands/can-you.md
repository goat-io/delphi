Your task: {{input}}

## Before you write any code

You MUST complete these steps first. Do not skip them.

### 1. Identify which domains you'll touch

Determine which areas of the codebase your task involves (backend, frontend, expo, infrastructure, migrations, secrets, tenants, etc.).

### 2. Read lessons learned for those domains

Read the relevant files from `.planning/lessons-learned/`:

| If you're touching... | Read |
|---|---|
| `apps/backend/` | `backend.md` |
| `apps/frontend/` | `frontend.md` |
| `apps/infra_new/`, Docker, GCP | `infrastructure.md` |
| Deploying, releasing, CI | `deployment.md` |
| Schema changes, Prisma, pgroll | `migrations.md` |
| Secrets, env vars | `secrets.md` |
| Tenant operations | `tenants.md` |
| `apps/ai-service/` | `ai-service.md` |
| Git operations | `general.md` |

Read ALL files that apply — most tasks touch more than one domain.

### 3. Read the relevant pattern docs

Read the relevant files from `.planning/docs/patterns/` to understand how the system currently works:
- `multi-tenancy.md` — if touching tenant-scoped code
- `secrets.md` — if touching secrets or config
- `environment.md` — if touching env vars or runtime config
- `deployment.md` — if deploying or changing CI
- `migrations.md` — if changing database schema
- `conventions.md` — for coding patterns and conventions
- `authorization.md` — if touching permissions/RBAC

### 4. Check architecture docs if making structural changes

If your task involves architectural decisions, check `.planning/docs/architecture/` for relevant ADRs.

## Now execute the task

With the context from steps 1-4, implement the task. Apply what you learned from the docs and lessons — they exist to prevent you from repeating past mistakes.