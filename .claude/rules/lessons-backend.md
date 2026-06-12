---
paths: "apps/backend/**/*"
---

# Backend Patterns

## Cold Start
- Cold-start hooks must be idempotent and fail-safe. When `migrateLeader()` returns `pgroll_skip`, skip the ENTIRE migration pipeline including `enqueueAllTenants()`.
- Backend cold-start must NOT run `pgroll init` — it's a provisioning-time operation. Skip init when no superuser URL is available.

## Redis / BullMQ
- Scripts with `disableRedis: true` must call task handlers directly (e.g., `deleteTenantTask.handle({...})`) — BullMQ has no worker without Redis. Use dynamic import to avoid circular deps.
- Valkey cache is EXTERNAL to Cloud Run — new revisions don't clear it. Use admin cache flush endpoints (`POST /api/admin/cache/flush-account` with `x-api-key`).
- Both `reconnectOnError` (queue.ts) and `installRedisErrorSafetyNet` (redis.datasource.ts) must match SSL/TLS error patterns. New Redis error patterns must be added to BOTH places.

## Rate Limiting
- Rate limiting is disabled by default (`RATE_LIMIT_ENABLED`). Cloud Run + Cloud Armor handle DDoS. Admin endpoints use API key auth.

## Typesense
- Tenant isolation uses **collection name prefix** (`{tenantId}__accounts`), NOT field-level filtering. Scoped keys must NOT add `filter_by` for tenant isolation.

## Auth & Sessions
- Local dev uses `cookiePrefix: 'better-auth-local'` to prevent collision with prod's `__Secure-better-auth.session_token` on shared parent domain.

## Multi-Tenancy
- `container.bootstrap()` context is temporary — never store ALS references outside the callback. Use `ctx.extended` in tRPC handlers.
- Tenant config: `_defaults.ts` (fallback) vs `appConfig.ts` → `buildAppConfigs()` (known tenants). Edit `appConfig.ts` for known tenants.
- `env` singleton is tenant-unaware. Tenant-specific config comes from DI container at runtime.

## Secrets
- Infra-worker is the single source of truth. Never create separate secret keys for things derivable from `getSharedCredentials()`.
- `getSharedCredentials()` needs `cloud` (e.g., `gcp`) and `region` (e.g., `europe-west1`) alongside `env` — defaults are for local dev only.
- `DB_URL`, `REDIS_URL` are computed at runtime by infra-worker, not stored in Pulumi state.
- `SECRET_PROVIDER_TYPE` must be set BEFORE module graph loads (Sentry imports at load time). Script runner auto-sets `SECRET_PROVIDER_TYPE=infra-cli` for prod.
- Secret key names must be valid `keyof SodiumSecrets` (defined in `config/secrets.ts`). Wrong keys silently return `undefined`.

## Container
- When adding a service to the container initializer's return in `_container.ts`, also add it to the `factory` object and `ContainerContext` — otherwise the service won't be typed on `ctx.extended`.

## Delphi / BullMQ Dispatch
- **NEVER call `workerBroker.start(connector)`** in `delphi.config.ts`. Sodium uses the cross-tenant dispatch pattern — persistent Workers steal jobs from `processIncomingDispatch`. Only enable for remote agent mode.
- `postUrl` on `ShouldQueue` subclasses is ignored in the delphi model. Jobs flow: `engine.start()` → BullMQ → `onAfterQueue` hint → `/dispatch/worker` → `stepTask.handle()`.
- `sensitiveFields` on tasks are for UI display only (redacted in `getStatus()` API response). They do NOT redact handler input or DB storage — unless WorkerBroker is active (which breaks everything).
- Stuck jobs in BullMQ `active` list with stale locks: no persistent Worker means no stalled-job recovery. Clear manually with `redis-cli DEL "{tenant:...:bull}:workflow_step_light:active"` if jobs are orphaned.
