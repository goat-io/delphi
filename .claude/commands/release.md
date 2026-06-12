# Release Command

Full release pipeline: CI build → promote → ready to deploy.

**All builds run in CI — never build Docker images locally.**

> **Continuous deployment is ON:** merging deployable changes to `main` automatically runs the full gated release, auto-promotes, and auto-deploys to prod (docs/meta-only pushes are filtered via `paths-ignore` in `ci-release.yml`). The manual flow below is still needed for specific versions, re-releases, and rollbacks — or whenever the repo variable `AUTO_DEPLOY=off` disables CD.

## What you need to do

### Step 1: Commit and push everything

Make sure all changes are committed and pushed to main. Run typecheck and tests first. Fix failures even in files you didn't change.

```bash
pnpm typecheck && pnpm --filter=@sodium/backend test:unit
git add -A && git commit -m "..." && git push origin main
```

### Step 2: Run the release pipeline

```bash
sodium release:prod
```

This triggers the full CI pipeline:
1. Triggers `Create Release (RC)` GitHub Action — three jobs:
   - `release`: uncached typecheck → **unit tests** (blocks release) → migration validation → Docker builds → **container boot smoke test** (real images polled on `/health`) → **built-image HTTP tests** (freshly built backend image boots against Postgres+Redis sidecars, the image's own pgroll migrations provision the schema, then real HTTP flows run: health/readiness, public tRPC, 401/404 error envelopes, OTP sign-in → authenticated `user.me`; `--skip-image-tests` to bypass; retagged images skip it — their content already passed when first built) — both gates run BEFORE the GHCR push → creates the RC as a **draft**
   - `full-tests` (parallel): backend `test:functional` + `test:integration` against real testcontainers (Postgres, Redis, Typesense, Centrifugo)
   - `finalize`: publishes the draft RC only when BOTH jobs are green
2. Waits for completion (~10-15 min; faster when the frontend is unchanged — see below)
3. Triggers `Promote Release` GitHub Action (promotes RC to final release AND pre-copies the images GHCR → GCP Artifact Registry via `crane copy`, so the later deploy skips that work)
4. Waits for completion (~2-4 min)

**A draft RC = tests failed or still running.** `sodium release --promote` refuses drafts — a red suite can never reach production. If a release fails at unit tests, smoke test, built-image HTTP tests, or full-tests, fix the cause and re-run; never bypass.

**Frontend build skip:** if nothing changed under `apps/frontend/`, `packages/`, `pnpm-lock.yaml`, or `pnpm-workspace.yaml` since the previous release tag (version-bump-only commits don't count), the release reuses the previous frontend artifact and logs `Frontend unchanged since vX.Y.Z — reusing artifact`. The manifest records `frontend.reusedFromVersion`. Force a rebuild with `--force-build`.

When it finishes, it prints the version and deploy command.

### Step 3: Deploy

```bash
sodium deploy:prod
```

Or with a specific version:
```bash
sodium deploy:prod 2026.03.XX
```

### Step 4: Verify production

The deploy itself now health-gates on `/readyz` (3-min poll after Pulumi; the workflow fails if the backend never becomes healthy). Still verify per-tenant:

```bash
curl -s "https://api.getsodium.com/readyz?tenant=sodium-platform" | python3 -m json.tool
```

### Step 5: Post-deploy tasks

After a successful deploy, run these three tasks:

1. **Update changelog** — run `/update-changelog` to update `CHANGELOG.md`
2. **Write release notes** — run `/write-release-notes` to generate app store release notes
3. **Tag Linear issues** — For each commit included in this release, extract the GOA ticket number (e.g., `GOA-295` from commit messages). Use the Linear MCP tools to update each issue:
   - Add a comment: `Released in v{version}`
   - If the issue status is "In Review" or "Done", move it to "Released" (or the closest completed status)
   - Add a label `released` if one exists

   To find tickets: `git log v{previous_version}..v{current_version} --oneline | grep -oP 'GOA-\d+'`

4. **Commit and push** all generated files (CHANGELOG.md, release notes)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CI release says "images already exist" | Content hash didn't change. Bump version in `apps/backend/package.json`, commit, push, re-release |
| CI deploy fails at "Promote to GCP" | Docker auth issue. Check `GCP_SA_KEY` secret exists |
| CI deploy fails at Pulumi | Permission issue on SA. Check error for missing role |
| Cloud Run revision fails startup | Code bug — check revision logs with `/debug-prod` |
| Typecheck fails on files you didn't change | Fix them anyway — other agents may have left errors |

## Quick Reference

| Action | Command |
|--------|---------|
| Full release pipeline | `sodium release:prod` |
| Deploy latest release | `sodium deploy:prod` |
| Deploy specific version | `sodium deploy:prod 2026.03.XX` |
| List releases | `gh release list --repo sodium-tech/sodium --limit 5` |
| Health check | `curl -s "https://api.getsodium.com/readyz?tenant=sodium-platform"` |
