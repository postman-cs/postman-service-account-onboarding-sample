# Postman service-account onboarding sample

This repository demonstrates **fully automated GitHub Actions onboarding** for Postman: you mint a **short-lived access token** from a **service account API key** in CI, then pass that token into the official onboarding composite action so **Bifrost-backed steps work without manual browser or CLI login**.

Previously, teams often copied a long-lived access token from the Postman CLI after interactive authentication. The flow here replaces that with a single repository secret (`POSTMAN_API_KEY`) and a small HTTP call at the start of each workflow run.

## What we want to achieve

- **One secret to manage in GitHub** — store the Postman **API key** for your service account; do **not** rely on manually rotating and pasting an access token into `POSTMAN_ACCESS_TOKEN`.
- **Fresh tokens per run** — call the service-account token endpoint to obtain `.session.token`, mask it in logs, and pass it to onboarding as `postman-access-token`.
- **Repeatable onboarding** — combine that token with [postman-api-onboarding-action](https://github.com/postman-cs/postman-api-onboarding-action) so bootstrap, repo sync, and related automation stay consistent across environments.

## How it works

1. **Mint token** — `POST` to `https://api.getpostman-beta.com/service-account-tokens` with header `x-api-key: <POSTMAN_API_KEY>` (JSON body `{}`). The response includes `session.token` and team id under `session.identity.team` (with a fallback to top-level `identity.team` if present); the workflow passes those to `postman-access-token` and `postman-team-id`.
2. **Install Postman CLI (Rust)** — before onboarding, the workflow downloads the [`postman-cli-rust`](https://github.com/postman-cs/postman-cli-rust) Linux binary from GitHub Releases and installs it as `/usr/local/bin/postman`. [postman-bootstrap-action](https://github.com/postman-cs/postman-bootstrap-action) skips the official installer when `postman` is already on `PATH`. Unlike the mainline CLI, `login --with-api-key` here does not call production identity servers (it validates key shape and stores the profile), which avoids “invalid API key” for keys that only exist on the beta API plane.
3. **Onboard** — the workflow runs [postman-cs/postman-api-onboarding-action](https://github.com/postman-cs/postman-api-onboarding-action) with:
   - `postman-api-key` → same API key (bootstrap and sync operations).
   - `postman-access-token` → the minted session token (Bifrost / governance integration paths that expect an access token).
   - `postman-team-id` → `session.identity.team` from the mint response (for Bifrost / org headers where required).

The OpenAPI document in this repo (`openapi.yaml`) is a minimal dummy API used as the spec source for the onboarding run.

## Repository layout

| Path | Purpose |
| --- | --- |
| `openapi.yaml` | Sample OpenAPI 3 spec uploaded / synced by the action |
| `.github/workflows/postman-onboarding.yml` | Mints the token and invokes the onboarding action |

## Setup

1. Fork or clone this repo under an account where Actions can run.
2. In the repo on GitHub: **Settings → Secrets and variables → Actions**, add:
   - **`POSTMAN_API_KEY`** (required) — service account key for mint + onboarding APIs.
   - **`POSTMAN_CLI_RUST_GITHUB_TOKEN`** (required for this workflow) — a classic PAT or fine-grained token that can **read** repository contents/releases for the private **`postman-cs/postman-cli-rust`** repo. The default **`GITHUB_TOKEN`** for this repo cannot download assets from another private repo.
3. Trigger **Actions → Postman API onboarding** (manual run) or push to `main`.

### Spec URL and repository visibility

The workflow sets `spec-url` to a **raw GitHub URL** for the commit being built (`raw.githubusercontent.com/.../<sha>/openapi.yaml`). Postman must be able to **fetch that URL** (typically a **public** repository). If the repo is private, host the spec somewhere Postman can reach and point `spec-url` there instead.

### Rust CLI vs mainline (beta keys)

Mainline Postman CLI authenticates API keys against **production**. Beta-only keys fail `postman login` there. The Rust fork sidesteps that for **login** by storing the key after local format checks.

**Caveat:** Mainline `postman spec lint` accepts a **spec id or file path**; the Rust parity build currently lints **local files** only. Bootstrap runs `postman spec lint <specUid> ...`. If your run fails at that step, you need Rust CLI support for lint-by-id (or a bootstrap change), not just this workflow.

## Customization

- Change **`project-name`** in the workflow if `sample-pet-store-github-demo` collides with an existing Postman project.
- Set **`org-mode`** to `'true'` when your Postman team uses org-mode and the action docs indicate it for your setup.
- Set **`generate-ci-workflow`** to `'true'` if you want the onboarding action to emit an additional CI workflow file into the repository.

## References

- [postman-api-onboarding-action](https://github.com/postman-cs/postman-api-onboarding-action)
- [postman-cli-rust](https://github.com/postman-cs/postman-cli-rust) (internal)
- Postman service-account tokens (mint): `POST https://api.getpostman-beta.com/service-account-tokens` with `x-api-key`
