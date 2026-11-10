import {PlayIcon} from '@sanity/icons/Play'
import {defineField, defineType} from 'sanity'
import {hasAssetReference, isPlayableVideoAssetReference, isRecord} from '../validation'

export const splashSettings = defineType({
  name: 'splashSettings',
  title: 'Opening splash',
  type: 'object',
  icon: PlayIcon,
  description: 'The silent looping footage inside the opening New Work lettering. Leave both fields empty to keep the current automatic selection.',
  fields: [
    defineField({name: 'video', title: 'Splash video', type: 'editorialFile',
      description: 'Upload a short, compressed MP4 or WebM loop (5–15 seconds, up to 20 MB). Sound is always muted.',
      options: {accept: 'video/mp4,video/webm'},
      validation: Rule => Rule.custom(async (value, context) => {
        if (value === undefined) return true
        if (!isPlayableVideoAssetReference(value)) return 'Upload an MP4 or WebM video.'
        const ref = (value as {asset: {_ref: string}}).asset._ref
        const asset = await context.getClient({apiVersion: '2026-01-01'}).fetch<{size: number} | null>('*[_id == $id][0]{size}', {id: ref})
        return asset && asset.size <= 20 * 1024 * 1024 ? true : 'Use a compressed video no larger than 20 MB.'
      }),
    }),
    defineField({name: 'poster', title: 'Splash still image', type: 'editorialImage',
      description: 'A frame from the clip. Shown before playback and for visitors who prefer reduced motion.'}),
  ],
  validation: Rule => Rule.custom(value => {
    if (!isRecord(value) || (!value.video && !value.poster)) return true
    return isPlayableVideoAssetReference(value.video) && hasAssetReference(value.poster)
      ? true : 'Add both a Splash video and Splash still image, or clear both to restore the automatic selection.'
  }),
})
