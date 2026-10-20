# New Work

One project, one website source, one working tree on `main`.
All current feedback updates are in **`new-work-site/`**. Project Studio’s
**New Work** card launches it at **http://127.0.0.1:4327/**.

## Develop

Use Node 22.12+ and the committed pnpm lockfile:

```sh
cd new-work-site
pnpm install --frozen-lockfile
npm run dev
```

Local development uses prototype content and stays noindex. To read published
Sanity content, stop the dev server and run `npm run dev:cms` in the same folder.
It uses the same port. There is no separate baseline, revision or comparison app.

The site includes the shared animated wordmark, 16-tile gallery, Tall train
boards, showreel, 11-frame BTS mosaic and editable client-logo footer.
Contact details, client logos and photography labels remain placeholders where
requested and can be replaced through Sanity.

## Source and publishing

| Path | Purpose |
|---|---|
| `new-work-site/` | Website source, assets and tests |
| `studio-new-work/` | Sanity CMS, schemas and content tooling |
| `hosting/` | Package and verify the same website for its deployment destination |
| `reviews/oliver-2026-10/` | Dated feedback and verification history |

The website publisher builds from `new-work-site/` using published Sanity content.
The current public review address is https://ben-keller.github.io/newwork/ and
remains noindex. The client editor is https://new-work.sanity.studio/.
The custom domain is a separate future cutover; local launch does not publish.

- [Development and deployment rules](AGENTS.md)
- [Release and CMS publishing workflow](DEPLOYMENT.md)
- [Future domain cutover](hosting/ROOT_RELEASE.md)
- [Client editing guide](studio-new-work/CLIENT_GUIDE.md)
- [Feedback register](reviews/oliver-2026-10/README.md)

The duplicate app folders and versioned comparison tooling were retired on
20 October 2026. Previous code remains in Git history. A private recovery archive
of the consolidation, including uncommitted work, is retained under ignored
`output/consolidation-2026-10-20/`.
