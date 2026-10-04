# Versioned GitHub Pages

The repository Pages site serves two independent versions:

- `/newwork/` redirects to `/newwork/v2/`, preserving query strings and fragments.
- `/newwork/v1/` serves the frozen version previously live at `/newwork/`.
- `/newwork/v2/` serves the active Astro app in `new-work-site/`.

Each version owns its own HTML, scripts, styles, fonts, and local media. Nothing
in V2 imports files from V1. Existing external CDN/embedded-film URLs in V1 are
preserved. V2 also namespaces browser storage by its base path so preferences
and gallery navigation state cannot collide with V1.

## Build and preview

From the repository root, after installing `new-work-site` dependencies:

```sh
node hosting/build.mjs
node hosting/verify.mjs
node hosting/serve.mjs
```

Open `http://127.0.0.1:4326/newwork/`. The regular Project Studio preview remains
at `http://127.0.0.1:4325/` and continues to use the active checkout directly.
The generated `pages-dist/` directory is ignored by Git and uploaded as the
single Pages artifact. It contains `v1/`, `v2/`, a root redirect, a 404 page, and
small compatibility redirects from existing unversioned V1 page URLs.

`hosting/config.json` controls the default version and whether V1 is included.
`PAGES_SITE_URL` and `PAGES_BASE_PATH` can override the host and repository path.
The deployment workflow derives those from the GitHub repository.

V2 deliberately uses `prototype` content mode to publish exactly the local
version under review, including its 20 gallery tiles. It retains `noindex` and
does not query Sanity. Switching to approved CMS content is a separate decision:
change `v2ContentMode` to `production`, then run the Sanity audit and production
content checks before publishing. This build does not mutate Sanity.

## Frozen V1

`versions/v1/manifest.json` identifies the successful live deployment, capture
time, and SHA-256 of every original file. `snapshot/` is immutable archival
input, not the deployment output. The build verifies every checksum, copies it
to `pages-dist/v1/`, and rewrites its original base URL in that generated copy.
Do not edit or regenerate the snapshot as part of normal development.

The original GitHub Actions artifact was no longer available, so the snapshot
was captured from the public site. Dynamically addressed public assets were
copied from the exact deployed Git commit, independent of the V2 working tree.
`capture-v1.mjs` documents that one-time operation; deployment never runs it or
exports CMS records. It refuses to overwrite a completed archive.

## Remove V1 later

1. Set `includeV1` to `false` in `hosting/config.json`.
2. Delete `versions/v1/` and, if no longer needed, `hosting/capture-v1.mjs`.
3. Build and verify again, then publish the reviewed change.

The clean build automatically removes V1 and its legacy URL redirects from
the artifact. V2 source, media, links, and build commands require no changes.

## Publish

The GitHub Actions workflow validates the app, builds the combined artifact,
checks isolation and browser navigation on the actual versioned paths, and
uploads `pages-dist/`. Only a subsequent explicit push or manual deployment
publishes it. Preparing or previewing these files does not alter the live site.
