# Editing the Oliver website

Open [New Work Studio](https://new-work.sanity.studio/) and choose **Website content**. The Overview screen has direct links to the main editing areas.

| Change | Where to edit |
|---|---|
| Public email | Contact page → Contact details → Contact email |
| City or multiline address | Contact page → Contact details → Location or public address |
| Social destinations | Contact page → Contact details → Social links; change the label and URL or remove an entry |
| Homepage tiles | Work page → Front gallery; select and order 16 placements for the four-row desktop layout |
| Keep unused placements | Work page → Front gallery → Reserve gallery assets; these do not appear on the site |
| Homepage train-board messages | Work page → Homepage ticker → Ticker messages |
| City/time entries | Work page → Homepage ticker → City clocks; select SF, LA and/or NYC, or clear all for messages only |
| BTS title, subtitle and pictures | Work page → Behind the scenes; selected Assets retain their order |
| “Looking to create something impactful?” | Footer → Callout & ticker → Contact callout |
| Footer train-board words | Footer → Callout & ticker → Footer ticker messages |
| Featured heading and copyright | Footer → Link columns / Legal line |
| Horizontal, stacked and compact logos | Brand & navigation → Brand; each placement has its own field |
| Header “film + photo…” wording | Brand & navigation → Brand → Header description |

Contact placeholders are intentionally retained. Replace them whenever the real details are ready; no code change is needed. Clear the address to hide Location. Remove all social entries to hide Elsewhere. The email should be a valid public inbox. Placeholder email warnings are reminders and do not prevent publishing.

Ticker styling is fixed to the selected Tall train board. Longer phrases cycle across a single line. City times update automatically using the correct local timezone, including daylight saving time. No manual daily time editing is needed.

Gallery placement changes do not delete underlying projects or assets. Keep 16 placements to preserve the selected layout; the editor warns if the count differs. Extra placements can be kept in Gallery reserve. The frontend uses up to the first 16 eligible placements.

For BTS, use the Asset library to upload a photograph, add its image description and connect it to the relevant approved Project. Publish that Asset and choose it under Work page → Behind the scenes. An empty BTS selection keeps the current portfolio-derived placeholder mosaic. Real BTS photos have not been supplied yet.

Use transparent SVG logo artwork where available; supply its width and height (viewBox dimensions) to preserve its proportions. PNG images are also supported, but use transparency because the site renders these logos in black. Clearing an optional logo field falls back to the approved local artwork. The opening and homepage share one wordmark implementation. The approved horizontal artwork keeps its individual-letter media treatment; custom replacement artwork displays as a single image.

## Save and publish

Edits save as drafts. Press **Publish** when the change is ready. If you created a new Project/Asset, publish it as well as the page that selects it. Existing legacy fields are retained privately for recovery and are not part of the revised editor.

The website at [the client review address](https://ben-keller.github.io/newwork/) is built from published content. Published changes are checked every 15 minutes; a changed document triggers a validated rebuild and deployment. Allow the build to finish, then refresh the site. GitHub can occasionally delay scheduled checks. The Overview screen shows the latest website build time and whether newer published edits are waiting.

You do not need a deployment token. Draft edits never trigger publication. If the site has not updated after an hour, contact Ben so he can inspect the publishing run. The current review address stays out of search indexes. newworkagency.com remains separate until the agreed domain launch.

Oliver and Michael already have Studio invitations. Accept the existing invitation and use that same email to sign in.
For developer-assisted local review, the CMS preview runs on port 4329 and the production package on 4330. The ordinary design review on 4327 deliberately uses fixed prototype content, so it does not reflect CMS edits.

Final project titles, copy and metadata still deserve editorial review. Rights approval remains the client's responsibility and is not an added CMS publication gate.

## Projects and assets

Create a Project with the Photo, Video or Featured starter. Complete Project details, Work-page card, Project page, Credits, Approval & publishing and Search & sharing. Add supporting Assets with a Project reference and Project order. Choose **Approved for website** when the Project is ready, then Publish. Draft or incomplete Projects do not appear just because a page references them.

Every image, video or file has one Asset record with its description, caption and credit. Brand files may remain unlinked. Use Vimeo or YouTube for full films; small Sanity video uploads are for preview clips. Use meaningful image descriptions or an intentional decorative setting. Project page sections control authored supporting sequences.
