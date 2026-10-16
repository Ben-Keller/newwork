# Keep the comparison unambiguous

## Sources of truth

`new-work-site/` is the existing version captured at the start of this implementation. Its 1,110 captured files (including existing generated image derivatives and QA captures) are recorded in `baseline-manifest.json`. Dependency directories, generated output, caches and secrets are excluded. The checker reports changed, removed and added files. CI uses `--source-only` to compare the 683 portable source/master files; generated AVIF derivatives and local QA captures are not committed and can differ across image-runtime platforms. The original capture manifest is retained unchanged.

`new-work-oliver-review/` is the only editable application for Oliver's revision. It has its own source, public assets, package/lock files, dist output, test results and browser-storage namespace. No imports, public asset symlinks or editable-file symlinks cross between apps. APFS copy-on-write was used for dependencies only; changes still belong to their own directory.

Ports are fixed: existing 4325, revision 4327, comparison 4328. The comparison page shows source labels and supports opening, gallery and Contact at desktop/tablet/mobile widths. Its iframes also isolate browser storage by origin.

## Every subsequent change

1. Edit only the revision app, unless the user explicitly asks to change the original.
2. Add/update the appropriate entry in this review's status document. Retain Oliver's comment IDs.
3. Run checks appropriate to the change, followed by `node hosting/check-review-baseline.mjs` from the root.
4. Review both versions in the comparison page. Never copy generated `dist/` into source.

The original workplan is `new-work-site/docs/V2_COMMENT_WORKPLAN.md`. It remains historical evidence, not the current status register. Current implementation decisions belong here.

## Promotion after review

Ben requested committing and publishing the revision on 16 October 2026, and explicitly selected the existing GitHub Pages review address. The sole publisher now builds `review-release-dist/` from production CMS content at `https://ben-keller.github.io/newwork/`, retaining noindex and old V1/V2 redirects. `root-release.json` and the artifact-only root workflow remain available for a later domain cutover; DNS stays unchanged.

Studio/schema use the revised editor, approved brand artwork and client dashboard. TypeGen writes to the revision. Both local comparison apps retain independent fixtures; production review packaging and CMS development use published Sanity content. Published CMS changes are checked every 15 minutes by GitHub Actions, without a personal automation credential. The former webhook remains disabled. Contact placeholders are permitted and client-editable.

Promotion never requires overwriting the baseline. Keep its manifest and the last-good published artifact for recovery. Never create a second Pages publisher or apply subsequent review changes to both app directories.
