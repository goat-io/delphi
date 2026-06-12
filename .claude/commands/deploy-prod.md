# Deploy to Production

Deploy a promoted release to production via GitHub Actions CI.

**Prerequisites:** A promoted release must exist (see `/release` command).

> **Continuous deployment is ON:** pushes to `main` with deployable changes already release, promote, and deploy to prod automatically (kill-switch: repo variable `AUTO_DEPLOY=off`). Use this manual flow for deploying a specific version, rollbacks, or when CD is disabled.

## Step 1: Deploy

```bash
sodium deploy:prod
```

This automatically:
1. Finds the latest promoted release
2. Triggers `Deploy Release` GitHub Action
3. Watches for completion (~10-15 min)
4. Runs health check

To deploy a specific version:
```bash
sodium deploy:prod 2026.03.XX
```

To skip pgroll migrations:
```bash
sodium deploy:prod 2026.03.XX --skip-pgroll
```

Other options:
- `contract_now` (workflow input) / `--contract-now` (CLI) — finalize this release's migration immediately after deploy. By default the contract is **lagged to the next deploy** so backend rollback stays possible for one full release.
- `--skip-health-check` (CLI) — bypass the post-deploy `/readyz` health gate. Emergencies only.
- `--observability-window <seconds>` (CLI) — post-flip metric evaluation window (default 180), starting AFTER the cold-start exclusion. The deploy watches Cloud Monitoring: the new revision's 5xx rate and p95 latency vs the previous revision's trailing 30-min baseline, polling every 30s.
- `--observability-warmup <seconds>` (CLI) — cold-start exclusion (default 60): metrics from the first N seconds after the flip are ignored; total watch = N + window (≈ 4 min by default). Cold starts happen on every deploy and must not be compared against a warm baseline (v2026.06.10.9 false positive).
- `--observability-p95-ceiling <ms>` (CLI) — ceiling for the gate's effective latency threshold (default 10000): threshold = min(max(2× baseline, 2000ms), ceiling). Long-lived streaming/long-poll/SSE requests land in `request_latencies` and can blow up the baseline p95 (v2026.06.10.10: ~303570ms) — without the ceiling, 2× a polluted baseline silently disables the latency check. The gate logs loudly when the clamp engages.
- `--skip-observability-gate` (CLI) — skip the post-flip metric watch entirely (no automatic traffic rollback on regression).

## Step 2: Verify

```bash
# Health check
curl -s "https://api.getsodium.com/readyz?tenant=sodium-platform" | python3 -m json.tool

# Check all tenants
for t in sodium-platform agrosocial minelink; do
  echo "--- $t ---"
  curl -s "https://api.getsodium.com/readyz?tenant=$t" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'  Status: {d[\"status\"]}, Version: {d[\"version\"]}')" 2>/dev/null || echo "  FAILED"
done
```

---

## What CI does (in order)

1. Promotes images GHCR → GCP Artifact Registry via `crane copy` (usually a fast no-op — `Promote Release` already pre-copied them)
2. pgroll: completes the PREVIOUS release's pending migration (lagged contract), then expands this release's migrations (all tenants)
3. Deploys infra-worker + backend via Pulumi (parallel). Backend uses a **no-traffic canary**: the new revision is staged at 0% with a `candidate` tag while prod traffic stays pinned to the current revision
4. **Health gate (pre-cutover):** polls the candidate's tagged URL (`https://candidate---sodium-backend-*.run.app/readyz`) up to 3 min — if unhealthy the deploy FAILS with prod traffic untouched; only after it passes does a second traffic-only Pulumi update flip 100% to the new revision (then a quick public re-verify). `--no-canary` restores single-phase
4b. **Candidate warm-up (pre-flip):** after the health gate passes, ~30 best-effort requests over ~20s hit the candidate's tagged URL (`/readyz`, `/readyz?tenant=sodium-platform`, `/trpc/appConfig.getAppConfig`) so instances are warm before taking traffic. Never blocks the deploy.
4c. **Observability gate (post-flip):** ignores the first 60s (cold-start exclusion), then watches Cloud Monitoring for 3 min (defaults): FAIL if the new revision's 5xx rate > max(2× previous-revision baseline, 2%) — immediate — or p95 > min(max(2× baseline, 2s), **10s ceiling**) **on 2 consecutive polls** (single-poll p95 spikes never roll back; missing latency data is never a breach; the ceiling stops a baseline polluted by long-lived streaming/SSE requests from silently disabling the latency check — loud log when clamped), each requiring ≥ 20 requests (low traffic = pass with a note). On FAIL the deploy **automatically pins 100% of traffic back to the previous revision** (same machinery as `--rollback-traffic`), verifies the public `/readyz` reports the previous version again, then fails the workflow. If even the pin fails, the log prints exact manual-remediation commands. Metric-read errors only warn — they never roll back a healthy deploy.
5. Leaves this release's migration ACTIVE (contract deferred to next deploy — preserves the rollback window). `contract_now` input overrides.
6. Deploys frontend to Vercel from the prebuilt release artifact (`--prebuilt`, ~10s)
7. Commits Pulumi state back to git

Deploys to the same environment are serialized via a GitHub Actions concurrency group (`deploy-prod`), shared with the rollback workflow — a queued deploy waits, it is not cancelled.

## Troubleshooting

### Rollback to previous version

**Instant traffic flip (fastest):** previous Cloud Run revisions stay deployed after a canary rollout — rollback is just a traffic-only Pulumi update, no rebuild:

```bash
sodium deploy --env prod --release <currently-deployed-version> --rollback-traffic <previous-revision-name>
```

(The previous serving revision name is printed at the end of every canary deploy; or list with `gcloud run revisions list`.)

**Full version rollback (images + manifest):**

```bash
sodium deploy:prod 2026.03.XX --skip-pgroll
```

Backend rollback is safe as long as the current release's migration hasn't been contracted — with the lagged-contract default, that window stays open until the NEXT deploy (or until someone runs `--contract-now` / `sodium migrations:complete`). Check pending state with `sodium migrations:status --env prod`.

### Cloud Run revision fails startup

```bash
gcloud run revisions list --service=sodium-backend --project=sodium-shared-platform --region=europe-west1 --limit=2
gcloud logging read 'resource.labels.revision_name="<REVISION>" AND severity>=ERROR' --limit=10 --project=sodium-shared-platform
```

## Quick Reference

| Action | Command |
|--------|---------|
| Deploy latest | `sodium deploy:prod` |
| Deploy specific | `sodium deploy:prod 2026.03.XX` |
| Skip migrations | `sodium deploy:prod 2026.03.XX --skip-pgroll` |
| Health check | `curl -s "https://api.getsodium.com/readyz?tenant=sodium-platform"` |
| Prod logs | `gcloud logging read 'resource.labels.service_name="sodium-backend" AND severity>=ERROR' --limit=10 --freshness=10m --project=sodium-shared-platform` |
