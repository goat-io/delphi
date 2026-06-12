---
paths: "apps/infra_new/**/*"
---

# Infrastructure Patterns

## Deploy Safety (VIOLATION = PRODUCTION OUTAGE)
- **NEVER run `stack-runner.ts` directly** or raw `pulumi up/refresh/destroy` against prod — Pulumi will DELETE Cloud Run services.
- **NEVER use `gcloud run services update/delete`** — causes state drift breaking future deploys.
- **ALWAYS deploy via CI:** `gh workflow run ci-deploy.yml -f version=X`. Never run `sodium deploy` locally.
- Only exceptions: `secrets-runner.ts` and `tenant-provisioner.ts` (don't manage Cloud Run resources).
- Release pipeline: release → promote → deploy. Never skip steps.

## Pulumi State
- Stale locks: `PULUMI_BACKEND_URL=gs://goatlab-sodium-state-prod-pulumi-state npx pulumi cancel --stack <stack> --yes` from `apps/infra_new/`.
- Pending operations survive `pulumi refresh`. To clear: export state → remove `pending_operations` array → import cleaned state.
- Platform-oauth `.json.bak` is the recovery source for shared secrets if `.json` gets corrupted.
- Config namespace: `new pulumi.Config()` reads from project name namespace (e.g., `sodium-secrets-prod:key`), NOT `sodium:key`.
- Workspace cache is only safe for `file://` backends. For GCS backends (`gs://`), create a fresh workspace each time — stale outputs otherwise.

## URL Map & CDN
- Both `private-mt-cdn-url-map` and `public-mt-cdn-url-map` must have `ignoreChanges: ['hostRules', 'pathMatchers']` — these are managed at runtime by `cdn-bucket-provisioner.service.ts`, not Pulumi.
- CDN infrastructure must be created unconditionally when `enableCDN=true`. Never gate on tenant discovery.
- Per-tenant DNS records are managed at runtime via Vercel REST API. Static DNS records stay in Pulumi.
- Wildcard SSL certs need ONE shared `DnsAuthorization` for the base domain — not per-CDN. The `_acme-challenge` CNAME goes in Vercel DNS.
- CDN debugging: check `server:` header — `UploadServer` = hitting GCS directly (not CDN). Check URL Map host rules before investigating cookies.
- GCP URL Map changes take ~30s to propagate. Don't treat immediate 404s as failures.

## Docker & Containers
- Only install Pulumi plugins actually used: `cloudflare`, `command`, `docker`, `gcp`, `mysql`, `random`.
- Infra-worker needs at least 2Gi memory and 2 CPU for Pulumi operations.
- New services must use the Pulumi addon pattern (see WordPress addon in `apps/infra_new/src/components/addons/`).
- Docker volume mounts: mount only `src/` and config files — NEVER entire app directory (clobbers container node_modules).

## GCP Cloud SQL
- Removing resources requires updating BOTH shared stack AND tenant stack code, then cleaning orphaned Pulumi state from all tenant stacks.
- Cloud SQL has TWO deletion protections: Pulumi `protect` flag AND GCP `deletionProtection`. Both must be disabled.
- `shared_buffers` uses KB units. Don't override adapter defaults without checking tier limits.

## PostgreSQL
- pg18+ requires `/var/lib/postgresql` mount, not `/var/lib/postgresql/data`. Delete old volume when switching major versions.
- pgvector extension must be in TWO places: `pgroll-init.sql` (Docker local) AND `PgrollMigrationEngine.ensureExtensions()` (GCP production).

## Environment
- Don't use `env` from `_env/env.ts` in infrastructure code — crashes without `APP_ENV`. Use `config.env` from `StackConfig`.

## Agent Concurrency
- Commit changes as soon as they're verified. Don't accumulate uncommitted work across multiple files — another agent may overwrite your edits.

## WordPress/MySQL (Deprecated)
- MySQL, ProxySQL, WordPress are **disabled by default** in `sodium infra:recreate`. Enable with `--wordpress` flag.
