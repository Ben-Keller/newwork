import type {
  CaptionBlock,
  ContentBlockView,
  HeroTreatment,
  HeroImageBlock,
  MotionIntensity,
  ProjectLayoutVariant,
  ProjectTheme,
  ProjectView,
  ShortLoopBlock,
  TitleTreatment,
} from './types';

const layoutVariants = new Set<ProjectLayoutVariant>([
  'cinematic',
  'photoEssay',
  'campaign',
  'experimental',
]);
const projectThemes = new Set<ProjectTheme>(['light', 'warm', 'dark', 'accent']);
const titleTreatments = new Set<TitleTreatment>(['standard', 'stacked', 'oversized', 'split']);
const heroTreatments = new Set<HeroTreatment>(['contained', 'fullViewport', 'split', 'masked']);
const motionIntensities = new Set<MotionIntensity>(['low', 'medium', 'high']);
const projectMediaTypes = new Set<ContentBlockView['_type']>([
  'heroImage',
  'heroVideo',
  'fullBleedImage',
  'containedImage',
  'imagePair',
  'imageGrid',
  'video',
  'shortLoop',
]);

export type ProjectMediaBlock = Exclude<ContentBlockView, CaptionBlock | Extract<ContentBlockView, { _type: 'textNote' }>>;

export interface ProjectContentSplit {
  heroBlock: ProjectMediaBlock;
  heroCaptions: CaptionBlock[];
  bodyBlocks: ContentBlockView[];
}

export interface ProjectPresentation {
  layoutVariant: ProjectLayoutVariant;
  projectTheme: ProjectTheme;
  accentColor?: string;
  titleTreatment: TitleTreatment;
  heroTreatment: HeroTreatment;
  motionIntensity: MotionIntensity;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const hasText = (value: unknown): value is string => (
  typeof value === 'string' && value.trim().length > 0
);

const isImage = (value: unknown) => {
  if (!isRecord(value)) return false;
  return hasText(value.src)
    && typeof value.width === 'number'
    && value.width > 0
    && typeof value.height === 'number'
    && value.height > 0;
};

const isVideo = (value: unknown) => {
  if (!isRecord(value)) return false;
  const hasProvider = hasText(value.provider) && hasText(value.providerId);
  return hasText(value.src)
    || hasText(value.externalUrl)
    || isImage(value.poster)
    || hasProvider;
};

export const isRenderableProjectBlock = (value: unknown): value is ContentBlockView => {
  if (!isRecord(value) || !hasText(value._key) || !hasText(value._type)) return false;

  switch (value._type) {
    case 'heroImage':
    case 'fullBleedImage':
    case 'containedImage':
      return isImage(value.image);
    case 'heroVideo':
    case 'video':
    case 'shortLoop':
      return isVideo(value.video);
    case 'imagePair':
      return Array.isArray(value.images)
        && value.images.length >= 2
        && value.images.every(isImage);
    case 'imageGrid':
      return Array.isArray(value.images)
        && value.images.length > 0
        && value.images.every(isImage);
    case 'textNote':
      return hasText(value.text)
        || (Array.isArray(value.richText) && value.richText.length > 0);
    case 'caption':
      return hasText(value.text);
    default:
      return false;
  }
};

export const renderableProjectBlocks = (blocks: unknown): ContentBlockView[] => (
  Array.isArray(blocks) ? blocks.filter(isRenderableProjectBlock) : []
);

export const isProjectMediaBlock = (block: ContentBlockView): block is ProjectMediaBlock => (
  projectMediaTypes.has(block._type)
);

const isSingleImageBlock = (
  block: ContentBlockView,
): block is Extract<ContentBlockView, { _type: 'heroImage' | 'fullBleedImage' | 'containedImage' }> => (
  block._type === 'heroImage' || block._type === 'fullBleedImage' || block._type === 'containedImage'
);

const isVideoBlock = (
  block: ContentBlockView,
): block is Extract<ContentBlockView, { _type: 'heroVideo' | 'video' | 'shortLoop' }> => (
  block._type === 'heroVideo' || block._type === 'video' || block._type === 'shortLoop'
);

const makeCoverHero = (project: ProjectView): ProjectMediaBlock => {
  if (project.cover.mediaType === 'motion' && project.cover.previewVideo) {
    return {
      _key: `${project.slug}-cover-hero`,
      _type: 'shortLoop',
      autoplayPolicy: 'inViewMuted',
      video: {
        src: project.cover.previewVideo,
        poster: project.cover.poster,
        width: project.cover.poster.width,
        height: project.cover.poster.height,
        aspectRatio: `${project.cover.poster.width} / ${project.cover.poster.height}`,
        accessibleDescription: `${project.title} project preview`,
        prototypeOnly: project.cover.previewIsPlaceholder,
      },
    } satisfies ShortLoopBlock;
  }

  return {
    _key: `${project.slug}-cover-hero`,
    _type: 'heroImage',
    image: project.cover.poster,
    displayWidth: 'contained',
  } satisfies HeroImageBlock;
};

const isCoverEquivalentBlock = (project: ProjectView, block: ContentBlockView): boolean => {
  if (isSingleImageBlock(block)) return block.image.src === project.cover.poster.src;
  if (!isVideoBlock(block)) return false;

  const hasDistinctPlayback = Boolean(
    block.video.provider
    || block.video.providerId
    || block.video.externalUrl
    || (block.video.src && block.video.src !== project.cover.previewVideo),
  );
  if (hasDistinctPlayback) return false;

  return Boolean(
    (project.cover.previewVideo && block.video.src === project.cover.previewVideo)
    || (block.video.poster?.src && block.video.poster.src === project.cover.poster.src),
  );
};

const captionTargetIndex = (blocks: ContentBlockView[], captionIndex: number): number | undefined => {
  const caption = blocks[captionIndex];
  if (!caption || caption._type !== 'caption') return undefined;
  const direction = caption.association === 'next' ? 1 : -1;
  let candidate = captionIndex + direction;
  while (candidate >= 0 && candidate < blocks.length && !isProjectMediaBlock(blocks[candidate]!)) {
    candidate += direction;
  }
  return candidate >= 0 && candidate < blocks.length ? candidate : undefined;
};

/**
 * The homepage cover is the project-page hero. Cover-equivalent legacy blocks
 * are removed from the lower narrative so the opening visual is never repeated.
 * Distinct films that merely share the poster remain in the body stream.
 */
export const splitProjectContent = (
  project: ProjectView,
  blocks: ContentBlockView[] = renderableProjectBlocks(project.contentBlocks),
): ProjectContentSplit => {
  const duplicateIndexes = new Set<number>();
  blocks.forEach((block, index) => {
    if (isCoverEquivalentBlock(project, block)) duplicateIndexes.add(index);
  });

  const captionIndexes = new Set<number>();
  const heroCaptions: CaptionBlock[] = [];
  blocks.forEach((block, index) => {
    if (block._type !== 'caption') return;
    const target = captionTargetIndex(blocks, index);
    if (target !== undefined && duplicateIndexes.has(target)) {
      captionIndexes.add(index);
      heroCaptions.push(block);
    }
  });

  return {
    heroBlock: makeCoverHero(project),
    heroCaptions,
    bodyBlocks: blocks.filter((_, index) => !duplicateIndexes.has(index) && !captionIndexes.has(index)),
  };
};

const inferLayoutVariant = (project: ProjectView): ProjectLayoutVariant => {
  if (project.types.includes('Campaign')) return 'campaign';
  if (project.types.includes('Film')) return 'cinematic';
  if (project.types.includes('Photography')) return 'photoEssay';
  return 'campaign';
};

const defaultTitleTreatment = (variant: ProjectLayoutVariant): TitleTreatment => {
  if (variant === 'experimental') return 'split';
  if (variant === 'cinematic') return 'oversized';
  if (variant === 'photoEssay') return 'stacked';
  return 'standard';
};

const defaultHeroTreatment = (variant: ProjectLayoutVariant): HeroTreatment => {
  if (variant === 'cinematic') return 'fullViewport';
  if (variant === 'experimental') return 'masked';
  if (variant === 'campaign') return 'split';
  return 'contained';
};

export const resolveProjectPresentation = (project: ProjectView): ProjectPresentation => {
  const raw = project as unknown as Record<string, unknown>;
  const layoutVariant = layoutVariants.has(raw.layoutVariant as ProjectLayoutVariant)
    ? raw.layoutVariant as ProjectLayoutVariant
    : inferLayoutVariant(project);
  const accentColor = hasText(raw.accentColor) && /^#[\da-f]{6}$/iu.test(raw.accentColor)
    ? raw.accentColor
    : undefined;

  return {
    layoutVariant,
    projectTheme: projectThemes.has(raw.projectTheme as ProjectTheme)
      ? raw.projectTheme as ProjectTheme
      : 'light',
    accentColor,
    titleTreatment: titleTreatments.has(raw.titleTreatment as TitleTreatment)
      ? raw.titleTreatment as TitleTreatment
      : defaultTitleTreatment(layoutVariant),
    heroTreatment: heroTreatments.has(raw.heroTreatment as HeroTreatment)
      ? raw.heroTreatment as HeroTreatment
      : defaultHeroTreatment(layoutVariant),
    motionIntensity: motionIntensities.has(raw.motionIntensity as MotionIntensity)
      ? raw.motionIntensity as MotionIntensity
      : 'medium',
  };
};

export const projectPresentationStyle = (presentation: ProjectPresentation) => (
  presentation.accentColor ? `--project-accent:${presentation.accentColor}` : undefined
);
