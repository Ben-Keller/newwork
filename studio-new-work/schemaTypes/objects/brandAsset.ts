import {ImageIcon} from '@sanity/icons/Image'
import {defineField, defineType} from 'sanity'
import {hasAssetReference, isBrandFileAssetReference, isRecord} from '../validation'

export const brandAsset = defineType({
  name: 'brandAsset',
  title: 'Brand asset',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({
      name: 'format',
      title: 'Format',
      type: 'string',
      initialValue: 'image',
      options: {
        list: [
          {title: 'PNG/image', value: 'image'},
          {title: 'SVG/file', value: 'file'},
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'PNG/image',
      type: 'editorialImage',
      hidden: ({parent}) => parent?.format !== 'image',
    }),
    defineField({
      name: 'file',
      title: 'SVG/file',
      type: 'editorialFile',
      hidden: ({parent}) => parent?.format !== 'file',
    }),
  ],
  validation: (Rule) =>
    Rule.custom((value) => {
      if (!isRecord(value)) return true
      if (value.format === 'image') return hasAssetReference(value.image) ? true : 'Choose an image.'
      if (value.format === 'file') return isBrandFileAssetReference(value.file) ? true : 'Choose an SVG or PNG file.'
      return 'Choose a brand asset format.'
    }),
})
