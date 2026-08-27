# New Work — Sanity Studio

Standalone Sanity Studio for the New Work marketing site.

- Project: `7un4plyu`
- Dataset: `production`
- Frontend: `../new-work-site`

Run the Studio:

```sh
npm run dev
```

Regenerate the shared schema and query types after changing a schema or GROQ query:

```sh
npm run typegen
```

Validate and build the standalone Studio before a manual deployment:

```sh
npm run build
npm run deploy
```

Pushes to GitHub `main` deploy the schema and hosted Studio automatically through the root `deploy-studio.yml` workflow. Its `deploy:ci` command is unattended, deploys the pre-built Studio, and fails when the schema upload fails.

The local Studio reads the shared production dataset directly; content is not pulled into or merged with Git. Create a gitignored recovery snapshot and validate the current dataset with:

```sh
npm run content:snapshot
npm run content:validate
```

For CI-equivalent release checks, use `npm run schema:validate` and
`npm run content:validate:ci`. The latter reports only errors, while the normal
editorial command also reports warnings that should be reviewed but do not
necessarily block a release.

The deployed editorial app is available at `https://new-work.sanity.studio/`. The website remains a separate Astro deployment; publishing content triggers a website rebuild only after the hosting webhook is configured.

## Content model

Every photo, video, or file is a flat **Asset** record and follows the same publishing workflow. An Asset can optionally link to one **Project** and receive an order within that Project. Project is the only grouping concept; there is no second grouping type. The front gallery also selects Asset records directly, so any eligible Project Asset can be featured without duplicating it.

The normal client workflow is documented in `CLIENT_GUIDE.md`. Repository deployment and local synchronization are documented in `../DEPLOYMENT.md`. One-time data maintenance scripts live under `scripts/` and are intentionally not part of the Studio navigation.

After deploying the unified `work` schema, preview and then apply the non-destructive Project-to-Work conversion with:

```sh
npm run migrate:work-type
npm run migrate:work-type -- --apply
```

The migration creates Work copies and rewrites the known Work-page and asset-library references. It deliberately retains legacy Project documents as a rollback copy until the migrated site has been verified.

The Studio stays in this sibling folder. It is not embedded in the Astro app.
