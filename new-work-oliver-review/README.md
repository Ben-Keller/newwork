# Oliver review application

This is the editable October 2026 revision. Its original comparison is `../new-work-site/`; keep that source unchanged.

```sh
npm run dev                 # http://127.0.0.1:4327/
npm run typecheck
npm run lint
npm test
npm run build
npm run verify:dist
```

Use Node 22.12+ and the committed pnpm lockfile for a fresh install (`pnpm install --frozen-lockfile`). Development uses prototype content and noindex. Read-only CMS preview: `npm run dev:cms`. Do not seed or sync production content as part of design work.

Run `node ../hosting/review.mjs` for both versions plus the comparison page. Browser state is independently namespaced for this review. Source, public assets and dependencies are not symlinked to the baseline.

See [comment coverage and QA](../reviews/oliver-2026-10/README.md), [editing and promotion rules](../reviews/oliver-2026-10/EDITING.md), and [root-domain release preparation](../hosting/ROOT_RELEASE.md).

## Browser checks

```sh
npm run test:e2e:chromium
VISUAL_REGRESSION=1 npm run test:e2e:visual
node ../hosting/root-release.mjs
node ../hosting/verify-root-release.mjs
./node_modules/.bin/playwright test --config=playwright.pages.config.ts
```

Use `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_PORT=4327` to reuse the local revision preview. Do not run source builds or make edits during browser tests; HMR would invalidate transition measurements. The original UI's superseded title, footer, ticker and carousel assertions remain in the preserved baseline. This copy's review tests cover their replacements.
