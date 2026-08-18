# Project presentation model

Project content and presentation are deliberately separate. The project `cover` supplies the shared home-card and opening-hero media, while the ordered `contentBlocks` array supplies the narrative below it. Cover-equivalent legacy blocks are omitted from that lower stream; distinct players or media remain in editorial order. The fields below choose an art-directed rendering without hiding or reclassifying distinct content.

| Field | Accepted values | Runtime fallback | Editorial intent |
|---|---|---|---|
| `homeCardSize` | `standard`, `tall`, `large`, `wide` | `standard` | Relative metadata emphasis within a consistent lane-filling card width. `wide` is reserved for a reviewed full-row feature placement and is not used by the seed. |
| `homeColumn` | integer `1`–`4` | automatic editorial placement | Preferred desktop track only. Tablet and mobile remap it to two columns. |
| `homeOffset` | integer `-240`–`320` | `0` | Controlled negative space. The adapter preserves the bounded editorial value, while the near-tessellated home renderer safely uses `0`–`12px`; negative and larger legacy values cannot create overlap or oversized lane gaps. |
| `homeTreatment` | `standard`, `masked`, `framed`, `poster` | `standard` | Retained editorial metadata for compatibility. The current Work renderer deliberately presents every cover directly, without a frame, inset, border, or angled crop. |
| `projectTheme` | `light`, `warm`, `dark`, `accent` | `light` | Project-page surface/ink family. |
| `accentColor` | `#RRGGBB` | omitted | Optional controlled accent. Values are normalized before reaching style code. |
| `titleTreatment` | `standard`, `stacked`, `oversized`, `split` | `standard` | Title composition. |
| `heroTreatment` | `contained`, `fullViewport`, `split`, `masked` | `contained` | Treatment within the right-side desktop hero / stacked mobile hero. It never moves the cover back into the lower stream. |
| `layoutVariant` | `cinematic`, `photoEssay`, `campaign`, `experimental` | inferred from `types` | Selects one of four templates while preserving all content blocks. |
| `motionIntensity` | `low`, `medium`, `high` | `medium` | Relative motion range; reduced-motion and Save-Data always win. |

## Template fallback

When `layoutVariant` is missing or unknown, the shared adapter chooses `campaign` for Campaign work, `cinematic` for Film, `photoEssay` for Photography without Animation, and `experimental` for Animation. Records without a recognized type fall back to `cinematic`. This inference is a resilience fallback, not a publication or factual classification.

## Fixture mapping

- Cinematic: Mercury — An Unexpected Life; Olympics & Toyota — In Due Time; Mercury — One of the Greats; Untitled Portfolio Film.
- Photo essay: Arc; Cradlewise; Fellow; Molekule — In Office; Miss Jones — Pancake.
- Campaign: Tour De France x Toyota; Humu — Make Work Better, Holly.
- Experimental: Native — Cucumber Mint / Stop Motion; Dune / Tansy; Brava; Specialized Globe; Chanel Test.

The fixture deliberately varies columns, bounded offsets, treatments, themes, titles, heroes, and motion intensity. It does not enable a wide feature because the binding launch specification requires that placement to remain off until editorial review and sufficient normal rows exist.

Each provisional project also carries two deterministic, prototype-only Lorem Ipsum text blocks. They make the lower editorial rhythm reviewable before final copy exists and remain protected by the same production publication gates as other provisional fixture content. Neutral geometric studies fill missing secondary-media positions only in non-production rendering; production never invents replacement project imagery.

## Safety and migration

- These fields never relax `visible`, `needsReview`, rights approval, placeholder, master/embed, alt-text, or publication filters.
- Public and preview GROQ projections return the same presentation shape. Internal provenance remains excluded from public queries.
- Missing fields are safe for existing Sanity documents. Unknown enum values are ignored, malformed accent colors are dropped, and invalid column hints fall back to automatic placement.
- Default seeding preserves an editor's existing presentation choices. `--force-update` deliberately reapplies fixture-owned choices, while imported documents still become hidden and needs-review.
