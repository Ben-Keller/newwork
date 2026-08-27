import {LinkIcon} from '@sanity/icons/Link'
import {defineField, defineType} from 'sanity'

export const footerLink = defineType({
  name: 'footerLink',
  title: 'Footer link',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'label',
      title: 'Link label',
      type: 'string',
      validation: (Rule) => Rule.required().max(40),
    }),
    defineField({
      name: 'destination',
      title: 'Destination',
      type: 'string',
      options: {
        list: [
          {title: 'Work page', value: 'work'},
          {title: 'About page', value: 'about'},
          {title: 'Contact page', value: 'contact'},
          {title: 'External website', value: 'external'},
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'External URL',
      type: 'url',
      hidden: ({parent}) => parent?.destination !== 'external',
      validation: (Rule) =>
        Rule.uri({scheme: ['https']}).custom((value, context) =>
          (context.parent as {destination?: string} | undefined)?.destination !== 'external' || value
            ? true
            : 'Add the external URL.',
        ),
    }),
  ],
  preview: {
    select: {title: 'label', destination: 'destination', url: 'url'},
    prepare: ({title, destination, url}) => ({
      title: title || 'Untitled link',
      subtitle: destination === 'external' ? url : destination,
    }),
  },
})
