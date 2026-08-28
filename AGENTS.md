# New Work repository guidance

## Scope

These instructions apply to the entire repository.

## Repository map

- `studio-new-work/` is the standalone Sanity Studio for project `7un4plyu`, dataset `production`.
- `new-work-site/` is the Astro website built from published Sanity content.
- `.github/workflows/deploy-studio.yml` deploys Studio code and its schema.
- `.github/workflows/deploy-site.yml` validates and deploys the public site.
- `DEPLOYMENT.md` is the detailed source of truth for release, webhook, recovery, and rollback procedures.

## Sources of truth

- GitHub `main` owns application code, Studio code, schemas, GROQ queries, tests, and generated query types.
- Sanity `production` owns drafts, published documents, references, crops, metadata, and uploaded assets.
- Never export Sanity content into Git as a synchronization mechanism. Local and hosted Studios already use the same hosted dataset.
- Never edit generated GitHub Pages output directly.

## Working safely

- Inspect `git status` before editing and preserve unrelated or pre-existing changes.
- Pull only with `git pull --ff-only`, and only from a clean worktree. Never create an automatic merge commit or force-push.
- Do not commit, push, deploy, publish, unpublish, delete, migrate, seed, or mutate production content unless the user explicitly requests that action.
- Treat migration and seed scripts as deliberate maintenance tools. Run dry-run or preview modes first when available; never run them automatically on push.
- Prefer expand-migrate-contract schema changes. Keep legacy fields defined but hidden/deprecated until content is safely migrated.
- Never commit Sanity, GitHub, preview, write, or deployment tokens.

## Editorial model

- The normal project workflow is `draft` or `approved`; removed review/ready states must not be reintroduced without a user request.
- Rights approval is managed by the client and is not a publication gate. Retain legacy rights fields only for backward compatibility unless a migration removes their stored data.
- Brand assets may remain unassigned. Do not bulk-assign them to a project.
- Ordinary assets should use the canonical Project reference and project order fields rather than legacy grouping fields.
- Sanity validation runs in Studio, not in Content Lake. Validate API/script mutations in code before applying them.

## Sanity implementation rules

- Use `defineType` and `defineField` for schemas and references for document relationships.
- Let Sanity generate IDs for ordinary documents; explicit IDs are reserved for controlled singletons.
- After changing a schema or a GROQ query, regenerate and review both:
  - `studio-new-work/schema.json`
  - `new-work-site/src/sanity.types.ts`
- Query only the fields needed by the frontend. Include image dimensions, crop/hotspot data, and LQIP only where the UI uses them.
- Request appropriately sized Sanity image CDN URLs rather than serving original-resolution images.
- Do not use raw Sanity file assets for production video playback at scale. Use adaptive streaming through Sanity Media Library/Mux or another dedicated video provider.

## Verification

For Studio/schema changes, run from `studio-new-work/`:

```sh
npm run deploy:check
```

For website changes, run from `new-work-site/` as appropriate to the risk:

```sh
pnpm sanity:audit
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify:dist
```

Use focused tests while iterating, then run the complete relevant gate before handoff. Review `git diff --check` and the final diff. Do not weaken validations to make a failing release pass.

## Deployment behavior

- A local commit alone does not deploy; the reviewed commit must be pushed to GitHub `main`.
- Relevant pushes to `main` trigger the Studio and/or site GitHub Actions automatically.
- Publishing eligible content in Sanity should trigger only the site rebuild through the configured webhook; it does not deploy Studio code or write to Git.
- Match the GitHub Actions commit SHA to the pushed commit before treating a green run as proof.
- Failed deployment verification should be fixed at its source and rerun, not bypassed.

## Completion standard

- State what changed, what was intentionally left unchanged, and whether production content or external systems were modified.
- Report the exact checks run and their results.
- Call out any step that still requires authentication, a user decision, a push, or an external deployment.
