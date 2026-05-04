# Service-account beta onboarding (sample)

Sample repo for **[postman-api-onboarding-action](https://github.com/postman-cs/postman-api-onboarding-action)** with a **beta** service-account key: mint **`service-account-tokens`**, pass **`postman-access-token`** + team id, and rely on the **beta-baked Postman CLI** for bootstrap `postman login`.

Internal runbook context (Access, installers, prod vs beta artifacts): see **Service-Account Beta: CSE Testing Runbook** (Jared Boynton) in your internal docs.

---

## Runner: must be inside Postman Access

`api.getpostman-beta.com`, `dl-cli.pstmn-beta.io`, and related beta hosts sit behind **Cloudflare Access**. **GitHub-hosted `ubuntu-latest` cannot reach them** (you get an HTML SSO interstitial, not JSON — easy to misread as “invalid API key”).

Use a **self-hosted Actions runner** on a **Warp-enrolled Postman machine** (or another path inside Access). Register it on this repo and give it labels **`self-hosted`** and **`postman-service-account-beta`** (or change [`runs-on`](.github/workflows/postman-onboarding.yml) to match the labels you chose).

First step in the workflow probes `GET https://api.getpostman-beta.com/me` and fails fast if the body looks like a Cloudflare login page.

---

## What the workflow does

1. **Access probe** — sanity-check you are not outside the perimeter.
2. **Install CLI** — `curl -fsSL https://dl-cli.pstmn-beta.io/install/unix.sh | sh`  
   Beta installers ship a binary with **channel baked at build time**; you do **not** rely on `POSTMAN_CHANNEL` at runtime (that only applies to an unbundled **source** `pnpm run build` / `node dist/bin/postman.js` flow).
3. **Mint** — `POST https://api.getpostman-beta.com/service-account-tokens` with `x-api-key`, read `session.token` and `session.identity.team` (fallback: top-level `identity.team`).
4. **Onboarding action** — `postman-api-key`, minted `postman-access-token`, `postman-team-id`.  
   **`generate-ci-workflow` is off** so repo-sync does not emit a workflow that reinstalls **prod** CLI from `dl-cli.pstmn.io` (prod-first generated CI is called out in the runbook).

Bootstrap only curls prod when **`postman` is missing from PATH**; we install beta first so login uses the beta artifact.

---

## Secrets

| Secret | Purpose |
| --- | --- |
| **`POSTMAN_API_KEY`** | Service-account PMAK; mint + APIs + `postman login --with-api-key`. |

No PAT is required to clone `postman-eng/postman-cli` anymore — we use the public beta installer URL on the self-hosted runner.

---

## OpenAPI `spec-url`

Uses `raw.githubusercontent.com` for `openapi.yaml` at the workflow commit. Postman must fetch that URL (usually a **public** repo).

---

## Customization

| Change | Where |
| --- | --- |
| Runner labels | `runs-on` in [`.github/workflows/postman-onboarding.yml`](.github/workflows/postman-onboarding.yml) |
| CLI branch / unreleased develop | Runbook **source build** path locally; this workflow tracks the **published beta dl-cli** artifact |
| `project-name`, org mode, generated CI | Inputs on the onboarding step |

---

## References

- [postman-api-onboarding-action](https://github.com/postman-cs/postman-api-onboarding-action)
- [postman-eng/postman-cli](https://github.com/postman-eng/postman-cli) — `develop`, beta installer host `dl-cli.pstmn-beta.io`
