# ADR 008: OIDC Trusted Publishing for npm Releases

## Status

Accepted

## Context

The `archimate-mcp-server` package is published to npm via a GitHub Actions workflow (`.github/workflows/publish.yml`) that runs on every `v*` tag push. Until 2026-05-05 the workflow authenticated to npm with a long-lived classic `NPM_TOKEN` stored as a repo secret.

On 2026-05-05 the 0.3.0 release failed at the publish step with `E404 Not Found - PUT https://registry.npmjs.org/archimate-mcp-server`. The package and its three prior versions were intact; the cause was the `NPM_TOKEN` secret having expired or been revoked roughly three months after issuance. npm returns 404 (not 401/403) for unauthenticated PUTs to mask the existence of private packages, which makes diagnosis non-obvious.

Options considered:

1. **Rotate `NPM_TOKEN`** — issue a new automation/granular token on npmjs.com, replace the GitHub secret, and continue. Familiar, fast, but the token has a finite lifetime and the same incident recurs on the next expiry.
2. **OIDC trusted publishing** — register the GitHub repository and workflow as a Trusted Publisher on the package's npm settings page. The workflow exchanges its short-lived GitHub OIDC token for a one-shot npm publish credential at publish time. No long-lived secret exists.
3. **Manual local publishing** — drop the workflow and run `npm publish` from a maintainer machine. No secret rotation, but loses provenance signing, reproducibility, and the gating effect of CI tests.

## Decision

We chose **OIDC trusted publishing**.

Configuration:

- npm package settings → "Trusted Publisher": GitHub Actions, `thijs-hakkenberg/archimate-mcp`, workflow file `publish.yml`, no environment.
- Workflow has `permissions: id-token: write` (already required for `--provenance`).
- The `NODE_AUTH_TOKEN` env on the publish step was removed; the `NPM_TOKEN` repo secret was deleted.
- Because OIDC trusted publishing requires npm CLI ≥ 11.5.1 and the Node 20 runner ships npm 10.x, the workflow now runs `npm install -g npm@latest` after `setup-node`.

## Consequences

### Positive

- No long-lived publish credential exists. No silent expiry incident on the next release.
- Each publish exchange is short-lived and bound to the specific GitHub Actions run (workflow file, repo, ref).
- Maintainer ops surface shrinks: nothing to rotate, no secret to leak, no audit trail to manage.
- Provenance signing already in use continues to work and is now coupled to the same OIDC identity that authorizes the publish.

### Negative

- One-time setup on npmjs.com per package; no CLI for the Trusted Publisher registration.
- Publishes are tightly bound to the registered repo, workflow file path, and ref pattern. Renaming `publish.yml`, moving the repo, or switching to environment-protected runs requires updating the npm Trusted Publisher entry first or the next publish 404s.
- Requires npm ≥ 11.5.1, so the workflow must keep upgrading npm or move to a Node version whose bundled npm meets that bar.

### Operational notes

- `gh secret list` should remain free of `NPM_TOKEN`. If a publish ever fails with 404 on PUT again, the first thing to check is the npm Trusted Publisher configuration, not a token.
- npm package versions are immutable once accepted. If a tagged release fails before the publish step (build/tests), force-update the tag to a fix-forward commit; never re-tag a version that has been accepted by the registry.
