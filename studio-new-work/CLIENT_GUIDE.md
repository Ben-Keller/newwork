# Editing the New Work website

Open [New Work Studio](https://new-work.sanity.studio/) and choose **Website content**. The Overview screen has direct links to the main editing areas.

| Change | Where to edit |
|---|---|
| Public email | Contact page → Contact details → Contact email |
| Enable website enquiries | Contact page → Enquiry form → Formspree form endpoint |
| City or multiline address | Contact page → Contact details → Location or public address |
| Social destinations | Contact page → Contact details → Social links; change the label and URL or remove an entry |
| Homepage tiles | Work page → Front gallery; select and order 16 placements for the four-row desktop layout |
| Keep unused placements | Work page → Front gallery → Reserve gallery assets; these do not appear on the site |
| Homepage train-board messages | Work page → Homepage ticker → Ticker messages |
| City/time entries | Work page → Homepage ticker → City clocks; select SF, LA and/or NYC, or clear all for messages only |
| BTS title, subtitle and pictures | Work page → Behind the scenes; selected Assets retain their order |
| “Looking to create something impactful?” | Footer → Callout & ticker → Contact callout |
| Footer train-board words | Footer → Callout & ticker → Footer ticker messages |
| Client logos | Footer → Client logos; drag to reorder, replace each name and artwork, optionally add a link |
| Copyright | Footer → Legal line |
| Gallery hover label | Projects → Project details → Client / commissioner; only this client label appears in the train board |
| Horizontal, stacked and compact logos | Brand & navigation → Brand; each placement has its own field |
| Header “film + photo…” wording | Brand & navigation → Brand → Header description |

Contact placeholders are intentionally retained. Replace them whenever the real details are ready; no code change is needed. Clear the address to hide Location. Remove all social entries to hide Elsewhere. The email should be a valid public inbox. Placeholder email warnings are reminders and do not prevent publishing.

The Contact form asks for a project brief, name and email. It sends directly through Formspree when a valid **Contact page → Enquiry form → Formspree form endpoint** is published. Without an endpoint, it stays in **Copy enquiry** mode and clearly says nothing has been sent. The public Contact email is a separate setting and remains available as an alternative.

To connect it, create an agency-owned [Formspree account](https://formspree.io/register), verify the email, and create **New Work Agency → Website enquiries**. Choose and verify the receiving inbox. Copy the public `https://formspree.io/f/…` endpoint from the form's **Integration** tab into Sanity and Publish. Never paste a password or private API key into Sanity.

The receiving inbox, notifications, spam settings and submission archive are managed in Formspree. Changing the public email in Sanity does not change the form's recipient. The website includes a hidden honeypot. If Formspree requires a CAPTCHA, the visitor can explicitly continue on Formspree to complete it. Test the account's selected spam settings before launch; do not disable them simply to make a test pass. Domain restrictions, when enabled, must allow `ben-keller.github.io` for review and the approved custom-domain hostnames at launch.

After the website rebuild finishes, submit one clearly marked test enquiry. Check both Formspree's submission archive and the receiving inbox, including spam, and check that replying addresses the visitor's email. A website success message confirms service acceptance; inbox delivery must be verified separately. Failed requests retain the typed details and offer a copy/email fallback. The website does not put enquiry text in the URL, browser storage or Sanity.

Ticker styling is fixed to the selected Tall train board. Longer phrases cycle across a single line. City times update automatically using the correct local timezone, including daylight saving time. No manual daily time editing is needed.

Gallery placement changes do not delete underlying projects or assets. Keep 16 placements to preserve the selected layout; the editor warns if the count differs. Extra placements can be kept in Gallery reserve. The frontend uses up to the first 16 eligible placements.

For BTS, use the Asset library to upload a photograph, add its image description and connect it to the relevant approved Project. Publish that Asset and choose it under Work page → Behind the scenes. The website displays the first 12 photos in a pinboard layout; additional placements stay in reserve. An empty BTS selection shows 12 portfolio-derived placeholders. Photographs link to their Projects. The felt surface and pencil storyboard are decorative. The default heading outlines “Behind”. Real BTS photos have not been supplied yet.

Use transparent SVG logo artwork where available; supply its width and height (viewBox dimensions) to preserve its proportions. PNG images are also supported, but use transparency because the site renders these logos in black. Clearing an optional logo field falls back to the approved local artwork. The opening and homepage share one wordmark implementation. The approved horizontal artwork keeps its individual-letter media treatment; custom replacement artwork displays as a single image.

## Save and publish

Edits save as drafts. Press **Publish** when the change is ready. If you created a new Project/Asset, publish it as well as the page that selects it. Existing legacy fields are retained privately for recovery and are not part of the revised editor.

The website at [the client review address](https://ben-keller.github.io/newwork/) is built from published content. Published changes are checked every 15 minutes; a changed document triggers a validated rebuild and deployment. Allow the build to finish, then refresh the site. GitHub can occasionally delay scheduled checks. The Overview screen shows the latest website build time and whether newer published edits are waiting.

You do not need a deployment token. Draft edits never trigger publication. If the site has not updated after an hour, contact Ben so he can inspect the publishing run. The current review address stays out of search indexes. newworkagency.com remains separate until the agreed domain launch.

Oliver and Michael already have Studio invitations. Accept the existing invitation and use that same email to sign in.
For developer-assisted local review, the single website runs on port 4327. Its default mode uses prototype content. Stop it and run `npm run dev:cms` in `new-work-site/` to read published CMS content at that same address. The packaged release can be tested separately on port 4330.

Final project titles, copy and metadata still deserve editorial review. Rights approval remains the client's responsibility and is not an added CMS publication gate.

## Projects and assets

Create a Project with the Photo, Video or Featured starter. Complete Project details, Work-page card, Project page, Credits, Approval & publishing and Search & sharing. Add supporting Assets with a Project reference and Project order. Choose **Approved for website** when the Project is ready, then Publish. Draft or incomplete Projects do not appear just because a page references them.

Every image, video or file has one Asset record with its description, caption and credit. Brand files may remain unlinked. Use Vimeo or YouTube for full films; small Sanity video uploads are for preview clips. Use meaningful image descriptions or an intentional decorative setting. Project page sections control authored supporting sequences.

## V3 placeholders — 20 October 2026

The six numbered footer marks are temporary client-logo placeholders. Replace them individually under **Footer → Client logos** with an approved monochrome SVG or transparent PNG and the correct client name. Artwork is displayed in the current page color. Choose **Project** to link a logo to its project page and preview that project's cover image on hover or keyboard focus. On touchscreens, tapping opens the project directly. The project must be published and visible. Existing entries without a selection automatically use the project with the same client name when there is exactly one match; select a Project explicitly if a client has multiple projects. An optional HTTPS external link is used only without a Project selection and has no image preview. Clear the collection to hide it entirely.

Photography uses neutral public titles and numbered Client labels until the final names are supplied. Edit the client label in **Projects → Project details** and individual photograph titles in **Assets**. Internal ownership and existing URLs are preserved. Personal photographer/director names were removed from public titles and credits for this revision.
