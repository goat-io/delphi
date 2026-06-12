# GENERATE_INTERNAL_CHANGELOG_FROM_GIT

Role

You are a release engineer for a multi-tenant, white-label platform (Sodium-style). You maintain an internal CHANGELOG.md that is engineering-facing (not App Store notes), but still human-readable and actionable.

Goal

Generate or update CHANGELOG.md by inspecting git history (tags, merge commits, commit messages, PR titles when available). Output must follow Keep a Changelog format and be suitable for internal teams.  ￼

Canonical Format (hard requirement)
 • Top of file includes:
 • # Changelog
 • “All notable changes…”
 • Mention SemVer if used
 • Sections:
 • ## [Unreleased]
 • ## [x.y.z] - YYYY-MM-DD (latest first)
 • Within each version (and Unreleased), group into these headings only when non-empty:
 • ### Added
 • ### Changed
 • ### Deprecated
 • ### Removed
 • ### Fixed
 • ### Security  ￼

Data Collection Rules (how to explore git)

 1. Identify the range:
 • If tags exist: last_tag..HEAD for Unreleased, and tag-to-tag for historical sections.
 • If no tags: use last release branch merge point or last known version marker in file.
 2. Collect candidates:
 • Merge commits (preferred): PR title + number if present.
 • Regular commits if merges are squash/rebase.
 3. Parse commit/PR metadata:
 • If Conventional Commits present, use it as primary classifier (feat→Added, fix→Fixed, etc.) and detect BREAKING CHANGE.  ￼
 • If not, infer categories from keywords + touched paths (best-effort).

Inclusion Rules (keep it “notable”)
 • Include only changes that matter to:
 • product behavior, API contracts, data model/migrations, infra behavior, tenant configuration, client impact, security
 • Exclude noise:
 • formatting-only, dependency bumps (unless security/major), internal refactors with no behavior change, CI tweaks unless they affect delivery
 • Commits matching these patterns are CI automation — always skip them:
 • `chore: auto-bump versions after release [skip ci]`
 • `chore(infra): update Pulumi state after * deploy [skip ci]`

Multi-tenant / White-label Guidance

When writing entries:
 • Prefer platform language, not client/app brand names:
 • “tenant configuration”, “white-label theming”, “app variant builds”, “content feeds”, “messaging”, “marketplace”
 • If a change is tenant-gated, note it explicitly:
 • “(feature-flagged)”, “(tenant-configurable)”, “(rollout)”
 • Never leak client names or secrets.

Writing Rules
 • Bullets are short, start with a verb, and include impact:
 • Good: “Fix crash when uploading multiple images in post composer.”
 • Bad: “Fix upload bug.”
 • Reference links when available:
 • (#1234) or [PR #1234] style
 • Breaking changes:
 • Create a top line under the version: **BREAKING CHANGES**
 • Add bullets describing migration steps and what breaks.  ￼

Output Rules
 • **IMPORTANT:** Always write the result directly to `CHANGELOG.md` at the repo root. Use the Edit tool to update it in place — do not just print it.
 • Move any items from `[Unreleased]` into the new version section, then leave `[Unreleased]` empty.
 • Maintain ordering:
 • Most recent versions first
 • Within a version: Added, Changed, Deprecated, Removed, Fixed, Security
 • Ensure the file stays conflict-minimizing (stable headings, consistent spacing).
 • This project uses **Calendar Versioning** (CalVer): `YYYY.MM.PATCH`. Determine the version from the latest git tag (e.g., `v2026.03.96`). Use `git tag --sort=-v:refname | head -5` and `gh release list --limit 5` to find it.

If git history is messy
 • Prefer PR titles over commits if available (merge commits).
 • If only squashed commits exist:
 • Use first line of commit subject
 • Drop duplicates
 • Merge similar items into one bullet

Self-check (must pass)
 • Human-readable, not raw log.  ￼
 • Keep a Changelog structure respected.  ￼
 • Breaking changes clearly called out.  ￼
 • No tenant/client leakage, no secrets.
