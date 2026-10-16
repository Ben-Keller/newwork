# Security policy

Report a suspected secret exposure, unauthorized publication, rights withdrawal, malicious content change, or dependency compromise privately to the repository owner. Do not open a public issue with credentials, unredacted approvals, personal data, or private asset URLs.

Immediate containment steps are documented in `docs/OPERATIONS.md`. Treat `SANITY_WRITE_TOKEN`, `SANITY_PREVIEW_TOKEN`, Cloudflare deploy-hook URLs, provider credentials, and any private approval record as secrets. The public site build must not receive write or preview credentials.

Dependency updates are reviewed through the lockfile, automated checks, Dependabot, and the package-manager supply-chain policy. A passing dependency install is not authorization to publish newly introduced third-party scripts or services; privacy, CSP, accessibility, and owner approval still apply.
