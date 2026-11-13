import {parseApprovedWatchUrl} from '../../shared/content-policy'
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
    defineField({name: 'visible', title: 'Show reel section', type: 'boolean', initialValue: true, description: 'Turn off to hide the player entirely. Unset means shown. Your media selection is kept.'}),
    defineField({name: 'enabled', title: 'Show the reel preview on the Work page', type: 'boolean', initialValue: false}),
    defineField({name: 'vimeoUrl', title: 'Vimeo reel URL', type: 'url', description: 'Paste the public Vimeo share link, not the /manage/ address. Takes priority over uploaded preview files. Plays muted when in view; visitors can unmute. Vimeo supplies the poster automatically.', validation: Rule => Rule.custom(value => !value || parseApprovedWatchUrl(value)?.provider === 'vimeo' ? true : 'Use a public Vimeo video URL, such as https://vimeo.com/1043174924.')}),
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
      if (!isRecord(value) || value.visible === false || value.enabled !== true) return true
      const problems: string[] = []
      const vimeo = parseApprovedWatchUrl(value.vimeoUrl)?.provider === 'vimeo'
      if (!vimeo && !hasAssetReference(value.poster)) problems.push('poster')
      if (!vimeo && !isPlayableVideoAssetReference(value.desktopSource) && !isApprovedHostedMediaUrl(value.desktopSourceUrl)) {
        problems.push('desktop source')
      }
      if (isNonEmptyString(value.ctaUrl) && !isNonEmptyString(value.ctaLabel)) {
        problems.push('CTA label')
      }
      return problems.length === 0 ? true : `An enabled reel requires: ${problems.join(', ')}.`
    }),
})
