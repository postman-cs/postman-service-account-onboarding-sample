# Postman service-account onboarding (GitHub Actions sample)

This repository is a **working example** of onboarding an OpenAPI spec with **[postman-api-onboarding-action](https://github.com/postman-cs/postman-api-onboarding-action)** when you use a **beta service-account API key** and mint a **session token** from **`service-account-tokens`**.

It is aimed at teams who hit **`postman login --with-api-key` invalid key** on shipped CLI builds because login validates against the wrong plane or **`/me`** does not treat service-account keys like normal user keys.

---

## What this workflow does (end to end)

The workflow file is [`.github/workflows/postman-onboarding.yml`](.github/workflows/postman-onboarding.yml). Each run:

1. **Clones [postman-eng/postman-cli](https://github.com/postman-eng/postman-cli)** (`develop`) into `postman-cli-src/` on the runner (needs a PAT—see below).
2. **Runs [`scripts/patch-postman-cli-ci-login.js`](scripts/patch-postman-cli-ci-login.js)** on that clone only. The patch teaches `postman login --with-api-key` to accept a **minted session token** via env (`POSTMAN_SERVICE_ACCOUNT_SESSION_TOKEN`) so bootstrap does not rely on **`GET …/me`** with the API key alone.
3. **Builds** that clone with **pnpm** (`pnpm install`, `pnpm run build`) and installs `dist/bin/postman.js` as the `postman` command on `PATH`.  
   [postman-bootstrap-action](https://github.com/postman-cs/postman-bootstrap-action) sees `postman` already installed and **does not** download the public installer script.
4. Sets **`POSTMAN_CHANNEL=beta`** on the job so eng **`lib/config/cli-environment`** resolves **beta base URLs** (for example `https://api.getpostman-beta.com`) and related paths—same mechanism described internally under `lib/config/cli-environment/`.
5. **Mints** a token: `POST https://api.getpostman-beta.com/service-account-tokens` with header `x-api-key: <POSTMAN_API_KEY>`, reads **`session.token`** and **`session.identity.team`** (with fallback to top-level **`identity.team`** if present).
6. Runs **postman-api-onboarding-action** with:
   - **`postman-api-key`** / **`postman-access-token`** / **`postman-team-id`** from mint outputs  
   - **`POSTMAN_SERVICE_ACCOUNT_SESSION_TOKEN`** on the onboarding step so patched **`postman login`** can persist **API key + access token** together.

---

## Official `postman-cli` on GitHub is not modified

The patch runs **only on the ephemeral checkout inside GitHub Actions**. There is **no commit**, **no push**, and **no fork required**. When the job finishes, the runner discards the clone.

The canonical **`postman-eng/postman-cli`** repository stays exactly as your team maintains it. Long term, the same behavior belongs in a normal PR to eng CLI if product wants it supported without a CI-only patch.

---

## What you need to configure

### GitHub repository secrets

In **Settings → Secrets and variables → Actions** for this repo:

| Secret | Required | Description |
| --- | --- | --- |
| **`POSTMAN_API_KEY`** | Yes | Postman **service account** API key. Must work against **`https://api.getpostman-beta.com/service-account-tokens`** for minting. |
| **`POSTMAN_ENG_CLI_CHECKOUT_TOKEN`** | Yes | Personal access token for an account that can **read** the private **`postman-eng/postman-cli`** repo. Used only by `actions/checkout` to clone it. Typical choices: **classic PAT** with **`repo`** scope for that org, or a **fine-grained PAT** with **Contents: Read** on **`postman-eng/postman-cli`**. |

The default **`GITHUB_TOKEN`** for this repo **cannot** clone another private org repo; that is why the second secret exists.

### GitHub Actions billing

If GitHub shows a message about **failed payments** or **spending limits**, jobs will not start until **Billing & plans** is fixed for the account or organization that owns this repo.

### Optional: private npm packages (`pnpm install`)

If the **Patch and build Postman CLI** step fails while resolving **`@postman/*`** packages, your CI likely needs **internal npm registry credentials** (for example **`NODE_AUTH_TOKEN`** and an **`.npmrc`** step). That is environment-specific; wire it the same way other Postman eng repos do.

---

## OpenAPI spec URL

The workflow passes **`spec-url`** as a **`raw.githubusercontent.com`** URL for **`openapi.yaml`** at the **current commit SHA**. Postman’s servers must be able to **download that URL**, which usually means this repo is **public** or the spec is hosted somewhere reachable to Postman.

---

## Customization (common edits)

| Goal | Where to change |
| --- | --- |
| Different CLI branch or tag | `ref:` on the **Checkout Postman CLI** step in [`.github/workflows/postman-onboarding.yml`](.github/workflows/postman-onboarding.yml) |
| Different Postman project name | `project-name` input on the onboarding step |
| Org / Bifrost behavior | `org-mode`, **`POSTMAN_TEAM_ID`** via mint output (already wired) or action inputs per upstream docs |
| Generate CI workflow from onboarding | `generate-ci-workflow: 'true'` |

---

## References

- [postman-api-onboarding-action](https://github.com/postman-cs/postman-api-onboarding-action)
- [postman-eng/postman-cli](https://github.com/postman-eng/postman-cli) (internal source this workflow builds)
