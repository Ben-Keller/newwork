# New Work release packaging

Both deployment profiles build the **same `new-work-site/` source**. They differ
only in destination URL, base path and indexing. There is one Pages publisher.

## Current GitHub Pages address

```sh
node hosting/root-release.mjs --production --review
node hosting/verify-root-release.mjs --production --review
node hosting/serve.mjs --review
# http://127.0.0.1:4330/newwork/
```

This builds `review-release-dist/` for https://ben-keller.github.io/newwork/ using
published CMS content and noindex. Legacy V1/V2 bookmarks redirect into the same
current website. There are no old website snapshots in the output.

`.github/workflows/deploy-site.yml` validates and publishes this package.
Scheduled CMS checks rebuild only when published content or source has changed.
See [deployment details](../DEPLOYMENT.md).

## Future custom domain

`root-release.json` describes the destination at newworkagency.com and builds
`release-dist/` from the same source. The manual root-candidate workflow only
creates an artifact. Follow [the cutover plan](ROOT_RELEASE.md) when authorized.

## Local development

Project Studio opens **New Work** at http://127.0.0.1:4327/ from `new-work-site/`.
The old baseline, comparison page, versioned publisher and V1 snapshot were
retired on 20 October 2026. Recover previous versions from Git history or the
private consolidation archive; do not reintroduce competing launchers/publishers.
