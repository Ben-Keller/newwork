import {defineField, defineType} from 'sanity'
import {
  documentIsVisible,
  hasAssetReference,
  isApprovedWatchUrl,
  isNonEmptyString,
  isPlayableVideoAssetReference,
  isRecord,
  isWebVttAssetReference,
} from '../validation'
import {VIMEO_ID_PATTERN, YOUTUBE_ID_PATTERN, parseApprovedWatchUrl} from '../../../shared/content-policy'

export const mediaAsset = defineType({
  name: 'mediaAsset',
  title: 'Media asset',
  type: 'object',
  groups: [
    {name: 'media', title: 'Media', default: true},
    {name: 'accessibility', title: 'Accessibility'},
    {name: 'internal', title: 'Internal review'},
  ],
  fields: [
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      group: 'media',
      initialValue: 'image',
      options: {
        list: [
          {title: 'Image', value: 'image'},
          {title: 'Short video', value: 'video'},
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'editorialImage',
      group: 'media',
      hidden: ({parent}) => parent?.kind !== 'image',
    }),
    defineField({
      name: 'file',
      title: 'Hosted video',
      type: 'editorialFile',
      group: 'media',
      hidden: ({parent}) => parent?.kind !== 'video',
      validation: (Rule) => Rule.custom((value) =>
        value === undefined || isPlayableVideoAssetReference(value)
          ? true
          : 'Upload an MP4 or WebM video file.',
      ),
    }),
    defineField({
      name: 'remoteUrl',
      title: 'Approved remote player URL',
      type: 'url',
      group: 'media',
      hidden: ({parent}) => parent?.kind !== 'video',
      validation: (Rule) =>
        Rule.custom((value) =>
          value === undefined || isApprovedWatchUrl(value)
            ? true
            : 'Use an approved HTTPS Vimeo or YouTube player URL.',
        ),
    }),
    defineField({
      name: 'remotePlayerId',
      title: 'Approved remote player ID',
      type: 'string',
      group: 'media',
      hidden: ({parent}) => parent?.kind !== 'video',
      validation: (Rule) => Rule.custom((value, context) => {
        if (value === undefined) return true
        const parent = context.parent as {remoteUrl?: unknown}
        const parsed = parseApprovedWatchUrl(parent?.remoteUrl)
        if (!parsed || typeof value !== 'string') return 'Pair the ID with a supported Vimeo or YouTube URL.'
        const valid = parsed.provider === 'vimeo'
          ? VIMEO_ID_PATTERN.test(value)
          : YOUTUBE_ID_PATTERN.test(value)
        return valid && parsed.providerId === value
          ? true
          : 'The player ID must match the ID in the approved player URL.'
      }),
    }),
    defineField({
      name: 'intrinsicWidth',
      title: 'Intrinsic width',
      type: 'number',
      group: 'media',
      validation: (Rule) => Rule.positive().integer(),
    }),
    defineField({
      name: 'intrinsicHeight',
      title: 'Intrinsic height',
      type: 'number',
      group: 'media',
      validation: (Rule) => Rule.positive().integer(),
    }),
    defineField({name: 'poster', title: 'Video poster', type: 'editorialImage', group: 'media', hidden: ({parent}) => parent?.kind !== 'video'}),
    defineField({
      name: 'alt',
      title: 'Alt text / accessible description',
      type: 'string',
      group: 'accessibility',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as {kind?: string; decorative?: boolean}
          if (!documentIsVisible(context) || parent?.kind !== 'image' || parent?.decorative === true) return true
          return isNonEmptyString(value) ? true : 'Public images require meaningful alt text.'
        }),
    }),
    defineField({name: 'decorative', title: 'Decorative duplicate', type: 'boolean', group: 'accessibility', initialValue: false}),
    defineField({name: 'caption', title: 'Caption', type: 'string', group: 'accessibility'}),
    defineField({name: 'credit', title: 'Credit', type: 'string', group: 'accessibility'}),
    defineField({name: 'transcript', title: 'Transcript', type: 'text', rows: 6, group: 'accessibility', hidden: ({parent}) => parent?.kind !== 'video'}),
    defineField({
      name: 'captionsFile',
      title: 'WebVTT captions file',
      type: 'editorialFile',
      group: 'accessibility',
      hidden: ({parent}) => parent?.kind !== 'video',
      validation: (Rule) => Rule.custom((value) =>
        value === undefined || isWebVttAssetReference(value)
          ? true
          : 'Upload captions in WebVTT (.vtt) format.',
      ),
    }),
    defineField({
      name: 'captionsLanguage',
      title: 'Caption language',
      type: 'string',
      group: 'accessibility',
      initialValue: 'en',
      hidden: ({parent}) => parent?.kind !== 'video' || !parent?.captionsFile,
      validation: (Rule) => Rule.regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u, {name: 'BCP 47 language tag'}),
    }),
    defineField({
      name: 'captionsLabel',
      title: 'Caption track label',
      type: 'string',
      group: 'accessibility',
      initialValue: 'English',
      hidden: ({parent}) => parent?.kind !== 'video' || !parent?.captionsFile,
      validation: (Rule) => Rule.max(80),
    }),
    defineField({name: 'needsReview', title: 'Needs review', type: 'boolean', group: 'internal', initialValue: true}),
    defineField({name: 'prototypeOnly', title: 'Prototype only', type: 'boolean', group: 'internal', initialValue: false}),
    defineField({name: 'altNeedsReview', title: 'Alt text needs review', type: 'boolean', group: 'internal', initialValue: false}),
    defineField({name: 'needsApprovedEmbed', title: 'Needs approved embed', type: 'boolean', group: 'internal', initialValue: false}),
    defineField({name: 'needsApprovedMaster', title: 'Needs approved master', type: 'boolean', group: 'internal', initialValue: false}),
    defineField({name: 'previewIsPlaceholder', title: 'Preview is a placeholder', type: 'boolean', group: 'internal', initialValue: false}),
    defineField({
      name: 'doNotPublishWithoutExplicitApproval',
      title: 'Do not publish without explicit approval',
      type: 'boolean',
      group: 'internal',
      initialValue: false,
    }),
    defineField({name: 'sourceDurationSeconds', title: 'Source duration (seconds)', type: 'number', group: 'internal', validation: (Rule) => Rule.positive()}),
    defineField({name: 'sourceUrl', title: 'Original source URL', type: 'url', group: 'internal', validation: (Rule) => Rule.uri({scheme: ['https']})}),
    defineField({name: 'rightsStatus', title: 'Rights status', type: 'string', group: 'internal'}),
  ],
  validation: (Rule) =>
    Rule.custom((value, context) => {
      if (!isRecord(value)) return true
      if (value.kind === 'image') {
        return hasAssetReference(value.image) ? true : 'Choose an image.'
      }
      if (value.kind === 'video') {
        const hasHostedFile = hasAssetReference(value.file)
        const hasSource =
          hasHostedFile ||
          isNonEmptyString(value.remotePlayerId) ||
          isApprovedWatchUrl(value.remoteUrl)
        if (!hasSource) return 'Choose a hosted video or an approved remote player.'
        if (
          !hasHostedFile &&
          (typeof value.intrinsicWidth !== 'number' || typeof value.intrinsicHeight !== 'number')
        ) {
          return 'Remote video requires intrinsic width and height.'
        }
        if (documentIsVisible(context) && !hasAssetReference(value.poster)) {
          return 'Public videos require a poster.'
        }
      }
      return true
    }),
  preview: {
    select: {kind: 'kind', media: 'image', poster: 'poster', caption: 'caption'},
    prepare: ({kind, media, poster, caption}) => ({
      title: caption || (kind === 'video' ? 'Video' : 'Image'),
      media: kind === 'video' ? poster : media,
    }),
  },
})
