# Content readiness — 20 October 2026

The sole website in `new-work-site/` reads production content from Sanity project
`7un4plyu`, dataset `production` for release builds. Local development defaults to
prototype fixtures. Stop the local app and use `npm run dev:cms` to read published
content on the same port, 4327.

Contact email, address and social placeholders are expressly permitted by Ben
and remain editable in **Contact page → Contact details**. The V3 client-logo
strip and photography labels are also placeholders with CMS editing controls.
The eleven BTS frames currently use portfolio-derived imagery until the client
selects actual behind-the-scenes assets.

The active publisher targets https://ben-keller.github.io/newwork/ with noindex.
GitHub Actions checks published content every 15 minutes; the old rebuild webhook
is disabled and no dedicated personal token is required for scheduled checks.
Custom-domain cutover is deferred. Local source changes need an authorized commit,
push and successful deployment before appearing on that public address.

Production eligibility follows the shared content policy and Project approval
state. Rights approval is managed by the client. Media and accessibility
validation continue to apply. See [client editing](../../studio-new-work/CLIENT_GUIDE.md),
[deployment](../../DEPLOYMENT.md) and [feedback](../../reviews/oliver-2026-10/README.md).
