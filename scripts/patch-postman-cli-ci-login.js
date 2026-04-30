#!/usr/bin/env node
/**
 * Applies a small CI-only patch to postman-eng/postman-cli lib/login/index.js.
 *
 * When POSTMAN_SERVICE_ACCOUNT_SESSION_TOKEN is set, `postman login --with-api-key`
 * stores both the API key and the minted session token (skips /me validation).
 *
 * Usage: node scripts/patch-postman-cli-ci-login.js <path-to-postman-cli-repo-root>
 */
const fs = require('fs');
const path = require('path');

const root = process.argv[2];
if (!root) {
  console.error('Usage: patch-postman-cli-ci-login.js <postman-cli-root>');
  process.exit(1);
}

const file = path.join(root, 'lib/login/index.js');
let s = fs.readFileSync(file, 'utf8');

const marker =
  '        };\n\n    alias = options.alias || DEFAULT;\n\n    if (options.withApiKey !== undefined) {\n        waterfall([';

if (s.includes('loginWithApiKeyAndServiceSessionToken')) {
  console.log('Already patched, skipping.');
  process.exit(0);
}

if (!s.includes(marker)) {
  console.error(
    'patch-postman-cli-ci-login: expected marker not found; lib/login/index.js layout may have changed.'
  );
  process.exit(1);
}

const helper = `        };

    const loginWithApiKeyAndServiceSessionToken = (accessToken, cb) => {
        waterfall([
            rcfile.load,
            (data, next) => {
                if (!V1_API_KEY_REGEX.test(options.postmanApiKey) &&
                    !V2_API_KEY_REGEX.test(options.postmanApiKey)) {
                    return next(new Error(INVALID_API_KEY));
                }

                options.alias = options.alias || DEFAULT;
                const region = targetRegion,
                    iapubBaseUrl = util.POSTMAN_IAPUB_BASE_URL(region),
                    requestFactory = require('@postman/platform-req/lib/request'),
                    client = requestFactory.defaults({ json: true, timeout: 10000 });

                client.get({
                    url: \`\${iapubBaseUrl}/api/sessions/current\`,
                    headers: { 'x-access-token': accessToken, 'User-Agent': util.userAgent }
                }, (err, response) => {
                    let userId,
                        username = 'service_account';

                    if (!err && response && response.statusCode === 200 &&
                        response.body && response.body.session && response.body.session.identity) {
                        userId = response.body.session.identity.user;
                    }

                    regionUtil.setCurrentRegionForProcess(region);

                    const merged = data || {};

                    !merged.login && (merged.login = {});
                    !merged.login._profiles && (merged.login._profiles = []);
                    if (_.has(merged, 'login._profiles')) {
                        merged.login._profiles = _.reject(merged.login._profiles, [ALIAS, options.alias]);
                    }

                    merged.login._profiles.push({
                        [ALIAS]: options.alias,
                        [POSTMAN_API_KEY]: options.postmanApiKey,
                        accessToken: accessToken,
                        [REGION]: region,
                        username: username,
                        userId: userId
                    });

                    return rcfile.store(merged, next);
                });
            }
        ], cb);
    };

    alias = options.alias || DEFAULT;

    if (options.withApiKey !== undefined) {
        const serviceSessionToken = process.env.POSTMAN_SERVICE_ACCOUNT_SESSION_TOKEN;
        if (serviceSessionToken && serviceSessionToken.trim()) {
            options.postmanApiKey = options.withApiKey.trim();
            return loginWithApiKeyAndServiceSessionToken(serviceSessionToken.trim(), callback);
        }
        waterfall([`;

s = s.replace(marker, helper);

fs.writeFileSync(file, s);
console.log('Patched', file);
