import {CogIcon} from '@sanity/icons/Cog'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {collectBlockingSafetyFlags, isRecord} from '../validation'
import {hiddenAllFieldsGroup} from '../clientGroups'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Brand & navigation',
  type: 'document',
  icon: CogIcon,
  groups: [
    {name: 'brand', title: 'Brand', default: true},
    {name: 'navigation', title: 'Navigation'},
    {name: 'seo', title: 'SEO defaults'},
    hiddenAllFieldsGroup,
  ],
  fields: [
    defineField({
      name: 'siteName',
      title: 'Site name',
      type: 'string',
      group: 'brand',
      initialValue: 'New Work Agency',
      validation: (Rule) => Rule.required().max(80),
    }),
    defineField({name: 'wordmark', title: 'Wordmark', type: 'brandAsset', group: 'brand'}),
    defineField({name: 'compactMark', title: 'Compact mark', type: 'brandAsset', group: 'brand'}),
    defineField({
      name: 'navigation',
      title: 'Main navigation',
      type: 'array',
      group: 'navigation',
      description: 'Drag links into order. Hidden links remain available here for later use.',
      of: [defineArrayMember({type: 'navigationItem'})],
      validation: (Rule) => Rule.unique(),
    }),
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
  ],
  initialValue: {
    siteName: 'New Work Agency',
    navigation: [
      {_type: 'navigationItem', _key: 'work', label: 'Work', destination: 'work', visible: true},
      {_type: 'navigationItem', _key: 'about', label: 'About', destination: 'reel', visible: true},
      {_type: 'navigationItem', _key: 'contact', label: 'Contact', destination: 'contact', visible: true},
    ],
    defaultSeo: {noIndex: false},
  },
  validation: (Rule) =>
    Rule.custom((value) => {
      if (!isRecord(value)) return true
      const publicAssets = {
        wordmark: value.wordmark,
        compactMark: value.compactMark,
        defaultSeo: value.defaultSeo,
      }
      const blockers = collectBlockingSafetyFlags(publicAssets)
      return blockers.length === 0
        ? true
        : `Clear brand or SEO safety flags before publishing settings: ${blockers.join(', ')}.`
    }),
  preview: {
    select: {title: 'siteName'},
    prepare: ({title}) => ({title: title || 'New Work Agency', subtitle: 'Brand, navigation and SEO defaults'}),
  },
})
