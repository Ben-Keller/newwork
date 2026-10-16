# Future newworkagency.com cutover

The client review is published at https://ben-keller.github.io/newwork/ by Ben's instruction on 16 October 2026. **The custom domain is not part of that release.** Its website DNS still points to Squarespace. The active publisher and automatic CMS checks are documented in [DEPLOYMENT.md](../DEPLOYMENT.md).

The root-domain profile is prepared independently:

```sh
node hosting/root-release.mjs --production
node hosting/verify-root-release.mjs --production
node hosting/serve.mjs --root-release
# http://127.0.0.1:4330/
```

This produces `release-dist/` at the root of https://newworkagency.com, with production metadata, sitemap and compatibility redirects. `/v1`, `/v2`, `/newwork`, `/newwork/v1` and `/newwork/v2` bookmarks retain query strings and fragments. The manual `prepare-root-release.yml` workflow creates a tested artifact only.

## Domain launch sequence

1. Obtain DNS account access and a complete zone export. Record the last-good review deployment and artifact. Contact placeholders are permitted; real details remain client-editable.
2. Verify the domain in the owning GitHub account using its generated TXT record. Configure `newworkagency.com` in repository Pages settings as part of the coordinated cutover.
3. Change the **existing** publisher from the `--review` package to the root profile, including its domain guard, output artifact, browser checks and content-check address. Update `studio-new-work/website.ts` at the same time. Do not add a competing publisher.
4. Replace website DNS records only, preserving email, forwarding and unrelated verification records. Publish the validated root artifact, verify certificates, enable HTTPS and check apex/www redirects.
5. Verify home/gallery, project pages, Contact, media, 404 responses, canonical tags, sitemap and old bookmarks at the actual domain. Publish a reviewed CMS update and verify the following automatic deployment.

## Website DNS change sheet

Public values reconfirmed 16 October 2026. Nameservers: `dns1.p03.nsone.net` through `dns4.p03.nsone.net`; registered through Squarespace. This is not a complete zone export.

| Record | Current | Proposed GitHub Pages |
|---|---|---|
| Apex A | 198.185.159.144 | 185.199.108.153 |
| Apex A | 198.185.159.145 | 185.199.109.153 |
| Apex A | 198.49.23.144 | 185.199.110.153 |
| Apex A | 198.49.23.145 | 185.199.111.153 |
| www CNAME | ext-sq.squarespace.com | ben-keller.github.io |

Reconfirm official GitHub targets at cutover. Preserve the verification TXT record. Website hosting does not create email accounts.

For application rollback, redeploy the recorded last-good artifact through the sole publisher. For hosting rollback, restore the captured website records. Never alter mail records or overwrite the preserved comparison app as a recovery shortcut.
