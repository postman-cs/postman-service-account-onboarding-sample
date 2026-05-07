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
3. **Mint** — `POST https://api.getpostman-beta.com/service-account-tokens` with body `{"apiKey":"<PMAK>"}`, read `.access_token`. The mint response no longer carries team id, so the workflow resolves it from `GET https://api.getpostman-beta.com/me` (tries `user.teamId`, `team.id`, `identity.team`, etc.; falls back to legacy `session.token` / `session.identity.team` shapes).
4. **Onboarding action** — `postman-api-key`, minted `postman-access-token`, `postman-team-id`.  
   **`generate-ci-workflow` is off** so repo-sync does not emit a workflow that reinstalls **prod** CLI from `dl-cli.pstmn.io` (prod-first generated CI is called out in the runbook).

Bootstrap only curls prod when **`postman` is missing from PATH**; we install beta first so login uses the beta artifact.

---

## Production Postman API vs beta (no bootstrap changes)

**[postman-bootstrap-action](https://github.com/postman-cs/postman-bootstrap-action)** and **repo-sync** call **`https://api.getpostman.com`** for workspaces, specs, collections, etc. That is how the published actions work today—you do **not** need to fork them or add beta-specific code paths.

A PMAK that only exists on **beta** (`api.getpostman-beta.com`) is **not** accepted on **prod**, so you see **`GET .../workspaces` → 401 Invalid API Key** if `postman-api-key` is beta-only.

**Practical setup (two keys):**

| Secret | Role |
| --- | --- |
| **`POSTMAN_BETA_API_KEY`** (optional) | Beta service-account PMAK used **only** for `service-account-tokens` and `GET /me` on `api.getpostman-beta.com`. |
| **`POSTMAN_API_KEY`** | PMAK that is valid on **production** `https://api.getpostman.com` — passed to the onboarding action as `postman-api-key` (bootstrap + repo-sync). |

If **`POSTMAN_BETA_API_KEY`** is omitted, the mint step falls back to **`POSTMAN_API_KEY`** (works only when that single key is valid on **both** beta and prod, which is uncommon).

Confirm with your team that a **beta-minted** `postman-access-token` is intended to pair with **prod** API calls for your test scenario; if everything must stay on beta end-to-end, that requires a **platform change** in the actions (outside this sample).

---

## Secrets

| Secret | Purpose |
| --- | --- |
| **`POSTMAN_API_KEY`** | PMAK for **production** Postman API (`postman-api-key` in onboarding). |
| **`POSTMAN_BETA_API_KEY`** | Optional. Beta PMAK for mint + beta `/me` only. |

No PAT is required to clone `postman-eng/postman-cli` anymore — we use the public beta installer URL on the self-hosted runner.

---

## OpenAPI `spec-url`

**postman-bootstrap-action** loads the spec with a strict HTTPS client: **no username/password in the URL** (embedded tokens trigger `CONTRACT_SPEC_FETCH_BLOCKED`), and it **does not** attach a GitHub `Authorization` header. So **`spec-url` must be anonymously fetchable over HTTPS**.

| Repository | What to do |
| --- | --- |
| **Public** | Default is fine: `https://raw.githubusercontent.com/<owner>/<repo>/<sha>/openapi.yaml` (this workflow uses your commit SHA). |
| **Private** | Set repository variable **`POSTMAN_ONBOARDING_SPEC_URL`** to a **public** HTTPS URL that serves the same `openapi.yaml` (for example a public mirror repo, a raw gist URL, or an internal CDN). The workflow verifies that URL returns HTTP 200 before calling onboarding. |

Making this sample repository **public** is the lowest-friction option if policy allows.

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
