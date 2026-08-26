import {ProjectsIcon} from '@sanity/icons/Projects'
import {defineField, defineType} from 'sanity'

export const projectPlacement = defineType({
  name: 'projectPlacement',
  title: 'Gallery project',
  type: 'object',
  icon: ProjectsIcon,
  fields: [
    defineField({
      name: 'project',
      title: 'Project',
      type: 'reference',
      to: [{type: 'project'}],
      options: {
        disableNew: true,
        filter: 'editorialStatus in ["ready", "approved"]',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'cardSize',
      title: 'Card size',
      type: 'string',
      description: 'Choose the editorial emphasis. The website handles responsive placement automatically.',
      initialValue: 'standard',
      options: {
        list: [
          {title: 'Standard', value: 'standard'},
          {title: 'Tall', value: 'tall'},
          {title: 'Large', value: 'large'},
          {title: 'Wide feature', value: 'wide'},
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'treatment',
      title: 'Card treatment',
      type: 'string',
      initialValue: 'standard',
      options: {
        list: [
          {title: 'Standard', value: 'standard'},
          {title: 'Masked', value: 'masked'},
          {title: 'Framed', value: 'framed'},
          {title: 'Poster', value: 'poster'},
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'project.title',
      media: 'project.cover.poster',
      size: 'cardSize',
      treatment: 'treatment',
    },
    prepare: ({title, media, size, treatment}) => ({
      title: title || 'Choose a project',
      subtitle: [size || 'standard', treatment !== 'standard' ? treatment : undefined]
        .filter(Boolean)
        .join(' · '),
      media,
    }),
  },
})
