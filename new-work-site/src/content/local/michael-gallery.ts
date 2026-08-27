import type { ImageView, ProjectView, WorkPhotoView } from '../../lib/types';
import { withBase } from '../../lib/base-path';

const image = (filename: string, width: number, height: number, objectPosition = '50% 50%'): ImageView => ({
  src: withBase(`/media/images/michael/portfolio-expansion/${filename}.webp`),
  width,
  height,
  alt: '',
  objectPosition,
  needsReview: true,
});

const selectedImage = (filename: string, width: number, height: number, objectPosition = '50% 50%'): ImageView => ({
  src: withBase(`/media/images/michael/${filename}.webp`),
  width,
  height,
  alt: '',
  objectPosition,
  needsReview: true,
});

// Prototype-only portfolio edit. These files are already provenance-tracked in
// the asset manifest but intentionally remain unnamed until editorial review.
export const michaelWorkPhotos = [
  { id: 'michael-poolside-product', label: 'Michael — selected work', image: image('michael-poolside-product', 1440, 1800) },
  { id: 'michael-wow-rainbow-pavement', label: 'Michael — selected work', image: image('michael-wow-rainbow-pavement', 2200, 1466) },
  { id: 'michael-food-test-sandwich', label: 'Michael — selected work', image: image('michael-food-test-sandwich', 1760, 2200) },
  { id: 'michael-aw50273-dark-portrait', label: 'Michael — selected work', image: image('michael-aw50273-dark-portrait', 1929, 1543) },
  { id: 'michael-ad-interior', label: 'Michael — selected work', image: image('michael-ad-interior', 1603, 1069) },
  { id: 'michael-rainbow-cart-portrait', label: 'Michael — selected work', image: image('michael-rainbow-cart-portrait', 1798, 1438) },
  { id: 'michael-nanu-black-pot', label: 'Michael — selected work', image: image('michael-nanu-black-pot', 1667, 1667) },
  { id: 'michael-8023156-uniform-portrait', label: 'Michael — selected work', image: image('michael-8023156-uniform-portrait', 1760, 2200, '50% 42%') },
  { id: 'michael-cradlewise-family', label: 'Michael — selected work', image: image('michael-cradlewise-family', 2200, 1650) },
  { id: 'michael-native-haircare-cupcakes', label: 'Michael — selected work', image: image('michael-native-haircare-cupcakes', 1080, 1080) },
  { id: 'michael-aw50519-court-bw', label: 'Michael — selected work', image: image('michael-aw50519-court-bw', 2185, 1639) },
  { id: 'michael-skincare-blue-still', label: 'Michael — selected work', image: image('michael-skincare-blue-still', 1360, 2042) },
  { id: 'michael-8024096-red-suit', label: 'Michael — selected work', image: image('michael-8024096-red-suit', 2083, 1667) },
  { id: 'michael-molekule-bath', label: 'Michael — selected work', image: image('michael-molekule-bath', 2195, 1646) },
  { id: 'michael-aw59596-double-exposure', label: 'Michael — selected work', image: image('michael-aw59596-double-exposure', 854, 1280) },
  { id: 'michael-green-exterior-pair', label: 'Michael — selected work', image: image('michael-green-exterior-pair', 2073, 1659) },
  { id: 'michael-product-popcorn', label: 'Michael — selected work', image: image('michael-product-popcorn', 1626, 2040) },
  { id: 'michael-img8738-wedding-bw', label: 'Michael — selected work', image: image('michael-img8738-wedding-bw', 2200, 1821) },
  { id: 'michael-sports-product-graphic', label: 'Michael — selected work', image: image('michael-sports-product-graphic', 1226, 1533) },
  { id: 'michael-aw51026-court-portrait', label: 'Michael — selected work', image: image('michael-aw51026-court-portrait', 1633, 1633) },
  { id: 'michael-rob-summerlin-curlers', label: 'Michael — selected work', image: image('michael-rob-summerlin-curlers', 1665, 1665) },
  { id: 'michael-aw59536-group', label: 'Michael — selected work', image: image('michael-aw59536-group', 2200, 2200) },
  { id: 'michael-img7198-portrait', label: 'Michael — selected work', image: image('michael-img7198-portrait', 1295, 1295) },
  { id: 'michael-aw59665-double-exposure', label: 'Michael — selected work', image: image('michael-aw59665-double-exposure', 2200, 2200) },
  { id: 'michael-native-stop-motion-still', label: 'Michael — selected work', image: selectedImage('michael_native_stop_motion-poster', 1166, 1166) },
] as const;

/**
 * Prototype photography now follows the same Work contract as every other
 * portfolio item. Individual images are doorways into this one photo Work;
 * they are not standalone gallery records or standalone pages.
 */
export const michaelPhotoWork: ProjectView = {
  id: 'work.michael-selected-photography',
  title: 'Michael — Selected Photography',
  slug: 'michael-selected-photography',
  owner: 'michael',
  types: ['Photography'],
  template: 'photo',
  assets: [],
  photos: michaelWorkPhotos.map((item): WorkPhotoView => ({
    id: item.id,
    title: item.label,
    image: item.image,
  })),
  defaultPhotoId: michaelWorkPhotos[0]?.id,
  cover: {
    poster: michaelWorkPhotos[0]!.image,
    mediaType: 'still',
    cardRatio: 'portrait',
  },
  contributors: [],
  shortDescription: 'A selection of photography by Michael.',
  contentBlocks: [],
  credits: [],
  whatWeDid: ['Photography'],
  featuredOnHome: true,
  homeOrder: 2,
  homeCardSize: 'standard',
  homeOffset: 0,
  homeTreatment: 'standard',
  projectTheme: 'warm',
  titleTreatment: 'stacked',
  heroTreatment: 'contained',
  layoutVariant: 'photoEssay',
  motionIntensity: 'medium',
  editorialStatus: 'review',
  visible: false,
  needsReview: true,
  doNotPublishWithoutExplicitApproval: false,
  seo: {noIndex: true},
};
