import {PlayIcon} from '@sanity/icons/Play'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {
  hasAssetReference,
  isApprovedHostedMediaUrl,
  isNonEmptyString,
  isPlayableVideoAssetReference,
  isRecord,
} from '../validation'

export const reelSettings = defineType({
  name: 'reelSettings',
  title: 'Homepage reel preview',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({name: 'enabled', title: 'Show the reel preview on the Work page', type: 'boolean', initialValue: false}),
    defineField({name: 'poster', title: 'Poster', type: 'editorialImage'}),
    defineField({
      name: 'desktopSource',
      title: 'Desktop source',
      type: 'editorialFile',
      validation: (Rule) => Rule.custom((value) =>
        value === undefined || isPlayableVideoAssetReference(value)
          ? true
          : 'Upload an MP4 or WebM video file.',
      ),
    }),
    defineField({
      name: 'desktopSourceUrl',
      title: 'Approved desktop source URL',
      type: 'url',
      hidden: true,
      readOnly: true,
      validation: (Rule) =>
        Rule.custom((value) =>
          value === undefined || isApprovedHostedMediaUrl(value)
            ? true
            : 'Use a direct HTTPS video file on the approved Sanity CDN.',
        ),
    }),
    defineField({
      name: 'mobileSource',
      title: 'Mobile source',
      type: 'editorialFile',
      validation: (Rule) => Rule.custom((value) =>
        value === undefined || isPlayableVideoAssetReference(value)
          ? true
          : 'Upload an MP4 or WebM video file.',
      ),
    }),
    defineField({
      name: 'mobileSourceUrl',
      title: 'Approved mobile source URL',
      type: 'url',
      hidden: true,
      readOnly: true,
      validation: (Rule) =>
        Rule.custom((value) =>
          value === undefined || isApprovedHostedMediaUrl(value)
            ? true
            : 'Use a direct HTTPS video file on the approved Sanity CDN.',
        ),
    }),
    defineField({name: 'caption', title: 'Caption', type: 'string'}),
    defineField({
      name: 'credits',
      title: 'Credits',
      type: 'array',
      of: [defineArrayMember({type: 'credit'})],
    }),
    defineField({name: 'ctaLabel', title: 'CTA label', type: 'string', validation: (Rule) => Rule.max(60)}),
    defineField({name: 'ctaUrl', title: 'CTA URL', type: 'url', validation: (Rule) => Rule.uri({scheme: ['https']})}),
    defineField({name: 'startMuted', title: 'Start muted', type: 'boolean', initialValue: true, hidden: true, readOnly: true}),
    defineField({
      name: 'aspectRatio',
      title: 'Aspect ratio',
      type: 'string',
      initialValue: '16:9',
      validation: (Rule) => Rule.required().regex(/^\d+(?:\.\d+)?\s*[:/]\s*\d+(?:\.\d+)?$/u, {name: 'width:height ratio'}),
    }),
  ],
  validation: (Rule) =>
    Rule.custom((value) => {
      if (!isRecord(value) || value.enabled !== true) return true
      const problems: string[] = []
      if (!hasAssetReference(value.poster)) problems.push('poster')
      if (!isPlayableVideoAssetReference(value.desktopSource) && !isApprovedHostedMediaUrl(value.desktopSourceUrl)) {
        problems.push('desktop source')
      }
      if (isNonEmptyString(value.ctaUrl) && !isNonEmptyString(value.ctaLabel)) {
        problems.push('CTA label')
      }
      return problems.length === 0 ? true : `An enabled reel requires: ${problems.join(', ')}.`
    }),
})
