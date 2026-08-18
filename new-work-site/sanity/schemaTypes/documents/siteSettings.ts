import {defineArrayMember, defineField, defineType} from 'sanity'
import {collectBlockingSafetyFlags, isRecord, wordCount} from '../validation'

function uniqueAboutOwner(value: unknown): true | string {
  if (!Array.isArray(value)) return true
  const owners = value.flatMap((candidate) => {
    if (!isRecord(candidate) || typeof candidate.projectOwner !== 'string') return []
    return [candidate.projectOwner]
  })
  return new Set(owners).size === owners.length
    ? true
    : 'Each project owner can appear only once on the About page.'
}

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  groups: [
    {name: 'identity', title: 'Identity', default: true},
    {name: 'about', title: 'About & contact'},
    {name: 'modules', title: 'Home modules'},
    {name: 'seo', title: 'SEO'},
    {name: 'internal', title: 'Internal review'},
  ],
  fields: [
    defineField({
      name: 'siteName',
      title: 'Site name',
      type: 'string',
      group: 'identity',
      initialValue: 'New Work Agency',
      validation: (Rule) => Rule.required().max(80),
    }),
    defineField({name: 'wordmark', title: 'Wordmark', type: 'brandAsset', group: 'identity'}),
    defineField({name: 'compactMark', title: 'Compact mark', type: 'brandAsset', group: 'identity'}),
    defineField({
      name: 'manifesto',
      title: 'Manifesto',
      type: 'string',
      group: 'identity',
      description: 'Aim for one specific line of 8–18 words.',
      validation: (Rule) => [
        Rule.max(160),
        Rule.custom((value) => {
          const count = wordCount(value)
          return count === 0 || (count >= 8 && count <= 18)
            ? true
            : 'The recommended manifesto length is 8–18 words.'
        }).warning(),
      ],
    }),
    defineField({
      name: 'manifestoNeedsReview',
      title: 'Manifesto needs review',
      type: 'boolean',
      group: 'internal',
      initialValue: true,
      validation: (Rule) =>
        Rule.custom((value) =>
          value === true ? 'The manifesto remains hidden in production until reviewed.' : true,
        ).warning(),
    }),
    defineField({name: 'about', title: 'About', type: 'portableText', group: 'about'}),
    defineField({
      name: 'aboutPeople',
      title: 'People',
      type: 'array',
      group: 'about',
      description: 'Profiles supported by owner-matched projects or explicitly supplied portfolio media.',
      of: [defineArrayMember({type: 'aboutPerson'})],
      validation: (Rule) => Rule.max(6).custom(uniqueAboutOwner),
    }),
    defineField({
      name: 'aboutImage',
      title: 'About image',
      type: 'editorialImage',
      group: 'about',
      description: 'Optional approved candid or studio image. Its embedded hotspot controls the crop.',
    }),
    defineField({
      name: 'aboutImageAlt',
      title: 'About image alt text',
      type: 'string',
      group: 'about',
      hidden: ({document}) => !document?.aboutImage,
      validation: (Rule) => Rule.max(220),
    }),
    defineField({
      name: 'aboutImageDecorative',
      title: 'About image is decorative',
      type: 'boolean',
      group: 'about',
      initialValue: false,
      hidden: ({document}) => !document?.aboutImage,
    }),
    defineField({
      name: 'capabilities',
      title: 'Expertise',
      type: 'array',
      group: 'about',
      of: [defineArrayMember({type: 'string'})],
      validation: (Rule) => Rule.unique(),
    }),
    defineField({
      name: 'contactEmail',
      title: 'Contact email',
      type: 'string',
      group: 'about',
      validation: (Rule) => [
        Rule.email(),
        Rule.custom((value) => (value ? true : 'A direct contact email is recommended.')).warning(),
      ],
    }),
    defineField({name: 'location', title: 'Location', type: 'string', group: 'about'}),
    defineField({name: 'aboutSeo', title: 'About page SEO', type: 'seoFields', group: 'seo'}),
    defineField({name: 'contactSeo', title: 'Contact page SEO', type: 'seoFields', group: 'seo'}),
    defineField({
      name: 'socialLinks',
      title: 'Social links',
      type: 'array',
      group: 'about',
      of: [defineArrayMember({type: 'socialLink'})],
      validation: (Rule) => Rule.unique(),
    }),
    defineField({
      name: 'reel',
      title: 'Reel',
      type: 'reelSettings',
      group: 'modules',
      initialValue: {enabled: false, startMuted: true, aspectRatio: '16:9'},
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'notesEnabled', title: 'Enable Notes', type: 'boolean', group: 'modules', initialValue: false}),
    defineField({
      name: 'defaultSeo',
      title: 'Default SEO',
      type: 'seoFields',
      group: 'seo',
      description: 'Fallback metadata for every page. The share image is cropped to 1200×630 at render time.',
      validation: (Rule) => Rule.required().custom((value) => {
        const seo = value as {
          metaTitle?: unknown
          metaDescription?: unknown
          shareImage?: {asset?: unknown}
          shareImageAlt?: unknown
        } | undefined
        const missing = [
          typeof seo?.metaTitle === 'string' && seo.metaTitle.trim() ? undefined : 'title',
          typeof seo?.metaDescription === 'string' && seo.metaDescription.trim() ? undefined : 'description',
          seo?.shareImage?.asset ? undefined : 'share image',
          typeof seo?.shareImageAlt === 'string' && seo.shareImageAlt.trim() ? undefined : 'share-image alt text',
        ].filter(Boolean)
        return missing.length === 0
          ? true
          : `Public production requires default SEO ${missing.join(', ')}.`
      }),
    }),
    defineField({
      name: 'analyticsEnabled',
      title: 'Enable analytics',
      type: 'boolean',
      group: 'modules',
      initialValue: false,
      description: 'No tracker is loaded while this is off.',
    }),
  ],
  initialValue: {
    siteName: 'New Work Agency',
    manifestoNeedsReview: true,
    reel: {enabled: false, startMuted: true, aspectRatio: '16:9'},
    notesEnabled: false,
    analyticsEnabled: false,
    defaultSeo: {noIndex: false},
  },
  validation: (Rule) =>
    Rule.custom((value) => {
      if (!isRecord(value)) return true
      const reel = isRecord(value.reel) ? value.reel : undefined
      if (!reel) return 'Reel settings must always be present, even when disabled.'
      const publicAssets = {
        wordmark: value.wordmark,
        compactMark: value.compactMark,
        aboutImage: value.aboutImage,
        aboutSeo: value.aboutSeo,
        contactSeo: value.contactSeo,
        defaultSeo: value.defaultSeo,
        reel: reel.enabled === true ? reel : undefined,
      }
      const blockers = collectBlockingSafetyFlags(publicAssets)
      if (
        value.aboutImage &&
        value.aboutImageDecorative !== true &&
        !(typeof value.aboutImageAlt === 'string' && value.aboutImageAlt.trim())
      ) {
        return 'The About image needs alt text or an explicit decorative setting.'
      }
      return blockers.length === 0
        ? true
        : `Clear public site-asset safety flags before publishing settings: ${blockers.join(', ')}.`
    }),
  preview: {
    select: {title: 'siteName'},
    prepare: ({title}) => ({title: title || 'New Work Agency', subtitle: 'Singleton site settings'}),
  },
})
