import {defineField, defineType} from 'sanity'

export const focalPoint = defineType({
  name: 'focalPoint',
  title: 'Fixture focal point',
  type: 'object',
  description: 'Normalized fallback mirrored into the Sanity image hotspot by the seed importer.',
  fields: [
    defineField({
      name: 'x',
      title: 'Horizontal position',
      type: 'number',
      validation: (Rule) => Rule.required().min(0).max(1),
    }),
    defineField({
      name: 'y',
      title: 'Vertical position',
      type: 'number',
      validation: (Rule) => Rule.required().min(0).max(1),
    }),
    defineField({
      name: 'needsReview',
      title: 'Crop needs review',
      type: 'boolean',
      initialValue: true,
      validation: (Rule) =>
        Rule.custom((value) =>
          value === true ? 'Tune the crop in Studio, then clear this flag.' : true,
        ).warning(),
    }),
  ],
  preview: {
    select: {x: 'x', y: 'y', needsReview: 'needsReview'},
    prepare: ({x, y, needsReview}) => ({
      title: `x ${Number(x ?? 0.5).toFixed(2)}, y ${Number(y ?? 0.5).toFixed(2)}`,
      subtitle: needsReview ? 'Needs crop review' : 'Reviewed',
    }),
  },
})

