import {defineField, defineType} from 'sanity'

export const aboutWork = defineType({
  name: 'aboutWork',
  title: 'About portfolio media',
  type: 'object',
  groups: [
    {name: 'content', title: 'Work', default: true},
    {name: 'internal', title: 'Internal review'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Project title',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.required().max(100),
    }),
    defineField({
      name: 'client',
      title: 'Client',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.max(100),
    }),
    defineField({
      name: 'url',
      title: 'Portfolio URL',
      type: 'url',
      group: 'content',
      validation: (Rule) => Rule.uri({scheme: ['https']}),
    }),
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
      description: 'Leave blank when the adjacent visible project title provides the image identity.',
      validation: (Rule) => Rule.max(220),
    }),
    defineField({
      name: 'needsReview',
      title: 'Needs review',
      type: 'boolean',
      group: 'internal',
      initialValue: true,
    }),
    defineField({
      name: 'prototypeOnly',
      title: 'Prototype only',
      type: 'boolean',
      group: 'internal',
      initialValue: true,
    }),
    defineField({
      name: 'doNotPublishWithoutExplicitApproval',
      title: 'Do not publish without explicit approval',
      type: 'boolean',
      group: 'internal',
      initialValue: true,
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'client', media: 'image'},
  },
})
