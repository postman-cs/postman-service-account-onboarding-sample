# Postman service-account onboarding sample

CI flow: **mint** a short-lived session from **`service-account-tokens`**, **build mainline [postman-eng/postman-cli](https://github.com/postman-eng/postman-cli)** with a tiny login patch, then run **[postman-api-onboarding-action](https://github.com/postman-cs/postman-api-onboarding-action)**.

## Why build postman-eng CLI here

Public installers ship a binary that **validates API keys against production `/me`**. Beta service-account keys can fail there even when mint works. The eng tree includes **`lib/config/cli-environment/`** and respects **`POSTMAN_CHANNEL=beta`** (beta API base URLs, `.postman-beta` config dir, etc.).

That still may not fix **service accounts** if `/me` does not accept those keys. So this repo applies **`scripts/patch-postman-cli-ci-login.js`** to eng **`lib/login/index.js`**: when **`POSTMAN_SERVICE_ACCOUNT_SESSION_TOKEN`** is set, **`postman login --with-api-key`** skips `/me` validation, resolves **`userId`** via **`iapub …/api/sessions/current`** using the minted token, and stores **both** `postmanApiKey` and `accessToken` in the CLI profile.

## How it works

1. Check out **`postman-eng/postman-cli`** (`develop`) next to this repo.
2. Run the patch script, **`pnpm install`**, **`pnpm run build`**, install **`dist/bin/postman.js`** as **`postman`** on `PATH`.
3. Mint with **`POST https://api.getpostman-beta.com/service-account-tokens`** and capture **`session.token`** + **`session.identity.team`** (fallback: **`.identity.team`**).
4. Run onboarding with **`POSTMAN_CHANNEL=beta`**, **`POSTMAN_SERVICE_ACCOUNT_SESSION_TOKEN`** = minted token, and the usual **`postman-api-key`** / **`postman-access-token`** inputs.

## Setup (GitHub Actions secrets)

| Secret | Purpose |
| --- | --- |
| **`POSTMAN_API_KEY`** | Service account API key (mint + APIs). |
| **`POSTMAN_ENG_CLI_CHECKOUT_TOKEN`** | PAT (or fine-grained token) with **`contents: read`** on **`postman-eng/postman-cli`** so Actions can check out the private repo. |

If **`pnpm install`** fails on **`@postman/*`** packages, you may need **npm registry auth** for Postman’s registry (add **`NODE_AUTH_TOKEN`** / **`.npmrc`** per internal docs).

## Spec URL

`spec-url` uses **`raw.githubusercontent.com`** for the commit SHA; Postman must be able to fetch it (usually a **public** repo).

## Customization

- Bump **`ref:`** on the **`postman-eng/postman-cli`** checkout if you need another branch.
- Adjust **`project-name`**, **`org-mode`**, **`generate-ci-workflow`** on the onboarding step as needed.

## References

- [postman-api-onboarding-action](https://github.com/postman-cs/postman-api-onboarding-action)
- [postman-eng/postman-cli](https://github.com/postman-eng/postman-cli) (internal)
