# New Work website

The sole website app in the `NewWork` project. Edit this folder on `main`.
Use Node 22.12+ and `pnpm install --frozen-lockfile` for a fresh installation.

```sh
npm run dev                 # http://127.0.0.1:4327/
npm run typecheck
npm run lint
npm test
npm run build
npm run verify:dist
```

Development uses prototype content and noindex. Stop it before starting
`npm run dev:cms` to read published Sanity content at the same address.
Do not seed or sync production content as part of design work.
Project Studio’s **New Work** card launches this app.

## Browser and release checks

```sh
npm run test:e2e:chromium
npm run test:e2e:visual
node ../hosting/root-release.mjs --production --review
node ../hosting/verify-root-release.mjs --production --review
PAGES_REVIEW=1 ./node_modules/.bin/playwright test --config=playwright.pages.config.ts
```

Use `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_PORT=4327` to reuse the current
local server. Do not build or edit source while browser tests are running;
HMR would invalidate transition measurements.

See [feedback and QA](../reviews/oliver-2026-10/README.md),
[deployment instructions](../DEPLOYMENT.md) and
[future domain cutover](../hosting/ROOT_RELEASE.md).
Earlier implementations are available in Git history, not separate app folders.
