---
paths: "**/scripts/**/*.ts, **/scripts/**/*.js"
---

# Scripts Rules

## Run Command Header (REQUIRED)

Every script MUST have a run command comment on the **first line**:

```typescript
// APP_ENV=<env> pnpm script <path>

import { runScript } from '@goatlab/node-utils'
```

Examples:
```typescript
// APP_ENV=dev pnpm script platform:database:migrate
// APP_ENV=local pnpm script tenant:agrosocial:loadAsoexData
// APP_ENV=prod pnpm script platform:search:reindex
```

## Folder Structure

```
scripts/
├── _lib/              # Shared utilities (runScript.ts)
├── platform/          # Sodium platform scripts (reusable across tenants)
│   ├── database/      # Migrations, seeding framework
│   ├── secrets/       # Encryption utilities
│   ├── auth/          # Token management
│   ├── search/        # Typesense indexing
│   └── ...
├── tenants/           # Tenant-specific scripts
│   ├── agrosocial/
│   └── gealium/
└── dev/               # Development/debugging (not deployed)
```

## Script Naming

- Use `.script.ts` suffix for entry-point scripts: `migrate.script.ts`
- Use `.ts` suffix for helper modules: `seedHelpers.ts`
- Use descriptive names: `loadAsoexData.ts` not `load.ts`

## Script Aliases

Use alias format for cleaner invocations:

| Alias | Resolves To |
|-------|-------------|
| `platform:*` | `scripts/platform/*` |
| `tenant:*` | `scripts/tenants/*` |
| `dev:*` | `scripts/dev/*` |
| `db:*` | `scripts/platform/database/*` |
| `auth:*` | `scripts/platform/auth/*` |
| `search:*` | `scripts/platform/search/*` |

## Running Scripts Against Production

Use `runScriptWithContainer` with `proxy: true` to run scripts against production databases. This starts an embedded IAP tunnel — no separate `sodium db:proxy` needed.

```typescript
// TENANT_ID=sodium-platform APP_ENV=prod pnpm script platform/database/myScript

import { container, runScriptWithContainer } from '@src/config/_container'

runScriptWithContainer(
  async () => {
    const { prisma } = container.context

    const count = await (prisma as any).account.count()
    console.log(`Accounts: ${count}`)
  },
  {
    tenantId: process.env.TENANT_ID || 'sodium-platform',
    environment: (process.env.APP_ENV as any) || 'prod',
    proxy: true,
  },
)
```

**What `proxy: true` does:**
1. Starts IAP SSH tunnel to bastion VM (PostgreSQL on `localhost:15432`, Redis on `localhost:16379`, MySQL on `localhost:13306`)
2. Fetches prod secrets (`DB_URL`, `REDIS_URL`) via `sodium secrets:show`
3. Rewrites connection URLs to point through the tunnel
4. Auto-detects local infra-worker on `localhost:4324` — uses it if running, otherwise resolves Cloud Run URL from bootstrap Pulumi state
5. Resolves `INFRA_WORKER_BACKEND_API_KEY` from bootstrap state (no hardcoded secrets)
6. Boots the DI container with rewritten URLs
7. Releases the tunnel when the script exits

**Options:**
- `proxy: true` — enables IAP tunnel + prod secret fetching
- `disableRedis: true` — skips Redis tunnel and sets `DISABLE_REDIS=true` (for admin scripts that don't need Redis/BullMQ)

**Key rules:**
- Set `proxy: true` ONLY for scripts targeting prod — leave `false` (default) for local dev
- Always set `APP_ENV=prod` when running with proxy (`TENANT_ID` is usually set in the script config)
- The tunnel uses refcount-based sharing (lock file at `/tmp/sodium-db-proxy.lock`) — multiple scripts can reuse the same tunnel
- Redis uses `__SODIUM_PROXY_REDIS_URL` env var to avoid clobbering the normal provider chain
- To run infra-worker locally pointed at prod: `sodium serve:back --env prod`

**Key files:**
- Container + runScriptWithContainer: `apps/backend/src/config/_container.ts`
- Proxy tunnel management + bootstrap resolver: `apps/backend/src/config/database/proxy.ts`
- Example prod script: `apps/backend/scripts/platform/database/queryProd.script.ts`
- Tenant deletion script: `apps/backend/scripts/platform/tenant/deleteTenant.script.ts`

## Promotion Rule

Start scripts as tenant-specific. Promote to `platform/` only when:
1. Reused by 2+ tenants
2. Has stable API
3. No tenant-specific logic embedded
