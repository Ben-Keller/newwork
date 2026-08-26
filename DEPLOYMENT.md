# New Work deployment and content workflow

This repository deliberately has two sources of truth:

| Source | Owns | Never owns |
|---|---|---|
| GitHub `main` | Astro code, Studio code, schemas, GROQ queries, generated query types | Editorial content or asset files uploaded through Studio |
| Sanity `production` | Published and draft content, references, crops, metadata, uploaded assets | Application or Studio source code |

GitHub Pages is generated output. Never edit it directly. Content is not exported into Git and is never merged with fixture JSON.

## Automatic paths

### Code push

Pushing relevant files to `main` starts one or both root workflows:

- `.github/workflows/deploy-studio.yml` validates TypeGen output, builds the standalone Studio, and runs an unattended `sanity deploy` that must also upload the schema successfully.
- `.github/workflows/deploy-site.yml` type-checks and lints the Astro app, runs coverage gates for code pushes, builds from published Sanity content, verifies the output, runs the production CMS browser smoke test, and publishes GitHub Pages.

Studio deploys are queued and never cancelled. Site builds are replaceable: a newer publish cancels an older site-only build because the newer build includes all published content.

### Content publish

Publishing, unpublishing, or deleting a website document in Sanity calls GitHub's `workflow_dispatch` API. That starts only `deploy-site.yml`; it never deploys Studio code and never writes to Git.

Astro is static. Published content appears on the public site after this verified rebuild completes, not merely when the Sanity document is published.

## One-time GitHub setup

### 1. Enable GitHub Pages Actions

1. Open the `Ben-Keller/newwork` repository.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions**.

The workflow publishes below the repository path:

```text
https://ben-keller.github.io/newwork/
```

`PUBLIC_SITE_URL` is the bare GitHub Pages origin and `PUBLIC_BASE_PATH` is `/newwork`; the workflow derives both values from the repository automatically.

### 2. Add the Sanity deployment token

1. Open `https://www.sanity.io/manage` and select project **New Work** (`7un4plyu`).
2. Open the project's API/token settings.
3. Create a dedicated robot/deploy token for Studio deployment. Do not reuse a personal editor token.
4. Copy the token immediately.
5. In GitHub, open **Settings → Secrets and variables → Actions → New repository secret**.
6. Name the secret exactly `SANITY_AUTH_TOKEN` and paste the token.

The token is exposed only to the Studio deployment step. It is never added to Astro, committed to Git, or included in the Studio bundle.

If the Studio action reports `You must login first`, `SANITY_AUTH_TOKEN` is missing, expired, or no longer authorized. Replace that repository secret with a current deploy token, then rerun the workflow.

### 3. Test both workflows manually

In GitHub **Actions**:

1. Open **Deploy Sanity Studio** and choose **Run workflow** on `main`.
2. Confirm the TypeGen, Studio build, schema upload, and Studio deployment steps pass.
3. Open **Deploy production site** and choose **Run workflow** on `main`.
4. Confirm every published homepage project route passes the production CMS smoke test and Pages deploys.

The hosted Studio remains:

```text
https://new-work.sanity.studio/
```

## One-time Sanity → GitHub webhook

Use GitHub's specific workflow-dispatch endpoint. This needs a narrower GitHub permission than a repository-dispatch token.

### 1. Create a fine-grained GitHub token

Create a fine-grained personal access token with:

- Repository access: only `Ben-Keller/newwork`
- Repository permission: **Actions — Read and write**
- A recorded expiration date

It does not need Contents write access.

### 2. Create the Sanity webhook

In Sanity Manage, open project **New Work → API → Webhooks** and create a document webhook with:

| Setting | Value |
|---|---|
| Name | `Rebuild GitHub Pages on publish` |
| Dataset | `production` |
| URL | `https://api.github.com/repos/Ben-Keller/newwork/actions/workflows/deploy-site.yml/dispatches` |
| Method | `POST` |
| Trigger on | Create, update, delete |
| Drafts | Disabled |
| Versions | Disabled |
| API version | A current fixed date supported by Sanity |

Filter:

```groq
_type in ["siteSettings", "workPage", "reelPage", "aboutPage", "contactPage", "footerSettings", "project", "mediaItem", "note"]
```

Projection/body:

```groq
{"ref": "main"}
```

HTTP headers:

```text
Accept: application/vnd.github+json
Authorization: Bearer <fine-grained GitHub token>
X-GitHub-Api-Version: 2022-11-28
```

Do not share or screenshot the webhook configuration while the authorization header is visible. Rotate the GitHub token before it expires and immediately if it is exposed.

### 3. Test the webhook

1. Publish a harmless reviewed text change in Studio.
2. Open GitHub Actions and confirm **Deploy production site** starts.
3. Confirm the event is shown as a manual/workflow dispatch, the production build passes, and Pages deploys.
4. Open the deployed page and confirm the content change.
5. Restore the text if it was only a test; that publish should trigger a second rebuild.

## Local daily workflow

### Pull code without merges

Configure this repository once:

```bash
git config pull.rebase false
git config pull.ff only
```

Before starting any code change:

```bash
git switch main
git pull --ff-only
```

Use one active code-writing session at a time. Commit directly to `main`, then push. If `git pull --ff-only` or `git push` refuses, stop: another code writer changed the branch. Do not create a merge commit or force-push over it.

Recommended code-change sequence:

```bash
git pull --ff-only
cd studio-new-work && npm run typegen && cd ..
cd new-work-site && pnpm typecheck && pnpm lint && pnpm test && cd ..
git status
git add <reviewed-files>
git commit -m "Describe the change"
git push origin main
```

When TypeGen runs, review and commit both generated artifacts when they change:

```text
studio-new-work/schema.json
new-work-site/src/sanity.types.ts
```

CI regenerates them and refuses to deploy if the committed files are stale. CI never commits generated files for you.

### See current Sanity content locally

No content pull is required. The local standalone Studio connects directly to project `7un4plyu`, dataset `production`:

```bash
cd studio-new-work
npm run dev
```

Refresh the browser to see another editor's latest changes. Drafts and published documents remain in Sanity; they are not Git files.

To run Astro locally with current published Sanity content:

```bash
cd new-work-site
pnpm dev:cms
```

The local-only canonical host is intentionally invalid and is never used by a deployment. The app still queries the real published `production` dataset.

### Create a local recovery snapshot

After signing into the Sanity CLI, run:

```bash
cd studio-new-work
npm run content:snapshot
```

This exports documents, drafts, references, and assets into a timestamped archive under:

```text
studio-new-work/.sanity/backups/
```

The entire `.sanity` directory is gitignored. Snapshots are for recovery and auditing only; do not import them as a normal synchronization step and do not commit them.

Validate all current documents against the local schema with:

```bash
npm run content:validate
```

## Content and schema changes without merging

- Editors work only in Sanity `production`.
- Developers work only on schema/query/application code in Git.
- Local fixtures remain prototype test data; they are never synchronized with production.
- Ordinary publishing never runs a seed script or migration.
- A content webhook only rebuilds the website.

For a breaking schema change, use an expand–migrate–contract sequence:

1. Add the new field while retaining the old field and deploy Studio.
2. Create a local content snapshot.
3. Run a reviewed, explicit migration with a dry run where supported.
4. Validate documents and publish the migrated content.
5. Let the webhook rebuild and verify the website.
6. Remove the old schema/query path in a later commit.

Never run general content migrations automatically on every push to `main`.

## Rollback

- Code or Studio regression: use `git revert <commit>`, review the new revert commit, and push it to `main`. This preserves linear history and triggers the relevant deployment.
- Content regression: restore the document through Sanity history or publish the previous value. The webhook rebuilds the site.
- Failed deployment: the existing deployed site or Studio remains the active version. Fix the cause and push a new commit or rerun the workflow.
- Dataset recovery: retain the timestamped export and perform any import only as a deliberate recovery operation.

## Security rules

- Never commit `SANITY_AUTH_TOKEN`, the GitHub webhook token, `SANITY_WRITE_TOKEN`, or `SANITY_PREVIEW_TOKEN`.
- Use a different token for Sanity deployment and GitHub workflow dispatch.
- Scope both tokens to the smallest useful permissions and rotate them.
- Do not put secrets in `PUBLIC_*` variables or `sanity.config.ts`.
- Do not enable draft/version webhook events for the production rebuild.
