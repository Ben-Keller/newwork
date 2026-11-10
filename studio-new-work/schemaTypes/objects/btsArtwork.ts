import {ImageIcon} from '@sanity/icons/Image'
import {defineField, defineType} from 'sanity'

export const btsArtwork = defineType({
  name: 'btsArtwork', title: 'Pinboard artwork', type: 'object', icon: ImageIcon,
  fields: [
    defineField({name: 'title', title: 'Name', type: 'string', description: 'For finding this artwork in Studio; not displayed on the website.', validation: Rule => Rule.required().max(80)}),
    defineField({name: 'image', title: 'Artwork', type: 'editorialImage', description: 'Upload a sketch, storyboard or graphic. Transparent PNG or WebP works well. The full image is shown.', validation: Rule => Rule.required()}),
    defineField({name: 'afterPhoto', title: 'Place after photo', type: 'number', initialValue: 2, description: '0 = before the first photo. If the number exceeds the photos shown, artwork goes at the end. Artwork sharing a position follows this list’s order.', validation: Rule => Rule.required().integer().min(0).max(24)}),
    defineField({name: 'size', title: 'Size', type: 'string', initialValue: 'standard', options: {list: [{title: 'Standard', value: 'standard'}, {title: 'Large', value: 'large'}], layout: 'radio'}}),
    defineField({name: 'tilt', title: 'Tilt', type: 'string', initialValue: 'right', options: {list: [{title: 'Left', value: 'left'}, {title: 'Straight', value: 'straight'}, {title: 'Right', value: 'right'}], layout: 'radio'}}),
    defineField({name: 'hidden', title: 'Hide artwork', type: 'boolean', initialValue: false}),
  ],
  preview: {select: {title: 'title', media: 'image', position: 'afterPhoto', hidden: 'hidden'}, prepare: ({title, media, position, hidden}) => ({title: title || 'Artwork', media, subtitle: hidden ? 'Hidden' : `After photo ${position ?? 2}`})},
})
