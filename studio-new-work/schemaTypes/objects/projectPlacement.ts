import {ProjectsIcon} from '@sanity/icons/Projects'
import {defineField, defineType} from 'sanity'

export const workPlacement = defineType({
  name: 'workPlacement',
  title: 'Work-page placement',
  type: 'object',
  icon: ProjectsIcon,
  fields: [
    defineField({
      name: 'work',
      title: 'Work',
      type: 'reference',
      to: [{type: 'work'}],
      options: {
        disableNew: true,
        filter: 'editorialStatus in ["ready", "approved"]',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'doorwayPhoto',
      title: 'Photo doorway',
      type: 'reference',
      to: [{type: 'mediaItem'}],
      description: 'Optional. For Photo work, choose which image appears here and becomes the page hero when clicked.',
      options: {disableNew: true, filter: 'kind == "image"'},
      validation: (Rule) => Rule.custom(async (value, context) => {
        if (!value || typeof value !== 'object' || !('_ref' in value)) return true
        const parent = context.parent as {work?: {_ref?: string}} | undefined
        const workId = parent?.work?._ref
        const photoId = (value as {_ref?: string})._ref
        if (!workId || !photoId) return true
        const included = await context.getClient({apiVersion: '2025-02-19'}).fetch<boolean>(
          `count(*[_id == $workId && $photoId in photos[]._ref]) > 0`,
          {workId, photoId},
        )
        return included ? true : 'Choose a photo that belongs to this Work\'s Photoshoot images.'
      }),
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
      title: 'work.title',
      media: 'doorwayPhoto.image',
      fallbackMedia: 'work.cover.poster',
      photo: 'doorwayPhoto.title',
      size: 'cardSize',
      treatment: 'treatment',
    },
    prepare: ({title, media, fallbackMedia, photo, size, treatment}) => ({
      title: title || 'Choose a Work item',
      subtitle: [photo, size || 'standard', treatment !== 'standard' ? treatment : undefined]
        .filter(Boolean)
        .join(' · '),
      media: media || fallbackMedia,
    }),
  },
})
