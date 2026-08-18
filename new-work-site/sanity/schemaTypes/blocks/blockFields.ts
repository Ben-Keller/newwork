import {defineField} from 'sanity'
import {
  isApprovedHostedMediaUrl,
  isApprovedWatchUrl,
  isPlayableVideoAssetReference,
  isWebVttAssetReference,
} from '../validation'
import {YOUTUBE_ID_PATTERN} from '../../../shared/content-policy'

export const captionCreditFields = [
  defineField({name: 'caption', title: 'Caption', type: 'string', group: 'content'}),
  defineField({name: 'credit', title: 'Credit', type: 'string', group: 'content'}),
]

export const internalSafetyFields = [
  defineField({name: 'needsReview', title: 'Needs review', type: 'boolean', group: 'internal', initialValue: false}),
  defineField({
    name: 'prototypeOnly',
    title: 'Prototype only',
    type: 'boolean',
    group: 'internal',
    initialValue: false,
    validation: (Rule) =>
      Rule.custom((value) =>
        value === true ? 'Prototype-only media is blocked from production queries.' : true,
      ).warning(),
  }),
  defineField({
    name: 'altNeedsReview',
    title: 'Alt text needs review',
    type: 'boolean',
    group: 'internal',
    initialValue: false,
    validation: (Rule) =>
      Rule.custom((value) =>
        value === true ? 'Supply reviewed alt text or deliberately mark the media decorative.' : true,
      ).warning(),
  }),
  defineField({
    name: 'needsApprovedEmbed',
    title: 'Needs approved embed',
    type: 'boolean',
    group: 'internal',
    initialValue: false,
    validation: (Rule) =>
      Rule.custom((value) =>
        value === true ? 'Obtain approval for this player/embed before publication.' : true,
      ).warning(),
  }),
  defineField({
    name: 'needsApprovedMaster',
    title: 'Needs approved master',
    type: 'boolean',
    group: 'internal',
    initialValue: false,
    validation: (Rule) =>
      Rule.custom((value) =>
        value === true ? 'Replace the portfolio rendition with an approved master.' : true,
      ).warning(),
  }),
  defineField({
    name: 'previewIsPlaceholder',
    title: 'Preview is a placeholder',
    type: 'boolean',
    group: 'internal',
    initialValue: false,
    validation: (Rule) =>
      Rule.custom((value) =>
        value === true ? 'This preview is not a finished film.' : true,
      ).warning(),
  }),
  defineField({
    name: 'doNotPublishWithoutExplicitApproval',
    title: 'Do not publish without explicit approval',
    type: 'boolean',
    group: 'internal',
    initialValue: false,
    validation: (Rule) =>
      Rule.custom((value) =>
        value === true ? 'Document approval, then deliberately clear this blocker.' : true,
      ).warning(),
  }),
  defineField({
    name: 'sourceDurationSeconds',
    title: 'Original source duration (seconds)',
    type: 'number',
    group: 'internal',
    validation: (Rule) => Rule.positive(),
  }),
]

export const videoSourceFields = [
  defineField({
    name: 'source',
    title: 'Hosted source',
    type: 'editorialFile',
    group: 'content',
    validation: (Rule) => Rule.custom((value) =>
      value === undefined || isPlayableVideoAssetReference(value)
        ? true
        : 'Upload an MP4 or WebM video file.',
    ),
  }),
  defineField({
    name: 'remoteSource',
    title: 'Approved remote source URL',
    type: 'url',
    group: 'content',
    validation: (Rule) =>
      Rule.custom((value) =>
        value === undefined || isApprovedHostedMediaUrl(value)
          ? true
          : 'Use a direct HTTPS video file on the approved Sanity CDN.',
      ),
  }),
  defineField({
    name: 'vimeoId',
    title: 'Vimeo ID',
    type: 'string',
    group: 'content',
    validation: (Rule) => Rule.regex(/^\d+$/u, {name: 'numeric Vimeo ID'}),
  }),
  defineField({
    name: 'youtubeId',
    title: 'YouTube ID',
    type: 'string',
    group: 'content',
    validation: (Rule) => Rule.regex(YOUTUBE_ID_PATTERN, {name: '11-character YouTube ID'}),
  }),
  defineField({
    name: 'externalUrl',
    title: 'External watch URL',
    type: 'url',
    group: 'content',
    validation: (Rule) =>
      Rule.custom((value) =>
        value === undefined || isApprovedWatchUrl(value)
          ? true
          : 'Use an approved HTTPS Vimeo or YouTube watch URL.',
      ),
  }),
  defineField({name: 'poster', title: 'Poster', type: 'editorialImage', group: 'content'}),
  defineField({
    name: 'aspectRatio',
    title: 'Aspect ratio',
    type: 'string',
    group: 'content',
    initialValue: '16:9',
    validation: (Rule) => Rule.regex(/^\d+(?:\.\d+)?\s*[:/]\s*\d+(?:\.\d+)?$/u, {name: 'width:height ratio'}),
  }),
  defineField({name: 'durationSeconds', title: 'Published duration (seconds)', type: 'number', group: 'content', validation: (Rule) => Rule.positive()}),
  defineField({
    name: 'captionsFile',
    title: 'WebVTT captions file',
    type: 'editorialFile',
    group: 'content',
    validation: (Rule) => Rule.custom((value) =>
      value === undefined || isWebVttAssetReference(value)
        ? true
        : 'Upload captions in WebVTT (.vtt) format.',
    ),
  }),
  defineField({name: 'transcript', title: 'Transcript', type: 'text', rows: 6, group: 'content'}),
  defineField({
    name: 'accessibleDescription',
    title: 'Accessible motion description',
    type: 'text',
    rows: 3,
    group: 'content',
    description: 'Describe important visual information that is not conveyed by dialogue or captions.',
  }),
  defineField({
    name: 'captionsLanguage',
    title: 'Caption language',
    type: 'string',
    group: 'content',
    initialValue: 'en',
    hidden: ({parent}) => !parent?.captionsFile,
    validation: (Rule) => Rule.regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u, {name: 'BCP 47 language tag'}),
  }),
  defineField({
    name: 'captionsLabel',
    title: 'Caption track label',
    type: 'string',
    group: 'content',
    initialValue: 'English',
    hidden: ({parent}) => !parent?.captionsFile,
    validation: (Rule) => Rule.max(80),
  }),
  defineField({
    name: 'hasDialogue',
    title: 'Contains dialogue',
    type: 'boolean',
    group: 'content',
    initialValue: false,
    validation: (Rule) =>
      Rule.custom((value, context) => {
        const parent = context.parent as {captionsFile?: unknown; transcript?: unknown}
        return value !== true || parent?.captionsFile || parent?.transcript
          ? true
          : 'Dialogue-bearing films should include captions or a transcript.'
      }).warning(),
  }),
]
