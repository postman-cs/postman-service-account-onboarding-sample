# Postman service-account onboarding sample

This repository demonstrates **fully automated GitHub Actions onboarding** for Postman: you mint a **short-lived access token** from a **service account API key** in CI, then pass that token into the official onboarding composite action so **Bifrost-backed steps work without manual browser or CLI login**.

Previously, teams often copied a long-lived access token from the Postman CLI after interactive authentication. The flow here replaces that with a single repository secret (`POSTMAN_API_KEY`) and a small HTTP call at the start of each workflow run.

## What we want to achieve

- **One secret to manage in GitHub** — store the Postman **API key** for your service account; do **not** rely on manually rotating and pasting an access token into `POSTMAN_ACCESS_TOKEN`.
- **Fresh tokens per run** — call the service-account token endpoint to obtain `.session.token`, mask it in logs, and pass it to onboarding as `postman-access-token`.
- **Repeatable onboarding** — combine that token with [postman-api-onboarding-action](https://github.com/postman-cs/postman-api-onboarding-action) so bootstrap, repo sync, and related automation stay consistent across environments.

## How it works

1. **Mint token** — `POST` to `https://api.getpostman-beta.com/service-account-tokens` with header `x-api-key: <POSTMAN_API_KEY>` (empty JSON body). The response includes `session.token`.
2. **Onboard** — the workflow runs [postman-cs/postman-api-onboarding-action](https://github.com/postman-cs/postman-api-onboarding-action) with:
   - `postman-api-key` → same API key (bootstrap and sync operations).
   - `postman-access-token` → the minted session token (Bifrost / governance integration paths that expect an access token).

The OpenAPI document in this repo (`openapi.yaml`) is a minimal dummy API used as the spec source for the onboarding run.

## Repository layout

| Path | Purpose |
| --- | --- |
| `openapi.yaml` | Sample OpenAPI 3 spec uploaded / synced by the action |
| `.github/workflows/postman-onboarding.yml` | Mints the token and invokes the onboarding action |

## Setup

1. Fork or clone this repo under an account where Actions can run.
2. In the repo on GitHub: **Settings → Secrets and variables → Actions**, add:
   - **`POSTMAN_API_KEY`** (required) — API key for the Postman service account that is allowed to call the mint endpoint and onboarding APIs.
   - **`POSTMAN_TEAM_ID`** (optional) — use when your team needs an explicit team id for Bifrost; align with `org-mode` in the workflow if your org requires it.
3. Trigger **Actions → Postman API onboarding** (manual run) or push to `main`.

### Spec URL and repository visibility

The workflow sets `spec-url` to a **raw GitHub URL** for the commit being built (`raw.githubusercontent.com/.../<sha>/openapi.yaml`). Postman must be able to **fetch that URL** (typically a **public** repository). If the repo is private, host the spec somewhere Postman can reach and point `spec-url` there instead.

## Customization

- Change **`project-name`** in the workflow if `sample-pet-store-github-demo` collides with an existing Postman project.
- Set **`org-mode`** to `'true'` when your Postman team uses org-mode and the action docs indicate it for your setup.
- Set **`generate-ci-workflow`** to `'true'` if you want the onboarding action to emit an additional CI workflow file into the repository.

## References

- [postman-api-onboarding-action](https://github.com/postman-cs/postman-api-onboarding-action)
- Postman service-account tokens (mint): `POST https://api.getpostman-beta.com/service-account-tokens` with `x-api-key`
