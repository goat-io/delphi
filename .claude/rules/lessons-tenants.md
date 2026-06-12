---
paths: "**/tenant*/**/*.ts, **/provisioning*/**/*.ts, **/appConfig*"
---

# Tenant Patterns

## Config Layers
- Two layers: `_defaults.ts` (fallback for unknown/new tenants) and `appConfig.ts` → `buildAppConfigs()` (explicit for known tenants). Edit `appConfig.ts` for known tenants, NOT `_defaults.ts`.

## Database Recreation
- Any database recreated outside normal pipeline MUST run ALL steps: (1) pgroll baseline, (2) seeds (`dbSeeder()` for roles + categories), (3) Typesense collection recreation, (4) Typesense reindex.

## Provisioning Checkpoints
- `provisioning_step` in `sodium_platform_tenant` tracks progress. If a step was checkpointed but underlying resource was cleared, reset: `UPDATE sodium_platform_tenant SET provisioning_step = 'INFRASTRUCTURE' WHERE slug = '<tenant>'`.
- Checkpoints can lie — verify tables actually exist after migration before trusting checkpoint state.

## Database Naming
- Convention is `{tenantId}_{service}` (e.g., `agrosocial_medusa`), NOT `{service}_{tenantId}`. Tenant prefix must be first for ACL grants.

## CDN Setup
- CDN setup in `createTenantTask.ts` is **blocking** with 3 retries. If all attempts fail, tenant creation throws. This is the last checkpoint before COMPLETE.
- Asset cookie `URLPrefix` must come from `urlService.getPrivateStorageUrl()`, not constructed from hostname.

## Deletion Patterns
- Always use the ORIGINAL provisioning slug (e.g., `--slug demo2`), not the renamed `__deleted_` slug. Infra resources use the original slug.
- Every deletion step must be idempotent — backup skips empty buckets, destroy is non-blocking, state cleanup treats missing files as success.
- Deletion must clear `stackName: null` alongside slug rename — otherwise slug reuse fails with unique constraint.
- CDN cleanup must include backend buckets (`private-uploads-backend-{slug}`, `public-uploads-backend-{slug}`), not just URL Map rules.
- Never delete `sodium-platform` — both script and task have hard blocks via `PLATFORM_META_TENANT_ID`.

## Cache Invalidation (Create & Delete)
- Tenant create and delete must invalidate 3 cache layers: (1) Container LRU via `invalidateTenantDistributed(slug)`, (2) Credential L1+L2 via `getCredentialCacheService().invalidate(slug)`, (3) Redis keys `credentials:{slug}:*` via SCAN+DEL.
- Manual escape hatch: `POST /api/admin/cache/flush-tenant` with `x-tenant-id` header.

## Test Data
- Clean up test tenants from production. Failed test tenants cause warnings on every deploy during pgroll contract phase.
