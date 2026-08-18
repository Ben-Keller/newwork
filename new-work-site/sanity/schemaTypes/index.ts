import {caption} from './blocks/caption'
import {containedImage} from './blocks/containedImage'
import {fullBleedImage} from './blocks/fullBleedImage'
import {heroImage} from './blocks/heroImage'
import {heroVideo} from './blocks/heroVideo'
import {imageGrid} from './blocks/imageGrid'
import {imagePair} from './blocks/imagePair'
import {shortLoop} from './blocks/shortLoop'
import {textNote} from './blocks/textNote'
import {video} from './blocks/video'
import {note} from './documents/note'
import {project} from './documents/project'
import {siteSettings} from './documents/siteSettings'
import {brandAsset} from './objects/brandAsset'
import {aboutPerson} from './objects/aboutPerson'
import {aboutWork} from './objects/aboutWork'
import {contributor} from './objects/contributor'
import {coverMedia} from './objects/coverMedia'
import {credit} from './objects/credit'
import {editorialFile} from './objects/editorialFile'
import {editorialImage} from './objects/editorialImage'
import {focalPoint} from './objects/focalPoint'
import {imageItem} from './objects/imageItem'
import {mediaAsset} from './objects/mediaAsset'
import {portableText} from './objects/portableText'
import {reelSettings} from './objects/reelSettings'
import {seoFields} from './objects/seoFields'
import {socialLink} from './objects/socialLink'

export const schemaTypes = [
  siteSettings,
  project,
  note,
  portableText,
  aboutPerson,
  aboutWork,
  brandAsset,
  editorialImage,
  editorialFile,
  focalPoint,
  socialLink,
  contributor,
  credit,
  seoFields,
  reelSettings,
  coverMedia,
  mediaAsset,
  imageItem,
  heroImage,
  heroVideo,
  fullBleedImage,
  containedImage,
  imagePair,
  imageGrid,
  video,
  shortLoop,
  textNote,
  caption,
]
