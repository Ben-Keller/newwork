/**
 * Public GROQ lives beside the Studio schema so the editorial safety contract is
 * reviewable in one place. These projections intentionally omit source URLs,
 * rights notes, checksums, and internal review flags.
 */

export const PUBLIC_PROJECT_FILTER = `
  !(_id in path("drafts.**")) &&
  visible == true &&
  rightsApprovalStatus == "approved" &&
  length(coalesce(rightsApprovalEvidence, "")) > 0 &&
  (!defined(rightsExpiresAt) || rightsExpiresAt > now()) &&
  needsReview != true &&
  doNotPublishWithoutExplicitApproval != true &&
  (!defined(publishAt) || publishAt <= now()) &&
  defined(cover.poster.asset) &&
  (length(coalesce(cover.alt, "")) > 0 || cover.decorative == true) &&
  cover.needsReview != true &&
  cover.previewIsPlaceholder != true &&
  cover.prototypeOnly != true &&
  cover.focalPoint.needsReview != true &&
  cover.poster.needsReview != true &&
  cover.poster.prototypeOnly != true &&
  cover.poster.altNeedsReview != true &&
  cover.poster.needsApprovedEmbed != true &&
  cover.poster.needsApprovedMaster != true &&
  cover.poster.previewIsPlaceholder != true &&
  cover.poster.doNotPublishWithoutExplicitApproval != true &&
  cover.previewVideo.needsReview != true &&
  cover.previewVideo.prototypeOnly != true &&
  cover.previewVideo.altNeedsReview != true &&
  cover.previewVideo.needsApprovedEmbed != true &&
  cover.previewVideo.needsApprovedMaster != true &&
  cover.previewVideo.previewIsPlaceholder != true &&
  cover.previewVideo.doNotPublishWithoutExplicitApproval != true &&
  cover.previewPosterOverride.needsReview != true &&
  cover.previewPosterOverride.prototypeOnly != true &&
  cover.previewPosterOverride.altNeedsReview != true &&
  cover.previewPosterOverride.needsApprovedEmbed != true &&
  cover.previewPosterOverride.needsApprovedMaster != true &&
  cover.previewPosterOverride.previewIsPlaceholder != true &&
  cover.previewPosterOverride.doNotPublishWithoutExplicitApproval != true &&
  cover.mobilePoster.needsReview != true &&
  cover.mobilePoster.prototypeOnly != true &&
  cover.mobilePoster.altNeedsReview != true &&
  cover.mobilePoster.needsApprovedEmbed != true &&
  cover.mobilePoster.needsApprovedMaster != true &&
  cover.mobilePoster.previewIsPlaceholder != true &&
  cover.mobilePoster.doNotPublishWithoutExplicitApproval != true &&
  seo.shareImage.needsReview != true &&
  seo.shareImage.prototypeOnly != true &&
  seo.shareImage.altNeedsReview != true &&
  seo.shareImage.needsApprovedEmbed != true &&
  seo.shareImage.needsApprovedMaster != true &&
  seo.shareImage.previewIsPlaceholder != true &&
  seo.shareImage.doNotPublishWithoutExplicitApproval != true &&
  count(contentBlocks[_type in ["heroImage", "heroVideo", "fullBleedImage", "containedImage", "imagePair", "imageGrid", "video", "shortLoop"]]) > 0 &&
  count(contentBlocks[
    needsReview == true ||
    prototypeOnly == true ||
    altNeedsReview == true ||
    needsApprovedEmbed == true ||
    needsApprovedMaster == true ||
    previewIsPlaceholder == true ||
    doNotPublishWithoutExplicitApproval == true ||
    image.needsReview == true || image.prototypeOnly == true || image.altNeedsReview == true || image.needsApprovedEmbed == true || image.needsApprovedMaster == true || image.previewIsPlaceholder == true || image.doNotPublishWithoutExplicitApproval == true ||
    poster.needsReview == true || poster.prototypeOnly == true || poster.altNeedsReview == true || poster.needsApprovedEmbed == true || poster.needsApprovedMaster == true || poster.previewIsPlaceholder == true || poster.doNotPublishWithoutExplicitApproval == true ||
    source.needsReview == true || source.prototypeOnly == true || source.altNeedsReview == true || source.needsApprovedEmbed == true || source.needsApprovedMaster == true || source.previewIsPlaceholder == true || source.doNotPublishWithoutExplicitApproval == true ||
    captionsFile.needsReview == true || captionsFile.prototypeOnly == true || captionsFile.needsApprovedMaster == true || captionsFile.doNotPublishWithoutExplicitApproval == true ||
    left.needsReview == true || left.prototypeOnly == true || left.altNeedsReview == true || left.doNotPublishWithoutExplicitApproval == true || left.image.needsReview == true || left.image.prototypeOnly == true || left.image.altNeedsReview == true || left.image.needsApprovedEmbed == true || left.image.needsApprovedMaster == true || left.image.previewIsPlaceholder == true || left.image.doNotPublishWithoutExplicitApproval == true ||
    right.needsReview == true || right.prototypeOnly == true || right.altNeedsReview == true || right.doNotPublishWithoutExplicitApproval == true || right.image.needsReview == true || right.image.prototypeOnly == true || right.image.altNeedsReview == true || right.image.needsApprovedEmbed == true || right.image.needsApprovedMaster == true || right.image.previewIsPlaceholder == true || right.image.doNotPublishWithoutExplicitApproval == true
  ]) == 0 &&
  count(contentBlocks[_type == "imageGrid" && count(images[
    needsReview == true || prototypeOnly == true || altNeedsReview == true || doNotPublishWithoutExplicitApproval == true ||
    image.needsReview == true || image.prototypeOnly == true || image.altNeedsReview == true || image.needsApprovedEmbed == true || image.needsApprovedMaster == true || image.previewIsPlaceholder == true || image.doNotPublishWithoutExplicitApproval == true
  ]) > 0]) == 0 &&
  count(contentBlocks[_type in ["heroImage", "fullBleedImage", "containedImage"] && (
    !defined(image.asset) || (length(coalesce(alt, "")) == 0 && decorative != true)
  )]) == 0 &&
  count(contentBlocks[_type == "imagePair" && (
    !defined(left.image.asset) || (length(coalesce(left.alt, "")) == 0 && left.decorative != true) ||
    !defined(right.image.asset) || (length(coalesce(right.alt, "")) == 0 && right.decorative != true)
  )]) == 0 &&
  count(contentBlocks[_type == "imageGrid" && count(images[
    !defined(image.asset) || (length(coalesce(alt, "")) == 0 && decorative != true)
  ]) > 0]) == 0 &&
  count(contentBlocks[_type in ["heroVideo", "video", "shortLoop"] && !defined(poster.asset)]) == 0 &&
  count(contentBlocks[_type in ["heroVideo", "video", "shortLoop"] &&
    !defined(source.asset) && !defined(remoteSource) && !defined(vimeoId) && !defined(youtubeId) && !defined(externalUrl)
  ]) == 0 &&
  count(contentBlocks[_type == "shortLoop" && length(coalesce(alt, "")) == 0 && decorative != true]) == 0
`

export const PUBLIC_NOTE_FILTER = `
  !(_id in path("drafts.**")) &&
  visible == true &&
  rightsApprovalStatus == "approved" &&
  length(coalesce(rightsApprovalEvidence, "")) > 0 &&
  (!defined(rightsExpiresAt) || rightsExpiresAt > now()) &&
  needsReview != true &&
  doNotPublishWithoutExplicitApproval != true &&
  (!defined(publishAt) || publishAt <= now()) &&
  defined(title) && length(title) > 0 &&
  defined(slug.current) && length(slug.current) > 0 &&
  defined(summary) && length(summary) > 0 && length(summary) <= 220 &&
  dateTime(date + "T00:00:00Z") <= dateTime(now()) &&
  media.needsReview != true &&
  media.prototypeOnly != true &&
  media.altNeedsReview != true &&
  media.needsApprovedEmbed != true &&
  media.needsApprovedMaster != true &&
  media.previewIsPlaceholder != true &&
  media.doNotPublishWithoutExplicitApproval != true &&
  media.image.needsReview != true && media.image.prototypeOnly != true && media.image.altNeedsReview != true && media.image.needsApprovedEmbed != true && media.image.needsApprovedMaster != true && media.image.previewIsPlaceholder != true && media.image.doNotPublishWithoutExplicitApproval != true &&
  media.file.needsReview != true && media.file.prototypeOnly != true && media.file.altNeedsReview != true && media.file.needsApprovedEmbed != true && media.file.needsApprovedMaster != true && media.file.previewIsPlaceholder != true && media.file.doNotPublishWithoutExplicitApproval != true &&
  media.poster.needsReview != true && media.poster.prototypeOnly != true && media.poster.altNeedsReview != true && media.poster.needsApprovedEmbed != true && media.poster.needsApprovedMaster != true && media.poster.previewIsPlaceholder != true && media.poster.doNotPublishWithoutExplicitApproval != true &&
  media.captionsFile.needsReview != true && media.captionsFile.prototypeOnly != true && media.captionsFile.needsApprovedMaster != true && media.captionsFile.doNotPublishWithoutExplicitApproval != true &&
  seo.shareImage.needsReview != true && seo.shareImage.prototypeOnly != true && seo.shareImage.altNeedsReview != true && seo.shareImage.needsApprovedEmbed != true && seo.shareImage.needsApprovedMaster != true && seo.shareImage.previewIsPlaceholder != true && seo.shareImage.doNotPublishWithoutExplicitApproval != true &&
  ((media.kind == "image" && defined(media.image.asset) && (length(coalesce(media.alt, "")) > 0 || media.decorative == true)) ||
   (media.kind == "video" && defined(media.poster.asset) && (defined(media.file.asset) || defined(media.remoteUrl))))
`

const INTERNAL_SAFETY_PROJECTION = `
  needsReview,
  prototypeOnly,
  altNeedsReview,
  needsApprovedEmbed,
  needsApprovedMaster,
  previewIsPlaceholder,
  doNotPublishWithoutExplicitApproval
`

const IMAGE_PROJECTION = `{
  _type,
  asset->{_id, url, mimeType, "width": metadata.dimensions.width, "height": metadata.dimensions.height, "aspectRatio": metadata.dimensions.aspectRatio, "lqip": metadata.lqip},
  crop,
  hotspot,
  ${INTERNAL_SAFETY_PROJECTION}
}`

const FILE_PROJECTION = `{
  _type,
  asset->{_id, url, mimeType, size, originalFilename},
  ${INTERNAL_SAFETY_PROJECTION}
}`

const IMAGE_ITEM_PROJECTION = `{
  _key,
  image${IMAGE_PROJECTION},
  alt,
  decorative,
  caption,
  credit,
  ${INTERNAL_SAFETY_PROJECTION}
}`

const COVER_PROJECTION = `{
  poster${IMAGE_PROJECTION},
  alt,
  decorative,
  previewVideo${FILE_PROJECTION},
  previewVideoUrl,
  previewPosterOverride${IMAGE_PROJECTION},
  mediaType,
  cardRatio,
  mobilePoster${IMAGE_PROJECTION},
  focalPoint{x, y, needsReview},
  ${INTERNAL_SAFETY_PROJECTION}
}`

const SEO_PROJECTION = `{
  metaTitle,
  metaDescription,
  shareImage${IMAGE_PROJECTION},
  shareImageAlt,
  noIndex
}`

const ABOUT_WORK_PROJECTION = `{
  _key,
  title,
  client,
  url,
  image${IMAGE_PROJECTION},
  alt,
  needsReview,
  prototypeOnly,
  doNotPublishWithoutExplicitApproval
}`

const ABOUT_PERSON_PROJECTION = `{
  _key,
  name,
  projectOwner,
  roleLabel,
  bio,
  selectedWork[]${ABOUT_WORK_PROJECTION},
  needsReview,
  prototypeOnly,
  doNotPublishWithoutExplicitApproval
}`

const PUBLIC_ABOUT_PEOPLE_PROJECTION = `"aboutPeople": aboutPeople[
  needsReview != true &&
  prototypeOnly != true &&
  doNotPublishWithoutExplicitApproval != true &&
  length(coalesce(name, "")) > 0 &&
  projectOwner in ["oliver", "michael", "anjali", "collective", "other"] &&
  count(bio) > 0
] {
  _key,
  name,
  projectOwner,
  roleLabel,
  bio,
  "selectedWork": selectedWork[
    needsReview != true &&
    prototypeOnly != true &&
    doNotPublishWithoutExplicitApproval != true &&
    defined(image.asset) &&
    length(coalesce(title, "")) > 0
  ]${ABOUT_WORK_PROJECTION},
  needsReview,
  prototypeOnly,
  doNotPublishWithoutExplicitApproval
}`

const PREVIEW_ABOUT_PEOPLE_PROJECTION = `aboutPeople[]${ABOUT_PERSON_PROJECTION}`

const PUBLIC_BLOCK_PROJECTION = `{
  _key,
  _type,
  ${INTERNAL_SAFETY_PROJECTION},
  _type == "heroImage" => {image${IMAGE_PROJECTION}, alt, decorative, displayWidth, caption, credit},
  _type == "heroVideo" => {source${FILE_PROJECTION}, remoteSource, vimeoId, youtubeId, externalUrl, poster${IMAGE_PROJECTION}, aspectRatio, durationSeconds, captionsFile${FILE_PROJECTION}, captionsLanguage, captionsLabel, transcript, accessibleDescription, hasDialogue, caption, credit},
  _type == "fullBleedImage" => {image${IMAGE_PROJECTION}, alt, decorative, caption, credit},
  _type == "containedImage" => {image${IMAGE_PROJECTION}, alt, decorative, width, alignment, caption, credit},
  _type == "imagePair" => {left${IMAGE_ITEM_PROJECTION}, right${IMAGE_ITEM_PROJECTION}, ratioHandling, sharedCaption, caption, credit},
  _type == "imageGrid" => {images[]${IMAGE_ITEM_PROJECTION}, desktopColumns, mobileLayout, caption, credit},
  _type == "video" => {source${FILE_PROJECTION}, remoteSource, vimeoId, youtubeId, externalUrl, poster${IMAGE_PROJECTION}, aspectRatio, durationSeconds, captionsFile${FILE_PROJECTION}, captionsLanguage, captionsLabel, transcript, accessibleDescription, hasDialogue, autoplay, caption, credit},
  _type == "shortLoop" => {source${FILE_PROJECTION}, remoteSource, poster${IMAGE_PROJECTION}, alt, decorative, autoplayPolicy, startMuted, loop, caption, credit},
  _type == "textNote" => {body, maxWidth, alignment, caption, credit},
  _type == "caption" => {text, credit, association}
}`

const PROJECT_CARD_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  owner,
  client,
  types,
  cover${COVER_PROJECTION},
  homeOrder,
  homeCardSize,
  homeColumn,
  homeOffset,
  homeTreatment,
  projectTheme,
  accentColor,
  titleTreatment,
  heroTreatment,
  layoutVariant,
  motionIntensity
}`

export const SITE_SETTINGS_QUERY = `*[_type == "siteSettings" && _id == "siteSettings" &&
  length(coalesce(defaultSeo.metaTitle, "")) > 0 &&
  length(coalesce(defaultSeo.metaDescription, "")) > 0 &&
  defined(defaultSeo.shareImage.asset) &&
  length(coalesce(defaultSeo.shareImageAlt, "")) > 0 &&
  wordmark.image.needsReview != true && wordmark.image.prototypeOnly != true && wordmark.image.altNeedsReview != true && wordmark.image.needsApprovedEmbed != true && wordmark.image.needsApprovedMaster != true && wordmark.image.previewIsPlaceholder != true && wordmark.image.doNotPublishWithoutExplicitApproval != true &&
  wordmark.file.needsReview != true && wordmark.file.prototypeOnly != true && wordmark.file.needsApprovedEmbed != true && wordmark.file.needsApprovedMaster != true && wordmark.file.previewIsPlaceholder != true && wordmark.file.doNotPublishWithoutExplicitApproval != true &&
  compactMark.image.needsReview != true && compactMark.image.prototypeOnly != true && compactMark.image.altNeedsReview != true && compactMark.image.needsApprovedEmbed != true && compactMark.image.needsApprovedMaster != true && compactMark.image.previewIsPlaceholder != true && compactMark.image.doNotPublishWithoutExplicitApproval != true &&
  compactMark.file.needsReview != true && compactMark.file.prototypeOnly != true && compactMark.file.needsApprovedEmbed != true && compactMark.file.needsApprovedMaster != true && compactMark.file.previewIsPlaceholder != true && compactMark.file.doNotPublishWithoutExplicitApproval != true &&
  aboutImage.needsReview != true && aboutImage.prototypeOnly != true && aboutImage.altNeedsReview != true && aboutImage.needsApprovedEmbed != true && aboutImage.needsApprovedMaster != true && aboutImage.previewIsPlaceholder != true && aboutImage.doNotPublishWithoutExplicitApproval != true &&
  aboutSeo.shareImage.needsReview != true && aboutSeo.shareImage.prototypeOnly != true && aboutSeo.shareImage.altNeedsReview != true && aboutSeo.shareImage.needsApprovedEmbed != true && aboutSeo.shareImage.needsApprovedMaster != true && aboutSeo.shareImage.previewIsPlaceholder != true && aboutSeo.shareImage.doNotPublishWithoutExplicitApproval != true &&
  contactSeo.shareImage.needsReview != true && contactSeo.shareImage.prototypeOnly != true && contactSeo.shareImage.altNeedsReview != true && contactSeo.shareImage.needsApprovedEmbed != true && contactSeo.shareImage.needsApprovedMaster != true && contactSeo.shareImage.previewIsPlaceholder != true && contactSeo.shareImage.doNotPublishWithoutExplicitApproval != true &&
  defaultSeo.shareImage.needsReview != true && defaultSeo.shareImage.prototypeOnly != true && defaultSeo.shareImage.altNeedsReview != true && defaultSeo.shareImage.needsApprovedEmbed != true && defaultSeo.shareImage.needsApprovedMaster != true && defaultSeo.shareImage.previewIsPlaceholder != true && defaultSeo.shareImage.doNotPublishWithoutExplicitApproval != true &&
  (reel.enabled != true || (
    defined(reel.poster.asset) &&
    (defined(reel.desktopSource.asset) || defined(reel.desktopSourceUrl)) &&
    reel.poster.needsReview != true && reel.poster.prototypeOnly != true && reel.poster.altNeedsReview != true && reel.poster.needsApprovedEmbed != true && reel.poster.needsApprovedMaster != true && reel.poster.previewIsPlaceholder != true && reel.poster.doNotPublishWithoutExplicitApproval != true &&
    reel.desktopSource.needsReview != true && reel.desktopSource.prototypeOnly != true && reel.desktopSource.needsApprovedEmbed != true && reel.desktopSource.needsApprovedMaster != true && reel.desktopSource.previewIsPlaceholder != true && reel.desktopSource.doNotPublishWithoutExplicitApproval != true &&
    reel.mobileSource.needsReview != true && reel.mobileSource.prototypeOnly != true && reel.mobileSource.needsApprovedEmbed != true && reel.mobileSource.needsApprovedMaster != true && reel.mobileSource.previewIsPlaceholder != true && reel.mobileSource.doNotPublishWithoutExplicitApproval != true
  ))
][0]{
  siteName,
  wordmark{format, image${IMAGE_PROJECTION}, file${FILE_PROJECTION}},
  compactMark{format, image${IMAGE_PROJECTION}, file${FILE_PROJECTION}},
  "manifesto": select(manifestoNeedsReview != true => manifesto),
  about,
  ${PUBLIC_ABOUT_PEOPLE_PROJECTION},
  aboutImage${IMAGE_PROJECTION},
  aboutImageAlt,
  aboutImageDecorative,
  aboutSeo${SEO_PROJECTION},
  contactSeo${SEO_PROJECTION},
  capabilities,
  contactEmail,
  location,
  socialLinks[]{_key, label, url},
  reel{
    enabled,
    poster${IMAGE_PROJECTION},
    desktopSource${FILE_PROJECTION},
    desktopSourceUrl,
    mobileSource${FILE_PROJECTION},
    mobileSourceUrl,
    caption,
    credits[]{_key, label, value, richValue, url},
    ctaLabel,
    ctaUrl,
    startMuted,
    aspectRatio
  },
  notesEnabled,
  defaultSeo${SEO_PROJECTION},
  analyticsEnabled
}`

const SITE_SETTINGS_PROJECTION = SITE_SETTINGS_QUERY.slice(SITE_SETTINGS_QUERY.indexOf('][0]') + 4)
  .replace('"manifesto": select(manifestoNeedsReview != true => manifesto),', 'manifesto,\n  manifestoNeedsReview,')
  .replace(PUBLIC_ABOUT_PEOPLE_PROJECTION, PREVIEW_ABOUT_PEOPLE_PROJECTION)

export const PREVIEW_SITE_SETTINGS_QUERY = `*[_type == "siteSettings" && _id == "siteSettings"][0]${SITE_SETTINGS_PROJECTION}`

export const HOME_PROJECTS_QUERY = `*[_type == "project" && featuredOnHome == true && ${PUBLIC_PROJECT_FILTER}]
  | order(homeOrder asc) ${PROJECT_CARD_PROJECTION}`

export const ALL_PUBLIC_PROJECTS_QUERY = `*[_type == "project" && ${PUBLIC_PROJECT_FILTER}]
  | order(homeOrder asc) ${PROJECT_CARD_PROJECTION}`

export const PUBLIC_PROJECT_SLUGS_QUERY = `*[_type == "project" && ${PUBLIC_PROJECT_FILTER}]
  | order(homeOrder asc)[]{"slug": slug.current}`

const PROJECT_DETAIL_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  owner,
  client,
  year,
  types,
  role,
  contributors[]{_key, name, role},
  shortDescription,
  cover${COVER_PROJECTION},
  contentBlocks[]${PUBLIC_BLOCK_PROJECTION},
  credits[]{_key, label, value, richValue, url},
  whatWeDid,
  featuredOnHome,
  homeOrder,
  homeCardSize,
  homeColumn,
  homeOffset,
  homeTreatment,
  projectTheme,
  accentColor,
  titleTreatment,
  heroTreatment,
  layoutVariant,
  motionIntensity,
  rightsApprovalStatus,
  "rightsApprovalEvidence": "verified",
  rightsExpiresAt,
  "visible": true,
  "needsReview": false,
  "doNotPublishWithoutExplicitApproval": false,
  seo${SEO_PROJECTION}
}`

export const ALL_PUBLIC_PROJECT_DETAILS_QUERY = `*[_type == "project" && ${PUBLIC_PROJECT_FILTER}]
  | order(homeOrder asc) ${PROJECT_DETAIL_PROJECTION}`

const PREVIEW_PROJECT_PROJECTION = PROJECT_DETAIL_PROJECTION
  .replace('"rightsApprovalEvidence": "verified",', 'rightsApprovalEvidence,')
  .replace('"visible": true,', 'visible,')
  .replace('"needsReview": false,', 'needsReview,')
  .replace('"doNotPublishWithoutExplicitApproval": false,', 'doNotPublishWithoutExplicitApproval,')

export const PREVIEW_PROJECT_DETAILS_QUERY = `*[_type == "project"]
  | order(homeOrder asc) ${PREVIEW_PROJECT_PROJECTION}`

export const PROJECT_BY_SLUG_QUERY = `*[_type == "project" && slug.current == $slug && ${PUBLIC_PROJECT_FILTER}][0]
  ${PROJECT_DETAIL_PROJECTION}`

export const PROJECT_NEIGHBORS_QUERY = `{
  "previous": *[_type == "project" && ${PUBLIC_PROJECT_FILTER} && homeOrder < $homeOrder]
    | order(homeOrder desc)[0] ${PROJECT_CARD_PROJECTION},
  "next": *[_type == "project" && ${PUBLIC_PROJECT_FILTER} && homeOrder > $homeOrder]
    | order(homeOrder asc)[0] ${PROJECT_CARD_PROJECTION}
}`

const NOTE_CARD_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  date,
  summary,
  media{
    kind,
    image${IMAGE_PROJECTION},
    file${FILE_PROJECTION},
    remoteUrl,
    remotePlayerId,
    intrinsicWidth,
    intrinsicHeight,
    poster${IMAGE_PROJECTION},
    alt,
    decorative,
    caption,
    credit,
    transcript,
    captionsFile${FILE_PROJECTION},
    captionsLanguage,
    captionsLabel,
    ${INTERNAL_SAFETY_PROJECTION}
  },
  seo${SEO_PROJECTION},
  rightsApprovalStatus,
  "rightsApprovalEvidence": "verified",
  rightsExpiresAt,
  "visible": true,
  "needsReview": false,
  "doNotPublishWithoutExplicitApproval": false
}`

export const NOTES_INDEX_QUERY = `*[_type == "note" && ${PUBLIC_NOTE_FILTER} &&
  *[_type == "siteSettings" && _id == "siteSettings"][0].notesEnabled == true]
  | order(date desc) {
    ${NOTE_CARD_PROJECTION.slice(1, -1)},
    body
  }`

export const PREVIEW_NOTES_QUERY = `*[_type == "note"]
  | order(date desc) {
    ${NOTE_CARD_PROJECTION.slice(1, -1)},
    body
  }`

export const HOME_NOTES_QUERY = `${NOTES_INDEX_QUERY}[0...3]`

export const NOTE_BY_SLUG_QUERY = `*[_type == "note" && slug.current == $slug && ${PUBLIC_NOTE_FILTER} &&
  *[_type == "siteSettings" && _id == "siteSettings"][0].notesEnabled == true][0]{
  ${NOTE_CARD_PROJECTION.slice(1, -1)},
  body
}`

export const SITEMAP_QUERY = `{
  "projects": *[_type == "project" && ${PUBLIC_PROJECT_FILTER}][]{"slug": slug.current},
  "notes": *[_type == "note" && ${PUBLIC_NOTE_FILTER} &&
    *[_type == "siteSettings" && _id == "siteSettings"][0].notesEnabled == true][]{"slug": slug.current}
}`
