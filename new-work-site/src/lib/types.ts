export type ContentMode = 'prototype' | 'preview' | 'production';

export type ProjectType = 'Film' | 'Photography' | 'Campaign' | 'Animation' | 'BTS';
export type ProjectOwner = 'oliver' | 'michael' | 'collective' | 'other';
export type HomeCardSize = 'standard' | 'tall' | 'large' | 'wide';
export type HomeColumn = 1 | 2 | 3 | 4;
export type HomeTreatment = 'standard' | 'masked' | 'framed' | 'poster';
export type ProjectTheme = 'light' | 'warm' | 'dark' | 'accent';
export type TitleTreatment = 'standard' | 'stacked' | 'oversized' | 'split';
export type HeroTreatment = 'contained' | 'fullViewport' | 'split' | 'masked';
export type ProjectLayoutVariant = 'cinematic' | 'photoEssay' | 'campaign' | 'experimental';
export type MotionIntensity = 'low' | 'medium' | 'high';
export type NavigationDestination = 'work' | 'about' | 'notes' | 'contact';

export interface FocalPoint {
  x: number;
  y: number;
  needsReview?: boolean;
}

export interface ImageView {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption?: string;
  credit?: string;
  objectPosition?: string;
  needsReview?: boolean;
}

export interface VideoView {
  src?: string;
  mimeType?: 'video/mp4' | 'video/webm' | 'video/quicktime';
  poster?: ImageView;
  externalUrl?: string;
  provider?: 'vimeo' | 'youtube';
  providerId?: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  caption?: string;
  credit?: string;
  transcript?: string;
  captionsFile?: string;
  captionsLanguage?: string;
  captionsLabel?: string;
  accessibleDescription?: string;
  prototypeOnly?: boolean;
  needsApprovedEmbed?: boolean;
  sourceDurationSeconds?: number;
}

export interface CoverView {
  poster: ImageView;
  previewVideo?: string;
  previewPosterOverride?: ImageView;
  mobilePoster?: ImageView;
  mediaType: 'still' | 'motion';
  cardRatio: 'portrait' | 'wideFeature';
  previewIsPlaceholder?: boolean;
  focalPoint?: FocalPoint;
}

export interface BrandAssetView {
  src: string;
  width?: number;
  height?: number;
}

export interface RichTextSpanView {
  text: string;
  marks: Array<'strong' | 'em'>;
  link?: { href: string; openInNewTab: boolean };
}

export interface RichTextBlockView {
  _key: string;
  style: 'normal' | 'h2' | 'h3' | 'blockquote';
  listItem?: 'bullet' | 'number';
  level: number;
  spans: RichTextSpanView[];
}

export type RichTextView = RichTextBlockView[];

export interface Credit {
  _key?: string;
  label: string;
  value: string;
  url?: string;
}

export interface Contributor {
  _key?: string;
  name: string;
  role: string;
}

export interface BaseBlock {
  _key: string;
  _type: string;
  caption?: string;
  credit?: string;
}

export interface HeroImageBlock extends BaseBlock {
  _type: 'heroImage';
  image: ImageView;
  displayWidth?: 'contained' | 'wide' | 'fullBleed';
}

export interface HeroVideoBlock extends BaseBlock {
  _type: 'heroVideo';
  video: VideoView;
}

export interface FullBleedImageBlock extends BaseBlock {
  _type: 'fullBleedImage';
  image: ImageView;
}

export interface ContainedImageBlock extends BaseBlock {
  _type: 'containedImage';
  image: ImageView;
  width?: 'narrow' | 'medium' | 'wide';
  alignment?: 'left' | 'center' | 'right';
}

export interface ImagePairBlock extends BaseBlock {
  _type: 'imagePair';
  images: [ImageView, ImageView];
  ratioHandling?: 'natural' | 'matched' | 'crop';
}

export interface ImageGridBlock extends BaseBlock {
  _type: 'imageGrid';
  images: ImageView[];
  columns?: 2 | 3;
}

export interface VideoBlock extends BaseBlock {
  _type: 'video';
  video: VideoView;
}

export interface ShortLoopBlock extends BaseBlock {
  _type: 'shortLoop';
  video: VideoView;
  autoplayPolicy?: 'never' | 'inViewMuted';
}

export interface TextNoteBlock extends BaseBlock {
  _type: 'textNote';
  text: string;
  richText?: RichTextView;
  alignment?: 'left' | 'center' | 'right';
  maxWidth?: 'narrow' | 'medium' | 'wide';
}

export interface CaptionBlock extends BaseBlock {
  _type: 'caption';
  text: string;
  association?: 'previous' | 'next';
}

export type ContentBlockView =
  | HeroImageBlock
  | HeroVideoBlock
  | FullBleedImageBlock
  | ContainedImageBlock
  | ImagePairBlock
  | ImageGridBlock
  | VideoBlock
  | ShortLoopBlock
  | TextNoteBlock
  | CaptionBlock;

export interface SeoFields {
  metaTitle?: string;
  metaDescription?: string;
  shareImage?: ImageView;
  shareImageAlt?: string;
  noIndex?: boolean;
}

export interface ProjectView {
  id: string;
  title: string;
  slug: string;
  owner: ProjectOwner;
  client?: string;
  year?: number;
  types: ProjectType[];
  role?: string;
  contributors: Contributor[];
  shortDescription?: string;
  cover: CoverView;
  contentBlocks: ContentBlockView[];
  credits: Credit[];
  whatWeDid: string[];
  featuredOnHome: boolean;
  homeOrder: number;
  homeCardSize: HomeCardSize;
  homeColumn?: HomeColumn;
  homeOffset: number;
  homeTreatment: HomeTreatment;
  projectTheme: ProjectTheme;
  accentColor?: string;
  titleTreatment: TitleTreatment;
  heroTreatment: HeroTreatment;
  layoutVariant: ProjectLayoutVariant;
  motionIntensity: MotionIntensity;
  editorialStatus: 'draft' | 'review' | 'ready' | 'approved';
  visible: boolean;
  publishAt?: string;
  needsReview: boolean;
  doNotPublishWithoutExplicitApproval: boolean;
  seo?: SeoFields;
}

export interface WorkGalleryPlacementView {
  _key: string;
  projectId: string;
  cardSize: HomeCardSize;
  treatment: HomeTreatment;
}

export interface FooterLineView {
  _key?: string;
  text: string;
  emphasis?: string;
}

export interface FooterSettingsView {
  strapline: FooterLineView[];
  peopleHeading: string;
  exploreHeading: string;
  connectHeading: string;
  exploreLinks: Array<{
    _key?: string;
    label: string;
    destination: NavigationDestination | 'external';
    url?: string;
  }>;
  contactLabel?: string;
  copyrightLine: string;
  showYear: boolean;
}

export interface ReelView {
  enabled: boolean;
  poster?: ImageView;
  desktopSource?: string;
  mobileSource?: string;
  caption?: string;
  credits?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  aspectRatio?: string;
}

export interface AboutWorkView {
  _key: string;
  title: string;
  client?: string;
  href?: string;
  image: ImageView;
  needsReview: boolean;
  prototypeOnly: boolean;
  doNotPublishWithoutExplicitApproval: boolean;
}

export interface AboutPersonView {
  _key: string;
  name: string;
  projectOwner: ProjectOwner;
  roleLabel?: string;
  bio: RichTextView;
  selectedWork: AboutWorkView[];
  needsReview: boolean;
  prototypeOnly: boolean;
  doNotPublishWithoutExplicitApproval: boolean;
}

export interface SiteSettingsView {
  siteName: string;
  navigation: Array<{
    _key?: string;
    label: string;
    destination: NavigationDestination;
    visible: boolean;
  }>;
  workIntroName: string;
  workGallery?: WorkGalleryPlacementView[];
  wordmark?: BrandAssetView;
  compactMark?: BrandAssetView;
  manifesto?: string;
  manifestoNeedsReview?: boolean;
  about?: RichTextView;
  aboutHeading: string;
  aboutPeopleHeading: string;
  aboutPeopleIntroduction?: string;
  aboutImage?: ImageView;
  aboutPeople: AboutPersonView[];
  aboutSeo?: SeoFields;
  contactSeo?: SeoFields;
  contactHeading: string;
  contactIntroduction?: RichTextView;
  capabilities: string[];
  contactEmail?: string;
  location?: string;
  socialLinks: Array<{ _key?: string; label: string; url: string }>;
  reel: ReelView;
  notesEnabled: boolean;
  defaultSeo: SeoFields;
  footer: FooterSettingsView;
}

export interface NoteView {
  id: string;
  title: string;
  slug: string;
  date: string;
  summary: string;
  media: ImageView | VideoView;
  body?: RichTextView;
  seo?: SeoFields;
}

export interface SiteContent {
  mode: ContentMode;
  settings: SiteSettingsView;
  projects: ProjectView[];
  notes: NoteView[];
}

export interface AttributionRecord {
  id: string;
  person: string;
  project: string;
  assetLayer: string;
  kind: string;
  path: string;
  derivedFrom: string;
  formatOrCodec: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  sourceReportedDimensionsOrDuration: string;
  sourcePage: string;
  sourceAssetUrl: string;
  derivation: string;
  rightsStatus: string;
  usageStatus: string;
  notes: string;
  checksum: string;
}
