export type MediaPath = `/media/${string}`;

export type ReelAsset = Readonly<{
  id: string;
  title: string;
  credit: string;
  poster: MediaPath;
  video?: MediaPath;
  alt: string;
  palette: `#${string}`;
  aspectRatio: number;
}>;

export type ReelStillAsset = Omit<ReelAsset, "video"> & {
  readonly video?: never;
};

/**
 * Deliberately sequenced to alternate motion, palette, scale, and subject.
 * Keep this order stable: the band choreography uses neighboring assets as
 * visual counterpoints while the reel winds onto the sphere.
 */
export const reelAssets = [
  {
    id: "adobe-what-whack-wears",
    title: "What Whack Wears",
    credit: "Motion",
    poster: "/media/images/anjali/anjali-adobe-portrait.webp",
    video:
      "/media/video-previews/anjali/adobe-what-whack-wears-gallery-cut-08s.mp4",
    alt: "Colorful performance imagery moving between a vivid stage and a fashion portrait.",
    palette: "#FA6B83",
    aspectRatio: 16 / 9,
  },
  {
    id: "dune-tansy",
    title: "Dune / Tansy",
    credit: "Lifestyle Photography",
    poster: "/media/images/michael/michael_dune_tansy.webp",
    alt: "Two people in colorful caps face a vivid green building.",
    palette: "#72A833",
    aspectRatio: 1800 / 1440,
  },
  {
    id: "humu-meet-holly",
    title: "Meet Holly",
    credit: "Motion",
    poster:
      "/media/images/oliver/humu-meet-holly/featured-frame-15.webp",
    video:
      "/media/video-previews/oliver/humu-meet-holly/gallery-cut-08s.mp4",
    alt: "Holly works at a laptop as colorful workplace graphics appear around her.",
    palette: "#839B86",
    aspectRatio: 16 / 9,
  },
  {
    id: "nanu-black-pot",
    title: "Nanu",
    credit: "Still Life",
    poster:
      "/media/images/michael/portfolio-expansion/michael-nanu-black-pot.webp",
    alt: "A glossy black pot rests against a deep black background.",
    palette: "#AD8447",
    aspectRatio: 1,
  },
  {
    id: "mercury-josh-fabian",
    title: "Mercury — Josh Fabian",
    credit: "Motion",
    poster:
      "/media/images/oliver/mercury-josh-fabian/featured-frame-11.webp",
    video:
      "/media/video-previews/oliver/mercury-josh-fabian/gallery-cut-08s.mp4",
    alt: "A man moves through nocturnal city scenes lit in deep blue and teal.",
    palette: "#126F82",
    aspectRatio: 16 / 9,
  },
  {
    id: "red-suit-portrait",
    title: "Red Suit",
    credit: "Portrait",
    poster:
      "/media/images/michael/portfolio-expansion/michael-8024096-red-suit.webp",
    alt: "A woman in a vivid red suit sits outdoors among plants and brickwork.",
    palette: "#DC3528",
    aspectRatio: 2083 / 1667,
  },
  {
    id: "stella-artois-daydream",
    title: "Stella Artois — Daydream",
    credit: "Motion",
    poster: "/media/images/anjali/anjali-stella-artois.webp",
    video:
      "/media/video-previews/anjali/stella-artois-daydream-gallery-cut-06s.mp4",
    alt: "A warm, dreamlike city scene shifts through pink and golden tones.",
    palette: "#D8487C",
    aspectRatio: 16 / 9,
  },
  {
    id: "court-study",
    title: "Court Study",
    credit: "Sports Photography",
    poster:
      "/media/images/michael/portfolio-expansion/michael-aw50519-court-bw.webp",
    alt: "A basketball player crosses an indoor court in black and white.",
    palette: "#B5B5B2",
    aspectRatio: 2185 / 1639,
  },
  {
    id: "toyota-olympics",
    title: "Toyota Olympics",
    credit: "Motion",
    poster:
      "/media/images/oliver/olympics-toyota-alex-massailas/featured-frame-6.webp",
    video:
      "/media/video-previews/oliver/olympics-toyota-alex-massailas/gallery-cut-08s.mp4",
    alt: "Fencers train and move through quiet cinematic sports portraits.",
    palette: "#667B89",
    aspectRatio: 16 / 9,
  },
  {
    id: "rainbow-pavement",
    title: "Rainbow Pavement",
    credit: "Editorial Photography",
    poster:
      "/media/images/michael/portfolio-expansion/michael-wow-rainbow-pavement.webp",
    alt: "A lone figure stands amid broad stripes of brightly colored pavement.",
    palette: "#E85D55",
    aspectRatio: 2200 / 1466,
  },
  {
    id: "brava",
    title: "Brava",
    credit: "Motion",
    poster: "/media/images/michael/michael_brava-poster.webp",
    video: "/media/video-previews/michael/michael_brava_clip.mp4",
    alt: "Ingredients rapidly rearrange inside a countertop oven seen from above.",
    palette: "#F2872D",
    aspectRatio: 1,
  },
  {
    id: "wedding-study",
    title: "Wedding Study",
    credit: "Documentary Photography",
    poster:
      "/media/images/michael/portfolio-expansion/michael-img8738-wedding-bw.webp",
    alt: "A celebratory wedding moment fills the frame in textured black and white.",
    palette: "#D0D0CD",
    aspectRatio: 2200 / 1821,
  },
  {
    id: "rakuten-duet",
    title: "Rakuten Duet",
    credit: "Motion",
    poster: "/media/images/anjali/anjali-rakuten-duet-frame.webp",
    video:
      "/media/video-previews/anjali/rakuten-duet-gallery-cut-08s.mp4",
    alt: "A dancing pair moves through a dark interior illuminated in teal and magenta.",
    palette: "#1CA7B7",
    aspectRatio: 16 / 9,
  },
  {
    id: "skincare-blue",
    title: "Skincare in Blue",
    credit: "Still Life",
    poster:
      "/media/images/michael/portfolio-expansion/michael-skincare-blue-still.webp",
    alt: "Skincare products rest on sculpted blue surfaces beside water and stone.",
    palette: "#3977B7",
    aspectRatio: 1360 / 2042,
  },
  {
    id: "tour-de-france",
    title: "Tour de France",
    credit: "Motion",
    poster:
      "/media/images/oliver/tour-de-france/featured-frame-5.webp",
    video:
      "/media/video-previews/oliver/tour-de-france/gallery-cut-08s.mp4",
    alt: "A cyclist and a pickup truck travel through forest roads and dusty terrain.",
    palette: "#697F55",
    aspectRatio: 16 / 9,
  },
  {
    id: "cradlewise-family",
    title: "Cradlewise",
    credit: "Lifestyle Photography",
    poster:
      "/media/images/michael/portfolio-expansion/michael-cradlewise-family.webp",
    alt: "Two parents sit with their baby in a softly lit nursery.",
    palette: "#CDB99E",
    aspectRatio: 4 / 3,
  },
  {
    id: "native-stop-motion",
    title: "Native — Stop Motion",
    credit: "Motion",
    poster:
      "/media/images/michael/michael_native_stop_motion-poster.webp",
    video:
      "/media/video-previews/michael/michael_native_stop_motion_clip.mp4",
    alt: "Native products shift through playful arrangements on a tiled blue set.",
    palette: "#52B8C1",
    aspectRatio: 1,
  },
  {
    id: "food-test-sandwich",
    title: "Food Test",
    credit: "Still Life",
    poster:
      "/media/images/michael/portfolio-expansion/michael-food-test-sandwich.webp",
    alt: "A sculptural sandwich is balanced on a pale block against a blue background.",
    palette: "#E3A260",
    aspectRatio: 4 / 5,
  },
  {
    id: "mercury-helen-mayer",
    title: "Mercury — Helen Mayer",
    credit: "Motion",
    poster:
      "/media/images/oliver/mercury-helen-mayer/featured-frame-13.webp",
    video:
      "/media/video-previews/oliver/mercury-helen-mayer/gallery-cut-08s.mp4",
    alt: "A mother and her children move through intimate, warmly lit domestic scenes.",
    palette: "#CAA883",
    aspectRatio: 16 / 9,
  },
  {
    id: "rainbow-cart-portrait",
    title: "Rainbow Cart",
    credit: "Portrait",
    poster:
      "/media/images/michael/portfolio-expansion/michael-rainbow-cart-portrait.webp",
    alt: "A smiling man stands with a red shopping cart beside a rainbow-painted plaza.",
    palette: "#E95D4D",
    aspectRatio: 1798 / 1438,
  },
  {
    id: "specialized-globe",
    title: "Specialized Globe",
    credit: "Motion",
    poster:
      "/media/images/michael/michael_specialized_globe-poster.webp",
    video:
      "/media/video-previews/michael/michael_specialized_globe_clip.mp4",
    alt: "A bicycle and its components form changing graphic arrangements on bright color fields.",
    palette: "#7C77CE",
    aspectRatio: 1,
  },
  {
    id: "molekule-bath",
    title: "Molekule",
    credit: "Interior Photography",
    poster:
      "/media/images/michael/portfolio-expansion/michael-molekule-bath.webp",
    alt: "A person relaxes in a bright freestanding bath beside a compact air purifier.",
    palette: "#C8C7BF",
    aspectRatio: 2195 / 1646,
  },
  {
    id: "native-product-study",
    title: "Native — Product Study",
    credit: "Motion",
    poster:
      "/media/images/michael/michael_native_portfolio_video-poster.webp",
    video:
      "/media/video-previews/michael/michael_native_portfolio_video_clip.mp4",
    alt: "A minimal black product silhouette emerges against a soft white background.",
    palette: "#E4E4E1",
    aspectRatio: 16 / 9,
  },
  {
    id: "uniform-portrait",
    title: "Uniform Portrait",
    credit: "Portrait",
    poster:
      "/media/images/michael/portfolio-expansion/michael-8023156-uniform-portrait.webp",
    alt: "A poised figure in a tailored uniform stands in sharp architectural sunlight.",
    palette: "#B89467",
    aspectRatio: 4 / 5,
  },
] as const satisfies readonly ReelAsset[];

/** High-resolution, compositionally varied stills for reduced-motion mode. */
export const reducedMotionFeaturedStills = [
  {
    id: "reduced-adobe-portrait",
    title: "What Whack Wears",
    credit: "Portrait",
    poster: "/media/images/anjali/anjali-adobe-portrait.webp",
    alt: "A performer in a reflective patterned outfit poses against white.",
    palette: "#FA6B83",
    aspectRatio: 750 / 626,
  },
  {
    id: "reduced-red-suit",
    title: "Red Suit",
    credit: "Portrait",
    poster:
      "/media/images/michael/portfolio-expansion/michael-8024096-red-suit.webp",
    alt: "A woman in a vivid red suit sits outdoors among plants and brickwork.",
    palette: "#DC3528",
    aspectRatio: 2083 / 1667,
  },
  {
    id: "reduced-rainbow-pavement",
    title: "Rainbow Pavement",
    credit: "Editorial Photography",
    poster:
      "/media/images/michael/portfolio-expansion/michael-wow-rainbow-pavement.webp",
    alt: "A lone figure stands amid broad stripes of brightly colored pavement.",
    palette: "#E85D55",
    aspectRatio: 2200 / 1466,
  },
  {
    id: "reduced-mercury-josh-fabian",
    title: "Mercury — Josh Fabian",
    credit: "Cinematic Still",
    poster:
      "/media/images/oliver/mercury-josh-fabian/featured-frame-11.webp",
    alt: "A man sits on a leather sofa under deep blue and red light.",
    palette: "#126F82",
    aspectRatio: 1240 / 698,
  },
  {
    id: "reduced-toyota-olympics",
    title: "Toyota Olympics",
    credit: "Cinematic Still",
    poster:
      "/media/images/oliver/olympics-toyota-alex-massailas/featured-frame-6.webp",
    alt: "Two fencers face each other in a dark training hall.",
    palette: "#667B89",
    aspectRatio: 1240 / 698,
  },
  {
    id: "reduced-tour-de-france",
    title: "Tour de France",
    credit: "Cinematic Still",
    poster:
      "/media/images/oliver/tour-de-france/featured-frame-5.webp",
    alt: "A cyclist loads a bicycle into a pickup truck in a forest clearing.",
    palette: "#697F55",
    aspectRatio: 1240 / 698,
  },
] as const satisfies readonly ReelStillAsset[];

