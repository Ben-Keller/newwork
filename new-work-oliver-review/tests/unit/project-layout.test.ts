import { describe, expect, it } from 'vitest';
import { getFixtureProjects } from '../../src/lib/content';
import {
  renderableProjectBlocks,
  resolveProjectPresentation,
  splitProjectContent,
} from '../../src/lib/project-layout';
import type { ProjectView } from '../../src/lib/types';

describe('project presentation routing', () => {
  it('routes featured Work through the longer campaign presentation and keeps safe art direction', () => {
    const fixture = getFixtureProjects()[0]!;
    const project = {
      ...fixture,
      template: 'featured',
      layoutVariant: 'experimental',
      projectTheme: 'accent',
      accentColor: '#A1B2C3',
      titleTreatment: 'split',
      heroTreatment: 'masked',
      motionIntensity: 'high',
    } satisfies ProjectView;

    expect(resolveProjectPresentation(project)).toEqual({
      layoutVariant: 'campaign',
      projectTheme: 'accent',
      accentColor: '#A1B2C3',
      titleTreatment: 'split',
      heroTreatment: 'masked',
      motionIntensity: 'high',
    });
  });

  it('infers a safe non-experimental layout for legacy records', () => {
    const fixture = getFixtureProjects().find((project) => project.types.includes('Film'))!;
    const project = {
      ...fixture,
      layoutVariant: undefined,
      projectTheme: undefined,
      accentColor: 'red; background: black',
      titleTreatment: undefined,
      heroTreatment: undefined,
      motionIntensity: undefined,
    } as unknown as ProjectView;

    expect(resolveProjectPresentation(project)).toEqual({
      layoutVariant: 'cinematic',
      projectTheme: 'light',
      accentColor: undefined,
      titleTreatment: 'oversized',
      heroTreatment: 'fullViewport',
      motionIntensity: 'medium',
    });
  });
});

describe('project block resilience', () => {
  it('keeps complete content blocks and removes empty or unknown ones', () => {
    const blocks = renderableProjectBlocks([
      {
        _key: 'image',
        _type: 'containedImage',
        image: { src: '/image.webp', width: 1200, height: 800, alt: 'A still' },
      },
      { _key: 'empty-video', _type: 'video', video: {} },
      { _key: 'empty-caption', _type: 'caption', text: '   ' },
      { _key: 'copy', _type: 'textNote', text: 'A complete note.' },
      { _key: 'unknown', _type: 'carousel', images: [] },
    ]);

    expect(blocks.map((block) => block._key)).toEqual(['image', 'copy']);
  });

  it('accepts a poster-only film fallback and rejects a broken image pair', () => {
    const blocks = renderableProjectBlocks([
      {
        _key: 'poster-film',
        _type: 'heroVideo',
        video: {
          poster: { src: '/poster.webp', width: 1920, height: 1080, alt: 'Film poster' },
        },
      },
      {
        _key: 'pair',
        _type: 'imagePair',
        images: [{ src: '/one.webp', width: 800, height: 1000, alt: 'Only image' }],
      },
    ]);

    expect(blocks.map((block) => block._key)).toEqual(['poster-film']);
  });
});

describe('project hero and body splitting', () => {
  it('builds a motion hero from the gallery cover while retaining distinct film playback below', () => {
    const project = getFixtureProjects().find((item) => item.slug === 'mercury-an-unexpected-life')!;
    const split = splitProjectContent(project);

    expect(split.heroBlock).toMatchObject({
      _key: 'mercury-an-unexpected-life-cover-hero',
      _type: 'shortLoop',
      autoplayPolicy: 'inViewMuted',
      video: {
        src: project.cover.previewVideo,
        poster: project.cover.poster,
        accessibleDescription: `${project.title} project preview`,
      },
    });
    expect(split.bodyBlocks.map((block) => block._type)).toContain('heroVideo');
    expect(split.bodyBlocks.map((block) => block._type)).toContain('imageGrid');
    expect(split.bodyBlocks.map((block) => block._key)).not.toContain(split.heroBlock._key);
  });

  it('builds a still hero from the gallery cover and removes its duplicate from the body', () => {
    const project = getFixtureProjects().find((item) => item.slug === 'arc')!;
    const split = splitProjectContent(project);

    expect(split.heroBlock).toMatchObject({
      _key: 'arc-cover-hero',
      _type: 'heroImage',
      image: project.cover.poster,
      displayWidth: 'contained',
    });
    expect(split.bodyBlocks.some((block) => (
      (block._type === 'heroImage'
        || block._type === 'fullBleedImage'
        || block._type === 'containedImage')
      && block.image.src === project.cover.poster.src
    ))).toBe(false);
  });

  it('moves captions associated with a removed cover duplicate into the hero', () => {
    const project = getFixtureProjects().find((item) => item.slug === 'arc')!;
    const split = splitProjectContent(project, [
      {
        _key: 'cover-copy',
        _type: 'containedImage',
        image: project.cover.poster,
      },
      {
        _key: 'cover-caption',
        _type: 'caption',
        text: 'Lorem ipsum dolor sit amet.',
        association: 'previous',
      },
      {
        _key: 'body-copy',
        _type: 'textNote',
        text: 'Consectetur adipiscing elit.',
      },
    ]);

    expect(split.heroCaptions.map((caption) => caption._key)).toEqual(['cover-caption']);
    expect(split.bodyBlocks.map((block) => block._key)).toEqual(['body-copy']);
  });
});
