# New Work — client review publishing

## Approved destination — 16 October 2026

Ben authorized committing and publishing the updated website, and chose the **existing review address**, https://ben-keller.github.io/newwork/. The custom domain remains on Squarespace; no DNS or email change is part of this handoff.

The website builds published Sanity content, retains `noindex` for review, and uses the revised shared wordmark, 16-tile gallery, Tall tickers, footer alignment and responsive fixes. Contact placeholders remain by instruction and are editable in Studio. Real BTS photographs remain a client content task; the empty selection uses the portfolio-derived mosaic.

## Sources and destinations

| Component | Responsibility |
|---|---|
| `new-work-site/` | Active website source |
| `studio-new-work/` | Client editor, project `7un4plyu`, dataset `production` |
| `hosting/review-release.json` | Active `/newwork` release profile, `review-release-dist/` |
| `hosting/root-release.json` | Future root-domain profile, `release-dist/` |
| `.github/workflows/deploy-site.yml` | Sole public Pages publisher |
| `.github/workflows/deploy-studio.yml` | Validated Studio and schema publisher |
| `.github/workflows/prepare-root-release.yml` | Artifact-only future-domain candidate |

Relevant pushes to `main` validate and publish the website or Studio. No workflow seeds, migrates or exports CMS documents. Studio and the frontend use the same production dataset. Generated schema and query types must be committed together.

## Automatic CMS updates

The website workflow checks published CMS revisions at minutes 7, 22, 37 and 52 of every hour. It compares a content fingerprint and source commit with the public `release-info.json`. Unchanged schedules skip the build and deployment. Edits, deletions or a changed source commit trigger the complete validation and publication pipeline. Drafts and content-release versions are excluded.

The fingerprint is captured **before** building, so a publish during a build triggers another update on the next check. Failures leave the last successful website online. Runs queue instead of cancelling an in-flight deployment. GitHub schedules may be delayed, especially during high load; do not promise immediate publishing. GitHub also disables schedules after 60 days of repository inactivity in public repositories; monitor workflow status during long periods without code updates and re-enable if needed.

No long-lived GitHub token is installed in Sanity. The previously prepared `Rebuild Oliver website` webhook (`fKWccdydRTrBVsyj`) remains disabled and is not needed for this flow. Do not copy a broad personal OAuth token into it.

Manual recovery/check:

```sh
gh workflow run deploy-site.yml -f only_if_content_changed=true
# Force a reviewed rebuild when needed:
gh workflow run deploy-site.yml
```

Match a successful run's `headSha` with the pushed commit and confirm that the live `release-info.json` contains that commit and the current content fingerprint. A green build without a successful deployment and live verification is not completion.

## Client Studio

https://new-work.sanity.studio/ uses the supplied horizontal/compact marks, a warm neutral theme, the Overview dashboard, direct editor links and plain publishing instructions. The dashboard reads real published counts and live release metadata; it reports unavailable status rather than claiming success when those requests fail.

Oliver and Michael have existing pending administrator invitations (checked 16 October). They need to accept those invitations and sign in with the invited account. Do not send duplicate invitations automatically. The [client guide](studio-new-work/CLIENT_GUIDE.md) maps the website to its editing fields.

Studio deployments use the existing repository `SANITY_AUTH_TOKEN` secret only in the deploy step. Normal content remains in Content Lake, not Git. The deployed schema is required. Local builds use the same auto-updated Sanity runtime as the hosted editor; authenticated browser checks cover the resulting bundle.

## Verification

Node 22.12+ is required. From the relevant directory:

```sh
# Studio
npm run deploy:check
npm run content:validate:ci
# Active website
npm run typecheck
npm run lint
npm run test:coverage
# Repository root
node --test hosting/hosting.test.mjs hosting/root-release.test.mjs hosting/content-fingerprint.test.mjs
node hosting/root-release.mjs --production --review
node hosting/verify-root-release.mjs --production --review
# Active website
PAGES_REVIEW=1 ./node_modules/.bin/playwright test --config=playwright.pages.config.ts --project=desktop-chromium --project=mobile-chromium --workers=1
```

The review browser suite checks base-path assets, CMS logo decoding, gallery count, project/return navigation, Contact, real 404 responses, noindex and V1/V2 redirects preserving query/fragment. Local review package: `PAGES_PREVIEW_PORT=4331 node hosting/serve.mjs --root-release --review` → http://127.0.0.1:4331/newwork/.

There is one local app on port 4327. `npm run dev` uses prototype content; stop it before running `npm run dev:cms` at the same address to read published Sanity content. Release packaging tests use a temporary static server; they do not represent another source version.

## Recovery and future domain launch

Every successful website build retains a recovery artifact for 30 days. Revert a reviewed code regression and push normally; never force-push. Restore editorial changes through Sanity history, publish, and verify the automatic rebuild. Earlier versions are recoverable from Git history and the private local consolidation archive. They are not active source directories.

The scoped October settings migration already ran; its private backup remains in `studio-new-work/.sanity/backups/`. Do not rerun migrations as part of deployment. New ordinary assets must retain generated IDs and canonical project references.

For newworkagency.com, follow [the separate cutover plan](hosting/ROOT_RELEASE.md). Change the one existing publisher, Studio website URL and content-check URL together, configure the verified custom domain and update website DNS records only. Keep mail records unchanged. The current publisher deliberately refuses to deploy its `/newwork` package if a custom domain is attached.
