import {defineField, defineType} from 'sanity'

export const seoFields = defineType({
  name: 'seoFields',
  title: 'SEO',
  type: 'object',
  fields: [
    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      description: 'Recommended maximum: 60 characters.',
      validation: (Rule) => Rule.max(60).warning('Keep the meta title at or below 60 characters.'),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      description: 'Recommended maximum: 160 characters.',
      validation: (Rule) =>
        Rule.max(160).warning('Keep the meta description at or below 160 characters.'),
    }),
    defineField({
      name: 'shareImage',
      title: 'Share image',
      type: 'editorialImage',
      description: 'Use a confirmed image with a 1.91:1-safe crop.',
    }),
    defineField({
      name: 'shareImageAlt',
      title: 'Share image alt text',
      type: 'string',
      description: 'A concise description used by social previews and accessibility tooling.',
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: 'noIndex',
      title: 'Exclude from search engines',
      type: 'boolean',
      initialValue: false,
    }),
  ],
})
