import {ProjectsIcon} from '@sanity/icons/Projects'
import {defineField, defineType} from 'sanity'
import {SANITY_API_VERSION} from '../../sanity.constants'

export const workPlacement = defineType({
  name: 'workPlacement',
  title: 'Front-gallery placement',
  type: 'object',
  icon: ProjectsIcon,
  fields: [
    defineField({
      name: 'asset',
      title: 'Gallery asset',
      type: 'reference',
      to: [{type: 'mediaItem'}],
      description: 'Choose any complete image or video Asset. Its linked Project controls the destination page.',
      options: {
        disableNew: true,
        filter: 'kind in ["image", "video"] && defined(project)',
      },
      validation: (Rule) => Rule.required().custom(async (value, context) => {
        if (!value || typeof value !== 'object' || !('_ref' in value)) return true
        const assetId = String((value as {_ref?: string})._ref || '').replace(/^drafts\./u, '')
        const eligible = await context.getClient({apiVersion: SANITY_API_VERSION}).fetch<boolean>(
          `count(*[
            _type == "mediaItem" &&
            _id == $assetId &&
            defined(project) &&
            kind in ["image", "video"] &&
            select(kind == "image" => defined(image.asset), defined(poster.asset)) &&
            (decorative == true || length(coalesce(alt, "")) > 0)
          ]) > 0`,
          {assetId},
        )
        return eligible ? true : 'Choose a complete visual Asset with a linked Project and accessibility text.'
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
      title: 'asset.project.title',
      media: 'asset.image',
      fallbackMedia: 'asset.poster',
      asset: 'asset.title',
      size: 'cardSize',
      treatment: 'treatment',
    },
    prepare: ({title, media, fallbackMedia, asset, size, treatment}) => ({
      title: title || 'Choose a gallery Asset',
      subtitle: [asset, size || 'standard', treatment !== 'standard' ? treatment : undefined]
        .filter(Boolean)
        .join(' · '),
      media: media || fallbackMedia,
    }),
  },
})
