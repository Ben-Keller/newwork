# Deployment, rollback, and incident runbook

## Environments

| Environment | Content mode | Data | Indexing | Secrets |
|---|---|---|---|---|
| Local prototype | `prototype` | Checked-in fixtures | Always blocked | None |
| Protected editorial preview | `preview` | Sanity drafts + published documents | Always blocked | Server-only `SANITY_PREVIEW_TOKEN` |
| Production | `production` | Published, approved Sanity documents | Per resolved SEO policy | No preview/write token |

Never expose a preview build at an unprotected public URL. Preview HTML contains draft editorial content even though it is `noindex`; robots directives are not access control.

## Initial setup

1. Create the owner-controlled Git repository, require pull requests and passing `Verify` checks on the release branch, and restrict force-push/deletion.
2. Create separate Sanity datasets when organizational policy requires stronger preview/production isolation. Add only intended Studio/preview origins to Sanity CORS and review them after every domain change.
3. Create a Cloudflare Pages project from the protected repository. Build with Node 22, `pnpm install --frozen-lockfile`, `pnpm build`, and output `dist`.
4. Configure the production variables from `.env.example`; use the approved HTTPS canonical origin. Do not add write or preview tokens to production Pages.
5. Configure an owner-controlled preview project/domain with access protection and the preview read token. Ensure it cannot alias the production custom domain.
6. Keep Cloudflare deploy-hook URLs and Sanity tokens in their respective secret stores. Limit token scope, rotate after exposure or staff/access changes, and never paste values into tickets or build logs.

## Release procedure

1. Review the Studio readiness lists for pending/expired rights, missing copy/credits, missing SEO, review blockers, and home launch candidates.
2. Run `pnpm sanity:seed:dry-run` before any intentional import. Review creates, patches, asset reuse, and blockers. Run the write seed only against the explicitly selected dataset, then run the dry run again and expect no unintended changes.
3. Review the protected preview at desktop/mobile widths, with keyboard, reduced motion, Save-Data simulation, media failures, and captions/transcripts.
4. Run `pnpm test:all`. Do not release from a dirty or unverifiable worktree; record the commit identifier in `VERIFICATION.md`.
5. Merge through the protected branch. Confirm Cloudflare builds the intended commit and environment.
6. Verify on the deployed origin: HTTPS redirect, one canonical origin, robots/sitemap, 404 status, security/cache headers, page metadata, asset loading, primary routes, consent/analytics state, and Sanity publish webhook.
7. Record the deployed commit, build URL/time, approvers, and post-release observations.

## Rollback

Use the least destructive option that removes exposure fastest:

1. For a content or rights issue, immediately set the record to hidden or mark rights expired/withdrawn, publish that safety change, and trigger a production rebuild.
2. For a code/configuration regression, use Cloudflare Pages deployment history to roll traffic back to the last verified deployment. Keep the failed deployment and logs for investigation.
3. For suspected secret exposure, revoke/rotate the credential first; do not wait for a code rollback. Delete and recreate exposed deploy hooks.
4. For a hostile or unknown change, restrict the affected account/project, preserve audit logs, and pause automated webhooks until ownership is confirmed.
5. After containment, reproduce safely, add a regression test, rerun the release procedure, and document impact and corrective action.

Do not delete Sanity documents or deployment history as an emergency shortcut. Hiding/expiring content and rolling back are faster and preserve evidence.

## Incident priorities

1. Protect people, private data, and contractual rights.
2. Remove unauthorized content from public reach.
3. Revoke compromised credentials and access.
4. Preserve relevant logs, deployment IDs, timestamps, and document history.
5. Notify the owner and appropriate client/rights/privacy contacts through established private channels.
6. Restore only from a known verified commit and approved content state.

## Monitoring and maintenance

- Review failed builds and unexpected deployment-hook activity immediately.
- Check public routes, sitemap/robots, certificate, canonical redirects, and media errors after each release.
- Review Sanity project members, CORS origins, API tokens, Cloudflare access, and Git permissions at least quarterly.
- Review rights expiries monthly and before every release; expired records are automatically excluded at build time but still require owner follow-up.
- Review dependency updates weekly and run the full suite before merge.
- Track real-user Web Vitals and 404/media failures only through an owner-approved, privacy-reviewed service. No monitoring vendor is enabled by this repository.
- Back up/export Sanity according to the owner’s retention policy before migrations and periodically test restoration in a non-production dataset.

## Account-controlled checks that code cannot complete

- DNS ownership, Cloudflare project creation, branch protection, access policies, CORS changes, tokens, deploy hook, privacy approval, actual backup/export, monitoring account, production data, and rights decisions require the owner’s accounts and authority.
- Record these as **BLOCKED** or **NOT RUN**, never as passing by inference.
