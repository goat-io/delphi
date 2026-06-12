# Deploy Command

Make sure everything in the repo is committed, that typechecks and unit tests pass. Commit and fix even the files you have not modified.
Check in great detail the pg-roll migrations that have been created after the last release, and make sure that they will be appliyed during the CI without disruptions and with Zero Downtime Deployments

Use `/release` for the full pipeline (CI build → promote → CI deploy).

Use `/deploy-prod` if you already have a promoted release and just need to deploy it.

## Commands

```bash
# Full pipeline (release + promote + deploy)
sodium release:prod     # CI build → CI promote (all via GitHub Actions)
sodium deploy:prod      # deploy latest promoted release

# Individual steps (when you need control)
sodium release:promote              # promote latest RC to final
sodium release:promote v2026.03.XX-rc  # promote specific RC
sodium deploy:prod 2026.03.XX      # deploy specific version
```

There is **no DEV environment** — deploy directly to production. Never use raw Pulumi/gcloud commands. Never run `sodium deploy` locally — always use CI via `sodium deploy:prod`.

Pipeline safety (automatic): prod deploys are serialized via a concurrency group, the deploy health-gates on `/readyz` after Pulumi (fails if the backend doesn't come up), and pgroll contract is lagged one release so backend rollback stays possible until the next deploy (`contract_now` input to finalize immediately). Details: `.planning/docs/patterns/deployment.md`.

## Post-deploy

After a successful deploy, run these tasks:

1. **Internal changelog** — run `/update-changelog` (writes to `CHANGELOG.md`)
2. **App store release notes** — run `/write-release-notes` (writes to `release_notes/v{version}.md`)
3. **Tag Linear issues** — For each commit in this release, extract GOA ticket numbers from commit messages. Use Linear MCP tools to:
   - Add a comment on each issue: `Released in v{version}`
   - Move issues in "In Review" or "Done" status to "Released"
   - Find tickets with: `git log v{previous_version}..v{current_version} --oneline | grep -oP 'GOA-\d+'`
4. **Commit and push** all generated files (CHANGELOG.md, release notes)
