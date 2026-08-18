import {defineField, defineType} from 'sanity'
import {documentIsVisible, isNonEmptyString} from '../validation'

export const imageItem = defineType({
  name: 'imageItem',
  title: 'Image',
  type: 'object',
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'internal', title: 'Internal review'},
  ],
  fields: [
    defineField({
      name: 'image',
      title: 'Image',
      type: 'editorialImage',
      group: 'content',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'alt',
      title: 'Alt text',
      type: 'string',
      group: 'content',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as {decorative?: boolean}
          if (!documentIsVisible(context) || parent?.decorative === true) return true
          return isNonEmptyString(value) ? true : 'Public images require meaningful alt text.'
        }),
    }),
    defineField({
      name: 'decorative',
      title: 'Decorative duplicate',
      type: 'boolean',
      group: 'content',
      description: 'Use only when nearby text already identifies the same subject.',
      initialValue: false,
    }),
    defineField({name: 'caption', title: 'Caption', type: 'string', group: 'content'}),
    defineField({name: 'credit', title: 'Credit', type: 'string', group: 'content'}),
    defineField({
      name: 'altNeedsReview',
      title: 'Alt text needs review',
      type: 'boolean',
      group: 'internal',
      initialValue: false,
      validation: (Rule) =>
        Rule.custom((value) =>
          value === true ? 'Supply reviewed alt text or deliberately mark this image decorative.' : true,
        ).warning(),
    }),
    defineField({name: 'prototypeOnly', title: 'Prototype only', type: 'boolean', group: 'internal', initialValue: false}),
    defineField({name: 'needsReview', title: 'Needs review', type: 'boolean', group: 'internal', initialValue: false}),
    defineField({
      name: 'doNotPublishWithoutExplicitApproval',
      title: 'Do not publish without explicit approval',
      type: 'boolean',
      group: 'internal',
      initialValue: false,
    }),
  ],
  preview: {
    select: {media: 'image', title: 'caption', alt: 'alt', needsReview: 'altNeedsReview'},
    prepare: ({media, title, alt, needsReview}) => ({
      media,
      title: title || alt || 'Untitled image',
      subtitle: needsReview ? 'Alt text needs review' : undefined,
    }),
  },
})

