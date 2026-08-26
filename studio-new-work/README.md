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

Validate and build the standalone Studio before deploying it:

```sh
npm run build
npm run schema:deploy
npm run deploy
```

The deployed editorial app is available at `https://new-work.sanity.studio/`. The website remains a separate Astro deployment; publishing content triggers a website rebuild only after the hosting webhook is configured.

The normal client workflow is documented in `CLIENT_GUIDE.md`. One-time data maintenance scripts live under `scripts/` and are intentionally not part of the Studio navigation.

The Studio stays in this sibling folder. It is not embedded in the Astro app.
