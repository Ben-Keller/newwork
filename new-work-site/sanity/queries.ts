/**
 * Public GROQ stays with the Astro frontend while the schema source of truth
 * lives in the sibling studio-new-work project. These projections intentionally
 * omit source URLs, rights notes, checksums, and internal review flags.
 */

import {defineQuery} from 'groq';

export const PUBLIC_PROJECT_FILTER = `
  !(_id in path("drafts.**")) &&
  (editorialStatus == "approved" || (!defined(editorialStatus) && visible == true)) &&
  rightsApprovalStatus == "approved" &&
  length(coalesce(rightsApprovalEvidence, "")) > 0 &&
  (!defined(rightsExpiresAt) || rightsExpiresAt > now()) &&
  (defined(editorialStatus) || needsReview != true) &&
  doNotPublishWithoutExplicitApproval != true &&
  (!defined(publishAt) || publishAt <= now()) &&
  ((template == "photo" && defined(defaultPhoto->image.asset)) || (template != "photo" && defined(cover.poster.asset))) &&
  (template == "photo" || length(coalesce(cover.alt, "")) > 0 || cover.decorative == true) &&
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
  ((template == "photo" && count(photos) >= 2) || count(contentBlocks[_type in ["heroImage", "heroVideo", "fullBleedImage", "containedImage", "imagePair", "imageGrid", "video", "shortLoop"]]) > 0) &&
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
    (!defined(image.asset) && !defined(mediaItem->image.asset)) ||
    (!defined(mediaItem) && length(coalesce(alt, "")) == 0 && decorative != true)
  )]) == 0 &&
  count(contentBlocks[_type == "imagePair" && (
    (!defined(left.image.asset) && !defined(left.mediaItem->image.asset)) || (!defined(left.mediaItem) && length(coalesce(left.alt, "")) == 0 && left.decorative != true) ||
    (!defined(right.image.asset) && !defined(right.mediaItem->image.asset)) || (!defined(right.mediaItem) && length(coalesce(right.alt, "")) == 0 && right.decorative != true)
  )]) == 0 &&
  count(contentBlocks[_type == "imageGrid" && count(images[
    (!defined(image.asset) && !defined(mediaItem->image.asset)) ||
    (!defined(mediaItem) && length(coalesce(alt, "")) == 0 && decorative != true)
  ]) > 0]) == 0 &&
  count(contentBlocks[_type in ["heroVideo", "video"] && !defined(poster.asset) && !defined(mediaItem->poster.asset)]) == 0 &&
  count(contentBlocks[_type == "shortLoop" && !defined(poster.asset)]) == 0 &&
  count(contentBlocks[_type in ["heroVideo", "video"] && !defined(mediaItem) &&
    !defined(source.asset) && !defined(remoteSource) && !defined(vimeoId) && !defined(youtubeId) && !defined(externalUrl)
  ]) == 0 &&
  count(contentBlocks[_type in ["heroImage", "fullBleedImage", "containedImage", "heroVideo", "video"] && defined(mediaItem) && (
    mediaItem->rightsApprovalStatus != "approved" ||
    (defined(mediaItem->rightsExpiresAt) && mediaItem->rightsExpiresAt <= now())
  )]) == 0 &&
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
  mediaItem->{_id, kind, image${IMAGE_PROJECTION}, alt, decorative, caption, credit, rightsApprovalStatus, rightsExpiresAt},
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

const PUBLIC_ABOUT_PEOPLE_PROJECTION = `"people": people[
  needsReview != true &&
  prototypeOnly != true &&
  doNotPublishWithoutExplicitApproval != true &&
  length(coalesce(name, "")) > 0 &&
  projectOwner in ["oliver", "michael", "collective", "other"] &&
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
    image.needsReview != true &&
    image.prototypeOnly != true &&
    image.altNeedsReview != true &&
    image.needsApprovedMaster != true &&
    image.doNotPublishWithoutExplicitApproval != true &&
    length(coalesce(title, "")) > 0
  ]${ABOUT_WORK_PROJECTION},
  needsReview,
  prototypeOnly,
  doNotPublishWithoutExplicitApproval
}`

const PREVIEW_ABOUT_PEOPLE_PROJECTION = `people[]${ABOUT_PERSON_PROJECTION}`

const PUBLIC_BLOCK_PROJECTION = `{
  _key,
  _type,
  ${INTERNAL_SAFETY_PROJECTION},
  _type == "heroImage" => {mediaItem->{_id, kind, image${IMAGE_PROJECTION}, alt, decorative, caption, credit}, image${IMAGE_PROJECTION}, alt, decorative, displayWidth, caption, credit},
  _type == "heroVideo" => {mediaItem->{_id, kind, poster${IMAGE_PROJECTION}, videoUrl, alt, decorative, caption, credit}, source${FILE_PROJECTION}, remoteSource, vimeoId, youtubeId, externalUrl, poster${IMAGE_PROJECTION}, aspectRatio, durationSeconds, captionsFile${FILE_PROJECTION}, captionsLanguage, captionsLabel, transcript, accessibleDescription, hasDialogue, caption, credit},
  _type == "fullBleedImage" => {mediaItem->{_id, kind, image${IMAGE_PROJECTION}, alt, decorative, caption, credit}, image${IMAGE_PROJECTION}, alt, decorative, caption, credit},
  _type == "containedImage" => {mediaItem->{_id, kind, image${IMAGE_PROJECTION}, alt, decorative, caption, credit}, image${IMAGE_PROJECTION}, alt, decorative, width, alignment, caption, credit},
  _type == "imagePair" => {left${IMAGE_ITEM_PROJECTION}, right${IMAGE_ITEM_PROJECTION}, ratioHandling, sharedCaption, caption, credit},
  _type == "imageGrid" => {images[]${IMAGE_ITEM_PROJECTION}, desktopColumns, mobileLayout, caption, credit},
  _type == "video" => {mediaItem->{_id, kind, poster${IMAGE_PROJECTION}, videoUrl, alt, decorative, caption, credit}, source${FILE_PROJECTION}, remoteSource, vimeoId, youtubeId, externalUrl, poster${IMAGE_PROJECTION}, aspectRatio, durationSeconds, captionsFile${FILE_PROJECTION}, captionsLanguage, captionsLabel, transcript, accessibleDescription, hasDialogue, autoplay, caption, credit},
  _type == "shortLoop" => {source${FILE_PROJECTION}, remoteSource, poster${IMAGE_PROJECTION}, alt, decorative, autoplayPolicy, startMuted, loop, caption, credit},
  _type == "textNote" => {body, maxWidth, alignment, caption, credit},
  _type == "caption" => {text, credit, association}
}`

const WORK_PHOTO_PROJECTION = `{
  _id,
  title,
  image${IMAGE_PROJECTION},
  alt,
  decorative,
  caption,
  credit,
  ${INTERNAL_SAFETY_PROJECTION}
}`

const PROJECT_CARD_PROJECTION = `{
  _id,
  _type,
  title,
  "slug": slug.current,
  owner,
  client,
  types,
  "template": coalesce(template, select(layoutVariant == "photoEssay" => "photo", layoutVariant in ["campaign", "experimental"] => "featured", "video")),
  "photos": photos[]->${WORK_PHOTO_PROJECTION},
  "defaultPhoto": defaultPhoto->${WORK_PHOTO_PROJECTION},
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

const REEL_PROJECTION = `{
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
}`

const WORK_PAGE_PROJECTION = `{
  introName,
  manifesto,
  gallery[]{_key, "workId": coalesce(work->_id, project->_id), "photoId": doorwayPhoto->_id, cardSize, treatment},
  reel${REEL_PROJECTION},
  notesEnabled,
  seo${SEO_PROJECTION}
}`

const REEL_PAGE_PROJECTION = `{
  enabled,
  introEyebrow,
  introHeadline,
  introCue,
  fallbackEyebrow,
  fallbackHeadline,
  fallbackDescription,
  closingEyebrow,
  closingHeadline,
  ctaLabel,
  ctaDestination,
  seo${SEO_PROJECTION}
}`

const PUBLIC_ABOUT_PAGE_PROJECTION = `{
  heading,
  about,
  capabilities,
  peopleHeading,
  peopleIntroduction,
  ${PUBLIC_ABOUT_PEOPLE_PROJECTION},
  image${IMAGE_PROJECTION},
  imageAlt,
  imageDecorative,
  seo${SEO_PROJECTION}
}`

const PREVIEW_ABOUT_PAGE_PROJECTION = `{
  heading,
  about,
  capabilities,
  peopleHeading,
  peopleIntroduction,
  ${PREVIEW_ABOUT_PEOPLE_PROJECTION},
  image${IMAGE_PROJECTION},
  imageAlt,
  imageDecorative,
  seo${SEO_PROJECTION}
}`

const CONTACT_PAGE_PROJECTION = `{
  heading,
  introduction,
  email,
  location,
  socialLinks[]{_key, label, url},
  seo${SEO_PROJECTION}
}`

const FOOTER_PROJECTION = `{
  strapline[]{_key, text, emphasis},
  peopleHeading,
  exploreHeading,
  connectHeading,
  exploreLinks[]{_key, label, destination, url},
  contactLabel,
  copyrightLine,
  showYear
}`

const SITE_SETTINGS_PROJECTION = `{
  siteName,
  navigation[]{_key, label, destination, visible},
  wordmark{format, image${IMAGE_PROJECTION}, file${FILE_PROJECTION}},
  compactMark{format, image${IMAGE_PROJECTION}, file${FILE_PROJECTION}},
  defaultSeo${SEO_PROJECTION},
  "workPage": *[_id == "workPage"][0]${WORK_PAGE_PROJECTION},
  "reelPage": *[_id == "reelPage"][0]${REEL_PAGE_PROJECTION},
  "aboutPage": *[_id == "aboutPage"][0]${PUBLIC_ABOUT_PAGE_PROJECTION},
  "contactPage": *[_id == "contactPage"][0]${CONTACT_PAGE_PROJECTION},
  "footer": *[_id == "footerSettings"][0]${FOOTER_PROJECTION}
}`

const PREVIEW_SITE_SETTINGS_PROJECTION = `{
  siteName,
  navigation[]{_key, label, destination, visible},
  wordmark{format, image${IMAGE_PROJECTION}, file${FILE_PROJECTION}},
  compactMark{format, image${IMAGE_PROJECTION}, file${FILE_PROJECTION}},
  defaultSeo${SEO_PROJECTION},
  "workPage": *[_id == "workPage"][0]${WORK_PAGE_PROJECTION},
  "reelPage": *[_id == "reelPage"][0]${REEL_PAGE_PROJECTION},
  "aboutPage": *[_id == "aboutPage"][0]${PREVIEW_ABOUT_PAGE_PROJECTION},
  "contactPage": *[_id == "contactPage"][0]${CONTACT_PAGE_PROJECTION},
  "footer": *[_id == "footerSettings"][0]${FOOTER_PROJECTION}
}`

export const SITE_SETTINGS_QUERY = defineQuery(/* groq */ `*[_id == "siteSettings" &&
  length(coalesce(defaultSeo.metaTitle, "")) > 0 &&
  length(coalesce(defaultSeo.metaDescription, "")) > 0 &&
  defined(defaultSeo.shareImage.asset) &&
  length(coalesce(defaultSeo.shareImageAlt, "")) > 0 &&
  wordmark.image.needsReview != true && wordmark.image.prototypeOnly != true && wordmark.image.altNeedsReview != true && wordmark.image.needsApprovedEmbed != true && wordmark.image.needsApprovedMaster != true && wordmark.image.previewIsPlaceholder != true && wordmark.image.doNotPublishWithoutExplicitApproval != true &&
  wordmark.file.needsReview != true && wordmark.file.prototypeOnly != true && wordmark.file.needsApprovedEmbed != true && wordmark.file.needsApprovedMaster != true && wordmark.file.previewIsPlaceholder != true && wordmark.file.doNotPublishWithoutExplicitApproval != true &&
  compactMark.image.needsReview != true && compactMark.image.prototypeOnly != true && compactMark.image.altNeedsReview != true && compactMark.image.needsApprovedEmbed != true && compactMark.image.needsApprovedMaster != true && compactMark.image.previewIsPlaceholder != true && compactMark.image.doNotPublishWithoutExplicitApproval != true &&
  compactMark.file.needsReview != true && compactMark.file.prototypeOnly != true && compactMark.file.needsApprovedEmbed != true && compactMark.file.needsApprovedMaster != true && compactMark.file.previewIsPlaceholder != true && compactMark.file.doNotPublishWithoutExplicitApproval != true &&
  defaultSeo.shareImage.needsReview != true && defaultSeo.shareImage.prototypeOnly != true && defaultSeo.shareImage.altNeedsReview != true && defaultSeo.shareImage.needsApprovedEmbed != true && defaultSeo.shareImage.needsApprovedMaster != true && defaultSeo.shareImage.previewIsPlaceholder != true && defaultSeo.shareImage.doNotPublishWithoutExplicitApproval != true
][0]${SITE_SETTINGS_PROJECTION}`)

export const PREVIEW_SITE_SETTINGS_QUERY = defineQuery(/* groq */ `*[_id == "siteSettings"][0]${PREVIEW_SITE_SETTINGS_PROJECTION}`)

export const HOME_PROJECTS_QUERY = defineQuery(/* groq */ `*[_type in ["work", "project"] && featuredOnHome == true && ${PUBLIC_PROJECT_FILTER}]
  | order(homeOrder asc) ${PROJECT_CARD_PROJECTION}`)

export const ALL_PUBLIC_PROJECTS_QUERY = defineQuery(/* groq */ `*[_type in ["work", "project"] && ${PUBLIC_PROJECT_FILTER}]
  | order(homeOrder asc) ${PROJECT_CARD_PROJECTION}`)

export const PUBLIC_PROJECT_SLUGS_QUERY = defineQuery(/* groq */ `*[_type in ["work", "project"] && ${PUBLIC_PROJECT_FILTER}]
  | order(homeOrder asc)[]{"slug": slug.current}`)

const PROJECT_DETAIL_FIELDS = `
  _id,
  _type,
  title,
  "slug": slug.current,
  owner,
  client,
  year,
  types,
  "template": coalesce(template, select(layoutVariant == "photoEssay" => "photo", layoutVariant in ["campaign", "experimental"] => "featured", "video")),
  "photos": photos[]->${WORK_PHOTO_PROJECTION},
  "defaultPhoto": defaultPhoto->${WORK_PHOTO_PROJECTION},
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
  seo${SEO_PROJECTION}
`

const PROJECT_DETAIL_PROJECTION = `{
  ${PROJECT_DETAIL_FIELDS},
  editorialStatus,
  rightsApprovalStatus,
  "rightsApprovalEvidence": "verified",
  rightsExpiresAt,
  "visible": true,
  "needsReview": false,
  "doNotPublishWithoutExplicitApproval": false
}`

export const ALL_PUBLIC_PROJECT_DETAILS_QUERY = defineQuery(/* groq */ `*[_type in ["work", "project"] && ${PUBLIC_PROJECT_FILTER}]
  | order(homeOrder asc) ${PROJECT_DETAIL_PROJECTION}`)

const PREVIEW_PROJECT_PROJECTION = `{
  ${PROJECT_DETAIL_FIELDS},
  editorialStatus,
  rightsApprovalStatus,
  rightsApprovalEvidence,
  rightsExpiresAt,
  visible,
  needsReview,
  doNotPublishWithoutExplicitApproval
}`

export const PREVIEW_PROJECT_DETAILS_QUERY = defineQuery(/* groq */ `*[_type in ["work", "project"]]
  | order(homeOrder asc) ${PREVIEW_PROJECT_PROJECTION}`)

export const PROJECT_BY_SLUG_QUERY = defineQuery(/* groq */ `*[_type in ["work", "project"] && slug.current == $slug && ${PUBLIC_PROJECT_FILTER}][0]
  ${PROJECT_DETAIL_PROJECTION}`)

export const PROJECT_NEIGHBORS_QUERY = defineQuery(/* groq */ `{
  "previous": *[_type in ["work", "project"] && ${PUBLIC_PROJECT_FILTER} && homeOrder < $homeOrder]
    | order(homeOrder desc)[0] ${PROJECT_CARD_PROJECTION},
  "next": *[_type in ["work", "project"] && ${PUBLIC_PROJECT_FILTER} && homeOrder > $homeOrder]
    | order(homeOrder asc)[0] ${PROJECT_CARD_PROJECTION}
}`)

const NOTE_CARD_FIELDS = `
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
`

export const NOTES_INDEX_QUERY = defineQuery(/* groq */ `*[_type == "note" && ${PUBLIC_NOTE_FILTER} &&
  *[_id == "workPage"][0].notesEnabled == true]
  | order(date desc) {
    ${NOTE_CARD_FIELDS},
    body
  }`)

export const PREVIEW_NOTES_QUERY = defineQuery(/* groq */ `*[_type == "note"]
  | order(date desc) {
    ${NOTE_CARD_FIELDS},
    body
  }`)

export const HOME_NOTES_QUERY = defineQuery(/* groq */ `${NOTES_INDEX_QUERY}[0...3]`)

export const NOTE_BY_SLUG_QUERY = defineQuery(/* groq */ `*[_type == "note" && slug.current == $slug && ${PUBLIC_NOTE_FILTER} &&
  *[_id == "workPage"][0].notesEnabled == true][0]{
  ${NOTE_CARD_FIELDS},
  body
}`)

export const SITEMAP_QUERY = defineQuery(/* groq */ `{
  "projects": *[_type in ["work", "project"] && ${PUBLIC_PROJECT_FILTER}][]{"slug": slug.current},
  "notes": *[_type == "note" && ${PUBLIC_NOTE_FILTER} &&
    *[_id == "workPage"][0].notesEnabled == true][]{"slug": slug.current}
}`)
