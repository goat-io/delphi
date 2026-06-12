# Production Debugging Guide

Debug production issues in the Sodium GCP infrastructure. Read this entire guide before taking action.

---

## GCP Project Layout

| Project | ID | Contains |
|---------|----|----------|
| **sodium - prod** | `sodium-shared-platform` | Cloud Run (backend, centrifugo), Cloud SQL (MySQL + PostgreSQL), Memorystore Valkey, VPC, Storage, Cloud Armor |
| **Sodium State Production** | `goatlab-sodium-state-prod` | Cloud Run (infra-worker), GCS Pulumi state bucket |

---

## Cloud Run Services

| Service | Project | Region | Purpose |
|---------|---------|--------|---------|
| `sodium-backend` | `sodium-shared-platform` | `europe-west1` | Main API (tRPC + Express, multi-tenant) |
| `sodium-centrifugo` | `sodium-shared-platform` | `europe-west1` | Real-time WebSockets |
| `infra-worker` | `goatlab-sodium-state-prod` | `europe-west1` | Secrets API, infrastructure automation |

---

## Step 1: Health Check (Always Start Here)

```bash
# Platform tenant
curl -s "https://sodium-backend-ay2nttutma-ew.a.run.app/readyz?tenant=sodium-platform" | python3 -m json.tool

# Specific tenant
curl -s "https://sodium-backend-ay2nttutma-ew.a.run.app/readyz?tenant=agrosocial" | python3 -m json.tool
```

**Response includes:** version, uptime, and dependency health:
- `database` — PostgreSQL (SELECT 1 latency)
- `cache` — Valkey (PING latency)
- `search` — Typesense
- `realtime` — Centrifugo

**Status meanings:** `healthy` = all OK, `degraded` = non-critical dependency down, `unhealthy` = critical failure (503)

---

## Step 2: Read Cloud Run Logs

### Backend Logs

```bash
# Recent errors (last hour)
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="sodium-backend" AND severity>=WARNING' \
  --project=sodium-shared-platform --limit=30 --format="json" --freshness=1h

# Search for specific error patterns
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="sodium-backend" AND "YOUR_SEARCH_TERM"' \
  --project=sodium-shared-platform --limit=20 --format="json" --freshness=2h

# Oldest errors first (find when issue started)
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="sodium-backend" AND "ERROR_PATTERN"' \
  --project=sodium-shared-platform --limit=5 --format="json" --freshness=48h --order=asc

# Filter by specific revision
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.revision_name="sodium-backend-XXXXX-xxx" AND severity>=WARNING' \
  --project=sodium-shared-platform --limit=20 --format="json" --freshness=2h
```

### Infra-Worker Logs

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="infra-worker" AND severity>=WARNING' \
  --project=goatlab-sodium-state-prod --limit=20 --format="json" --freshness=2h
```

### Parsing Log Output

Logs are JSON. Use Python to extract the message field:

```bash
gcloud logging read '...' --format="json" | python3 -c "
import json, sys
logs = json.load(sys.stdin)
seen = set()
for l in logs:
    ts = l.get('timestamp','')[:19]
    sev = l.get('severity','')
    rev = l.get('resource',{}).get('labels',{}).get('revision_name','')
    msg = l.get('jsonPayload',{}).get('message',{})
    if isinstance(msg, dict):
        text = msg.get('message','')[:300]
    elif isinstance(msg, str):
        text = msg[:300]
    else:
        text = l.get('textPayload','')[:300]
    key = text[:80]
    if key and key not in seen:
        seen.add(key)
        print(f'{ts} [{sev}] [{rev}]: {text}')
"
```

---

## Step 3: Check Revision History

```bash
# List recent revisions with status
gcloud run revisions list \
  --service=sodium-backend \
  --project=sodium-shared-platform \
  --region=europe-west1 \
  --limit=5 \
  --format="table(name,active,creationTimestamp)"
```

Match revision timestamps to git commits to understand what code each revision runs.

---

## Step 4: Check Infrastructure Status

### Memorystore Valkey

The `gcloud redis` CLI does NOT support Memorystore for Valkey. Use the REST API:

```bash
TOKEN=$(gcloud auth print-access-token) && \
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://memorystore.googleapis.com/v1/projects/sodium-shared-platform/locations/europe-west1/instances" | \
  python3 -m json.tool
```

**Key fields:** `state` (should be ACTIVE), `discoveryEndpoints`, `pscAutoConnections`, `shardCount`, `replicaCount`

**Current Valkey config:** 1 shard, 1 replica, Valkey 8.0, AUTH_DISABLED, TLS (server auth), PSC networking

### Cloud SQL

```bash
gcloud sql instances list --project=sodium-shared-platform --format="table(name,state,databaseVersion,region)"
```

### VPC / PSC Forwarding Rules

```bash
gcloud compute forwarding-rules list \
  --project=sodium-shared-platform \
  --regions=europe-west1 \
  --filter="name~psc OR name~valkey OR name~sca-auto" \
  --format="table(name,IPAddress,target,network)"
```

### Audit Logs (Infrastructure Changes)

```bash
# Memorystore changes
gcloud logging read \
  'resource.type="audited_resource" AND protoPayload.serviceName="memorystore.googleapis.com"' \
  --project=sodium-shared-platform --limit=10 --format="json" --freshness=7d

# Cloud Run changes
gcloud logging read \
  'resource.type="audited_resource" AND protoPayload.serviceName="run.googleapis.com"' \
  --project=sodium-shared-platform --limit=10 --format="json" --freshness=7d
```

---

## Step 5: CLI Commands

```bash
# Migration status
sodium migrations:status --env prod
sodium migrations:status --env prod --tenant agrosocial
sodium migrations:status --env prod --json

# Secrets (view only, never modify directly)
sodium secrets:show --tenant agrosocial --env prod
sodium secrets:show --tenant agrosocial -k REDIS_CACHE_CONNECTION_STRING
sodium secrets:show --admin --env prod
```

---

## Common Error Patterns

### Valkey READONLY Errors
```
READONLY You can't write against a read only replica
```
**Cause:** ioredis connected to Valkey replica instead of primary. Check if discovery endpoint is routing correctly. May need Valkey cluster restart or replica removal.

### Failed to refresh slots cache
```
ClusterAllFailedError: Failed to refresh slots cache
```
**Cause:** ioredis Cluster client can't discover Valkey topology. Check PSC/VPC connectivity. Internal node IPs from CLUSTER SLOTS may not be reachable through PSC endpoints.

### Task Worker Import Errors
```
Cannot find package '@src/config' imported from .../platform-task-workers.js
```
**Cause:** TypeScript path alias `@src/` not resolved in compiled JS output. Check `tsc-alias` build step.

### BullMQ Queue Failures
```
[Queue] Failed to queue dispatch hint for <task>: READONLY
```
**Cause:** Valkey is read-only (see READONLY pattern above). All BullMQ-dependent features are broken (tenant creation, migrations, scheduled jobs).

### Tenant Resolution Failures
```
[resolve-domain] Error resolving domain
```
**Cause:** Tenant not found in registry. Check PlatformTenant table or static tenant list.

---

## Key Architecture Facts

1. **Single Cloud Run instance serves ALL tenants** — tenant isolation is per-request via DI container + AsyncLocalStorage
2. **Tenant resolution order:** `?tenant=` query param > `x-tenant-id` header > subdomain > default (`sodium-platform`)
3. **Secrets come from infra-worker** — never from env vars or local files in prod
4. **Valkey uses PSC (Private Service Connect)** — not VPC connector. Discovery endpoint at `10.0.0.2:6379`, replica at `10.0.0.3`
5. **Database migrations are automatic** on cold start — leader migrates `sodium-platform`, then enqueues BullMQ jobs for other tenants
6. **Never use `gcloud run services update`** or direct Pulumi commands — always deploy via CI: `gh workflow run ci-deploy.yml -f version=X`
7. **No DEV environment** — deploy directly to production
8. **To force a new revision** (e.g., pick up new secrets): bump version in `apps/backend/package.json`, then run `/release`

---

## Key Files

| What | Where |
|------|-------|
| Health endpoints | `apps/backend/src/api/health/health.controller.ts` |
| Tenant extraction | `apps/backend/src/config/multitenant/middleware/reqTenantExtractor.ts` |
| Tenant bootstrap | `apps/backend/src/config/multitenant/middleware/multiTenantExpressMiddleware.ts` |
| Valkey connection | `apps/backend/src/database/datasources/redis.datasource.ts` |
| BullMQ queue | `apps/backend/src/config/queue.ts` |
| Dispatch workers | `apps/backend/src/config/dispatch/dispatch.setup.ts` |
| Platform task workers | `apps/backend/src/config/dispatch/platform-task-workers.ts` |
| Secret providers | `apps/backend/src/services/secrets/secret-provider.factory.ts` |
| Migration service | `apps/backend/src/services/migrations/migration.service.ts` |
| Migration admin API | `apps/backend/src/api/_express/admin/migrations.resource.ts` |
| GCP infrastructure | `apps/infra_new/src/stacks/gcp/gcp-infrastructure.ts` |
| Valkey adapter | `apps/infra_new/src/components/adapters/gcp/valkey-adapter.ts` |
| Tenant secrets | `apps/infra_new/src/services/tenant-secrets.service.ts` |
| Deploy CLI | `packages/sodium-cli/src/commands/deploy.ts` |
| Cold start / migrations | `apps/backend/src/main.ts` (search "Migration Leader Hook") |

---

## Step 6: Running Scripts Against Production

### Method 1: `runScriptWithContainer` (preferred for sodium-platform and WordPress tenants)

```typescript
// TENANT_ID=sodium-platform APP_ENV=prod pnpm script platform/database/myScript
import { container, runScriptWithContainer } from '@src/config/_container'

runScriptWithContainer(
  async () => {
    const { prisma } = container.context
    const count = await prisma.account.count()
    console.log(`Accounts: ${count}`)
  },
  {
    tenantId: process.env.TENANT_ID || 'sodium-platform',
    environment: (process.env.APP_ENV as any) || 'prod',
    proxy: true,        // Starts IAP tunnel automatically
    disableRedis: true,  // Skip Redis for DB-only scripts
  },
)
```

**What `proxy: true` does:** Starts IAP SSH tunnel → fetches secrets via CLI → rewrites DB URLs to localhost → boots DI container.

**KNOWN LIMITATION:** `proxy: true` fails for tenants WITHOUT MySQL/WordPress (e.g., `minelink`, `demo2`) because `_container.ts` always fetches `DATABASE_URL` (MySQL secret). Use Method 2 instead.

### Method 2: Direct DB connection (works for ALL tenants)

Use this for non-WordPress tenants or when `runScriptWithContainer` fails:

```bash
# 1. Ensure IAP tunnel is running (port 15432)
sodium db:proxy --db postgres

# 2. Get tenant's DB URL
node packages/sodium-cli/bin/run.js secrets:show --env prod --tenant=minelink -k DB_URL

# 3. Run script with rewritten URL
DB_URL="postgresql://user:pass@localhost:15432/minelink_backend_prod?sslmode=disable" \
SECRET_PROVIDER_TYPE=infra-cli \
DISABLE_REDIS=true \
APP_ENV=prod \
pnpm tsx -e "
const { categoriesTableSeeder } = require('./src/database/seeds/CategoriesTableSeeder');
// ... your script here
"
```

### Method 3: Admin API (for operations with existing endpoints)

```bash
# Get the admin API key
node packages/sodium-cli/bin/run.js secrets:show --tenant sodium-platform --env prod
# Look for: API_KEY: fb958...

# Call admin endpoints
curl -s -X POST "https://api.getsodium.com/api/admin/migrations/status" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-tenant-id: minelink"

# Available admin endpoints:
# GET  /api/admin/migrations/status       — per-tenant migration status
# POST /api/admin/migrations/trigger      — trigger pgroll expand
# POST /api/admin/migrations/complete     — trigger pgroll contract
# POST /api/admin/migrations/seed         — seed platform tenant registry
# POST /api/admin/cache/flush-tenant      — flush all caches for a tenant
# POST /api/admin/cache/flush-account     — flush account cache
# POST /api/admin/search/ensure-collections — create missing Typesense collections
```

**NOTE:** The admin `x-api-key` is `INFRA_WORKER_BACKEND_API_KEY` — it's set as a Cloud Run env var, NOT stored in tenant secrets. Get it from the full secrets dump (look for `API_KEY` in the output).

### Common Production Scripts

```bash
# Re-seed categories for a specific tenant
DB_URL="$(node packages/sodium-cli/bin/run.js secrets:show --env prod --tenant=TENANT -k DB_URL 2>&1 | grep '^postgresql://')"
DB_URL="${DB_URL/10.254.0.2/localhost}?sslmode=disable" \
SECRET_PROVIDER_TYPE=infra-cli DISABLE_REDIS=true APP_ENV=prod \
pnpm tsx -e "
const { categoriesTableSeeder } = require('./src/database/seeds/CategoriesTableSeeder');
const { PrismaClient } = require('prisma-client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DB_URL, max: 5 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  await categoriesTableSeeder(prisma);
  await prisma.\$disconnect(); await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
"

# Query prod DB (read-only)
TENANT_ID=sodium-platform APP_ENV=prod pnpm script platform/database/queryProd

# Run pgroll migrations for a single tenant
pnpm script platform:database:pgrollMigrateAll -- --phase complete --env prod --tenant minelink

# Check Typesense search health
curl -s "https://api.getsodium.com/api/admin/search/ensure-collections" \
  -X POST -H "x-api-key: YOUR_KEY" -H "x-tenant-id: minelink"
```

### IAP Tunnel Management

```bash
# Start proxy (stays running in foreground)
sodium db:proxy --db postgres        # PostgreSQL on localhost:15432
sodium db:proxy --db mysql           # MySQL on localhost:13306

# Check if tunnel is running
nc -z localhost 15432 && echo "open" || echo "closed"

# Lock file location (refcount-based sharing)
cat /tmp/sodium-db-proxy.lock

# Kill stale tunnel
kill $(cat /tmp/sodium-db-proxy.lock | python3 -c "import sys,json; print(json.load(sys.stdin)['pid'])")
rm /tmp/sodium-db-proxy.lock
```

### Bastion VM Details

| Instance | Project | Zone | Purpose |
|----------|---------|------|---------|
| `sodium-prod-bastion` | `sodium-shared-platform` | `europe-west1-b` | IAP SSH tunnel gateway |

Internal IPs forwarded through bastion:
- `10.254.0.2:5432` → PostgreSQL (port 15432 locally)
- `10.254.0.9:3306` → MySQL (port 13306 locally)
- `10.0.0.5:6379` → Redis/Valkey (port 16379 locally)

---

## Debugging Workflow

1. **Health check** — `/readyz?tenant=sodium-platform` to see which dependencies are down
2. **Read logs** — filter by service, severity, and time range
3. **Identify revision** — match revision to git commit to understand what code is running
4. **Check infrastructure** — Valkey status, Cloud SQL, VPC/PSC forwarding rules
5. **Check audit logs** — find what infrastructure changes happened recently
6. **Timeline** — find when errors started (`--order=asc`), correlate with deploys and infra changes
7. **Fix** — code change + `/release` (CI build → promote → CI deploy), never direct infra manipulation
