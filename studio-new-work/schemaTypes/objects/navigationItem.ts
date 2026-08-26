import {LinkIcon} from '@sanity/icons/Link'
import {defineField, defineType} from 'sanity'

export const navigationItem = defineType({
  name: 'navigationItem',
  title: 'Navigation link',
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
          {title: 'Work', value: 'work'},
          {title: 'About', value: 'reel'},
          {title: 'Contact', value: 'contact'},
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'visible',
      title: 'Show this link',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  preview: {
    select: {title: 'label', destination: 'destination', visible: 'visible'},
    prepare: ({title, destination, visible}) => ({
      title: title || 'Untitled link',
      subtitle: `${destination || 'Choose a destination'}${visible === false ? ' · hidden' : ''}`,
    }),
  },
})
