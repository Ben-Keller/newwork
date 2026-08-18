import {defineArrayMember, defineField, defineType} from 'sanity'
import {safeEditorialLink} from '../../../shared/content-policy'

export const portableText = defineType({
  name: 'portableText',
  title: 'Portable text',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        {title: 'Normal', value: 'normal'},
        {title: 'Heading 2', value: 'h2'},
        {title: 'Heading 3', value: 'h3'},
        {title: 'Quote', value: 'blockquote'},
      ],
      lists: [
        {title: 'Bulleted', value: 'bullet'},
        {title: 'Numbered', value: 'number'},
      ],
      marks: {
        decorators: [
          {title: 'Strong', value: 'strong'},
          {title: 'Emphasis', value: 'em'},
        ],
        annotations: [
          defineField({
            name: 'link',
            title: 'Link',
            type: 'object',
            fields: [
              defineField({
                name: 'href',
                title: 'URL',
                type: 'string',
                description: 'Use HTTPS, a root-relative site path, or a mailto address.',
                validation: (Rule) => Rule.required().custom((value) =>
                  safeEditorialLink(value)
                    ? true
                    : 'Use an HTTPS URL, a root-relative path such as /about, or a valid mailto address.'),
              }),
              defineField({
                name: 'openInNewTab',
                title: 'Open in a new tab',
                type: 'boolean',
                initialValue: false,
              }),
            ],
          }),
        ],
      },
    }),
  ],
})
