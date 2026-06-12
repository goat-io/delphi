---
paths: "**/secrets/**/*.ts, **/secret*.ts, **/proxy.ts, **/credential*"
---

# Secrets Patterns

## Derived vs Stored Secrets
- `DB_URL`, `REDIS_URL`, `DATABASE_URL` are **computed** at runtime by infra-worker from component secrets (host + user + password + dbname) — they are NOT in Pulumi state.
- Use `sodium secrets:show --env prod --tenant=X -k DB_URL` to fetch derived secrets (calls infra-worker HTTP API).
- Backend code must derive URLs from `getSharedCredentials()`, not create separate secret keys.

## Proxy Env Var Scoping
- Use `__SODIUM_PROXY_` prefix for proxy-specific env vars (e.g., `__SODIUM_PROXY_REDIS_URL`). Config files check this first, then fall through to normal secret provider.
- `process.env.DB_URL` is the exception — it was already the highest-priority override in `getDatabaseUrl()` before proxy existed.

## CDN Signing Key
- Auto-generation must exist in BOTH secrets flows: `tenant-secrets.ts` (per-tenant stacks for old tenants) AND `ensureTenantSecrets()` in `secrets-retriever.ts` (shared stack for new tenants). Missing from either = 403 on signed cookies.

## Third-Party App Secrets
- Third-party frameworks (Medusa, WordPress) read `process.env` directly — that's correct. Pulumi/Cloud Run inject the values. Backend code uses `secretService.getSecretSync()`.

## SECRET_PROVIDER_TYPE Timing
- Must be set BEFORE module graph loads — Sentry imports at load time call `secretService.getSecret('SENTRY_DNS')`.
- Script runner auto-sets `SECRET_PROVIDER_TYPE=infra-cli` for prod. Legacy `SecretService` returns mock values in `infra-cli`/`infra-http` mode instead of loading `secrets.prod.json`.

## Scripts Targeting Prod
- `APP_ENV=local` with prod `DB_URL` resolves secrets from local Pulumi state, NOT prod. Override with explicit env vars: `TYPESENSE_URL=... DB_URL=... pnpm script ...`.
- When `process.env.DB_URL` is set (by proxy tunnel), parse host/port from it for superuser DB operations. Set SSL to `false` for localhost tunnels.
