# Current editing rules

On 20 October 2026, Ben retired the separate baseline/revision workflow.
There is one project at `/Users/ben/Documents/NewWork`, one Git worktree on `main`,
and one editable website at **`new-work-site/`**. Project Studio’s **New Work**
card opens http://127.0.0.1:4327/.

The latest V3 source, media, tests and placeholder assets were moved intact into
that folder. The Sanity CMS remains in `studio-new-work/` in the same project.
Both website publishing profiles, query TypeGen and maintenance scripts use the
canonical website. No publishing or production content mutation is part of this
filesystem consolidation.

The original baseline and V1 snapshot no longer exist as live app directories.
Their code is recoverable from Git history. The private recovery archive under
`output/consolidation-2026-10-20/` also preserves the old baseline, original
comparison tooling and the latest uncommitted source before the move.

Edit the current app, run its relevant checks and use the one Project Studio
launch target. Do not regenerate a baseline manifest or recreate comparison
apps. Dated QA entries retain historical evidence rather than operational rules.
Follow the root `AGENTS.md`, `README.md` and `DEPLOYMENT.md` for current commands.
