import { describe, expect, it } from 'vitest';
import canonicalFixtureProjectsJson from '../../../content/projects.json';
import canonicalFixtureSettingsJson from '../../../content/site-settings.json';
import localFixtureProjectsJson from '../../src/content/local/projects.json';
import localFixtureSettingsJson from '../../src/content/local/site-settings.json';
import {
  aboutProjectsForPerson,
  adjacentProjects,
  getContentMode,
  getFixtureProjects,
  isProductionEligible,
  isProductionEligibleNote,
  normalizeProject,
  normalizeSiteSettings,
  safeApprovedWatchUrl,
  safeHostedVideoUrl,
  sortProjects,
} from '../../src/lib/content';

interface RawFixtureBlock {
  _key?: string;
  _type?: string;
  source?: unknown;
  sourceDurationSeconds?: unknown;
  accessibleDescription?: unknown;
  body?: unknown;
  text?: unknown;
  alignment?: unknown;
  maxWidth?: unknown;
  needsReview?: unknown;
  prototypeOnly?: unknown;
}

interface RawFixtureProject {
  slug: string;
  role?: string;
  shortDescription?: string;
  whatWeDid?: string[];
  credits?: Array<{ label?: string; value?: string }>;
  cover?: { previewVideo?: string; previewIsPlaceholder?: boolean };
  contentBlocks: RawFixtureBlock[];
}

const localFixtureProjects = localFixtureProjectsJson as RawFixtureProject[];
const canonicalFixtureProjects = canonicalFixtureProjectsJson as RawFixtureProject[];
const oliverFilmSlugs = new Set([
  'mercury-an-unexpected-life',
  'tour-de-france-x-toyota',
  'humu-make-work-better-holly',
  'olympics-toyota-in-due-time',
  'mercury-one-of-the-greats',
]);

const reviewTime = new Date('2026-08-14T12:00:00.000Z');

function approvedRawProject() {
  return {
    visible: true,
    needsReview: false,
    doNotPublishWithoutExplicitApproval: false,
    rightsApprovalStatus: 'approved',
    rightsApprovalEvidence: 'Owner approval recorded in ticket NW-1.',
    title: 'Approved work',
    slug: 'approved-work',
    types: ['Photography'],
    cover: {
      poster: {
        asset: { url: 'https://cdn.sanity.io/images/example/poster.jpg' },
        alt: 'Approved cover image',
      },
      previewIsPlaceholder: false,
    },
    publishAt: '2026-08-13T12:00:00.000Z',
    contentBlocks: [
      {
        _type: 'containedImage',
        image: {
          asset: { url: 'https://cdn.sanity.io/images/example/detail.jpg' },
          alt: 'Approved project detail',
        },
      },
    ],
  };
}

describe('content mode', () => {
  it('requires the explicit production value', () => {
    expect(getContentMode('production')).toBe('production');
    expect(getContentMode('prototype')).toBe('prototype');
    expect(getContentMode('preview')).toBe('preview');
    expect(getContentMode(undefined)).toBe('prototype');
  });
});

describe('fixture ordering', () => {
  it('returns all 19 provisional records in the exact editorial order', () => {
    const projects = getFixtureProjects();

    expect(projects).toHaveLength(19);
    expect(projects.map((project) => project.homeOrder)).toEqual([
      10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190,
    ]);
    expect(projects.map((project) => project.slug)).toEqual([
      'arc',
      'mercury-an-unexpected-life',
      'native-cucumber-mint-stop-motion',
      'tour-de-france-x-toyota',
      'cradlewise',
      'humu-make-work-better-holly',
      'dune-tansy',
      'olympics-toyota-in-due-time',
      'fellow',
      'mercury-one-of-the-greats',
      'brava',
      'specialized-globe',
      'molekule-in-office',
      'miss-jones-pancake',
      'chanel-test',
      'untitled-portfolio-film',
      'adobe',
      'stella-artois-daydream',
      'rakuten',
    ]);
  });

  it('sorts a copy by order and then title without mutating the input', () => {
    const input = [
      { homeOrder: 20, title: 'Second' },
      { homeOrder: 10, title: 'Zulu' },
      { homeOrder: 10, title: 'Alpha' },
    ];

    expect(sortProjects(input).map((item) => item.title)).toEqual(['Alpha', 'Zulu', 'Second']);
    expect(input.map((item) => item.title)).toEqual(['Second', 'Zulu', 'Alpha']);
  });
});

describe('About people content', () => {
  it('keeps the canonical seed and prototype runtime settings in exact sync', () => {
    expect(localFixtureSettingsJson).toEqual(canonicalFixtureSettingsJson);
  });

  it('normalizes the supplied NW artwork for full, compact, and metadata use', () => {
    const settings = normalizeSiteSettings(localFixtureSettingsJson, 'prototype');

    expect(settings.wordmark).toEqual({
      src: '/media/brand/new-black.svg',
      width: 1641,
      height: 824,
    });
    expect(settings.compactMark).toEqual(settings.wordmark);
  });

  it('retains all three provisional profiles in prototype and preview modes', () => {
    for (const mode of ['prototype', 'preview'] as const) {
      const people = normalizeSiteSettings(localFixtureSettingsJson, mode).aboutPeople;

      expect(people.map((person) => [person.name, person.projectOwner])).toEqual([
        ['Michael', 'michael'],
        ['Oliver', 'oliver'],
        ['Anjali Rao', 'anjali'],
      ]);
      expect(people.every((person) => person.needsReview && person.prototypeOnly)).toBe(true);
      expect(people.every((person) => String(person.bio[0]?.spans[0]?.text || '').length > 120)).toBe(true);
    }
  });

  it('normalizes Anjali’s supplied portfolio work with safe links and production blockers', () => {
    const people = normalizeSiteSettings(localFixtureSettingsJson, 'prototype').aboutPeople;
    const anjali = people.find((person) => person.projectOwner === 'anjali');

    expect(anjali?.selectedWork.map((work) => [work.title, work.client])).toEqual([
      ['Adobe', 'Adobe'],
      ['Daydream', 'Stella Artois'],
      ['Rakuten', 'Rakuten'],
      ['Duet', 'Rakuten'],
    ]);
    expect(anjali?.selectedWork.every((work) =>
      work.href?.startsWith('https://arao.squarespace.com/') &&
      work.image.src.startsWith('/media/images/anjali/') &&
      work.image.alt === '' &&
      work.needsReview &&
      work.prototypeOnly &&
      work.doNotPublishWithoutExplicitApproval
    )).toBe(true);
  });

  it('filters provisional profiles individually in production without dropping approved profiles', () => {
    const settings = {
      ...localFixtureSettingsJson,
      aboutPeople: localFixtureSettingsJson.aboutPeople.map((person) => (
        person.projectOwner === 'michael' ? {
          ...person,
          needsReview: false,
          prototypeOnly: false,
        } : person
      )),
    };

    expect(normalizeSiteSettings(settings, 'production').aboutPeople.map((person) => person.name))
      .toEqual(['Michael']);
  });

  it('derives three ordered supporting projects for each profile owner', () => {
    const projects = getFixtureProjects();
    const oliver = aboutProjectsForPerson(projects, 'oliver');
    const michael = aboutProjectsForPerson(projects, 'michael');
    const anjali = aboutProjectsForPerson(projects, 'anjali');
    const oliverTessellation = aboutProjectsForPerson(projects, 'oliver', 5);
    const michaelTessellation = aboutProjectsForPerson(projects, 'michael', 5);

    expect(oliver).toHaveLength(3);
    expect(michael).toHaveLength(3);
    expect(anjali).toHaveLength(3);
    expect(oliver.every((project) => project.owner === 'oliver')).toBe(true);
    expect(michael.every((project) => project.owner === 'michael')).toBe(true);
    expect(anjali.every((project) => project.owner === 'anjali')).toBe(true);
    expect(oliver.map((project) => project.homeOrder)).toEqual([20, 40, 60]);
    expect(michael.map((project) => project.homeOrder)).toEqual([10, 30, 50]);
    expect(anjali.map((project) => project.homeOrder)).toEqual([170, 180, 190]);
    expect(oliverTessellation).toHaveLength(5);
    expect(michaelTessellation).toHaveLength(5);
    expect(oliverTessellation.every((project) => project.owner === 'oliver')).toBe(true);
    expect(michaelTessellation.every((project) => project.owner === 'michael')).toBe(true);
  });
});

describe('production eligibility', () => {
  it('accepts a complete, approved, already-published record', () => {
    expect(isProductionEligible(approvedRawProject(), reviewTime)).toBe(true);
  });

  it.each([
    ['hidden project', { visible: false }],
    ['project awaiting review', { needsReview: true }],
    ['explicit approval block', { doNotPublishWithoutExplicitApproval: true }],
    ['pending rights', { rightsApprovalStatus: 'pending' }],
    ['missing rights evidence', { rightsApprovalEvidence: '' }],
    ['missing title', { title: '' }],
    ['missing slug', { slug: '' }],
    ['future publication', { publishAt: '2026-08-15T12:00:00.000Z' }],
    ['missing content', { contentBlocks: [] }],
  ])('rejects a %s', (_label, override) => {
    expect(isProductionEligible({ ...approvedRawProject(), ...override }, reviewTime)).toBe(false);
  });

  it('rejects a project without a cover poster', () => {
    const project = approvedRawProject();
    project.cover.poster = undefined as never;

    expect(isProductionEligible(project, reviewTime)).toBe(false);
  });

  it('rejects placeholder cover motion', () => {
    const project = approvedRawProject();
    project.cover.previewIsPlaceholder = true;

    expect(isProductionEligible(project, reviewTime)).toBe(false);
  });

  it.each([
    'needsReview',
    'prototypeOnly',
    'needsApprovedEmbed',
    'needsApprovedMaster',
    'altNeedsReview',
    'previewIsPlaceholder',
    'doNotPublishWithoutExplicitApproval',
  ])('rejects content carrying the %s safety flag', (flag) => {
    const project = approvedRawProject();

    expect(isProductionEligible({
      ...project,
      contentBlocks: [{ ...project.contentBlocks[0], [flag]: true }],
    }, reviewTime)).toBe(false);
  });

  it('rejects safety flags nested on media assets', () => {
    const project = approvedRawProject();
    (project.contentBlocks[0]!.image as Record<string, unknown>).needsApprovedMaster = true;

    expect(isProductionEligible(project, reviewTime)).toBe(false);
  });

  it('rejects a single-image block with alt text but no image asset', () => {
    const project = approvedRawProject();
    project.contentBlocks = [{ _type: 'containedImage', alt: 'Words without an image' }] as never;

    expect(isProductionEligible(project, reviewTime)).toBe(false);
  });

  it('rejects unapproved or non-playable remote media URLs', () => {
    const project = approvedRawProject();
    project.contentBlocks = [{
      _type: 'video',
      poster: { asset: { url: 'https://cdn.sanity.io/images/example/poster.jpg' } },
      remoteSource: 'https://unapproved.invalid/film.mp4',
    }] as never;
    expect(isProductionEligible(project, reviewTime)).toBe(false);

    expect(safeHostedVideoUrl('https://vimeo.com/12345')).toBeUndefined();
    expect(safeHostedVideoUrl('https://cdn.sanity.io/files/demo/prod/film.mp4')).toContain('cdn.sanity.io');
    expect(safeApprovedWatchUrl('https://vimeo.com/12345')).toContain('vimeo.com');
    expect(safeApprovedWatchUrl('https://unapproved.invalid/watch')).toBeUndefined();
  });

  it('requires complete, approved note media', () => {
    const note = {
      title: 'A note', slug: 'a-note', date: '2026-08-13', summary: 'A concise summary.',
      rightsApprovalStatus: 'approved',
      rightsApprovalEvidence: 'Owner approval recorded in ticket NW-2.',
      media: {
        kind: 'video',
        poster: { asset: { url: 'https://cdn.sanity.io/images/example/poster.jpg' } },
        remoteUrl: 'https://vimeo.com/12345',
        remotePlayerId: '12345',
      },
    };
    expect(isProductionEligibleNote(note)).toBe(true);
    expect(isProductionEligibleNote({
      ...note,
      media: { ...note.media, remoteUrl: 'https://unapproved.invalid/video' },
    })).toBe(false);
  });

  it('rejects malformed or mismatched player identities', () => {
    expect(safeApprovedWatchUrl('https://youtube.com/watch?v=short')).toBeUndefined();
    expect(safeApprovedWatchUrl('https://youtube.com/channel/example')).toBeUndefined();
    expect(safeApprovedWatchUrl('https://youtu.be/dQw4w9WgXcQ')).toContain('youtu.be');
  });
});

describe('Sanity image normalization', () => {
  it('applies crop metadata and lets the Studio hotspot override the fixture focal point', () => {
    const base = approvedRawProject();
    const project = {
      ...base,
      cover: {
        ...base.cover,
        focalPoint: { x: 0.1, y: 0.1 },
        alt: 'Approved cover',
        poster: {
          asset: {
            url: 'https://cdn.sanity.io/images/example/poster.jpg',
            width: 1000,
            height: 800,
          },
          crop: { left: 0.1, right: 0.1, top: 0.1, bottom: 0.1 },
          hotspot: { x: 0.8, y: 0.4 },
        },
      },
    };

    const normalized = normalizeProject(project);
    expect(normalized.cover.poster.src).toContain('rect=100,80,800,640');
    expect(normalized.cover.poster).toMatchObject({
      width: 800,
      height: 640,
      objectPosition: '88% 38%',
    });
  });
});

describe('CMS view normalization', () => {
  it('preserves safe portable-text structure while dropping unsafe links', () => {
    const project = approvedRawProject();
    project.contentBlocks = [{
      _key: 'text-1',
      _type: 'textNote',
      body: [{
        _key: 'paragraph-1',
        _type: 'block',
        style: 'h2',
        children: [
          { _type: 'span', text: 'A marked note', marks: ['strong', 'unsafe-link'] },
        ],
        markDefs: [{ _key: 'unsafe-link', _type: 'link', href: 'javascript:alert(1)' }],
      }],
    }] as never;

    const block = normalizeProject(project).contentBlocks[0];
    expect(block?._type).toBe('textNote');
    if (block?._type === 'textNote') {
      expect(block.richText?.[0]).toMatchObject({
        style: 'h2',
        spans: [{ text: 'A marked note', marks: ['strong'], link: undefined }],
      });
    }
  });

  it('keeps zero as a valid home order and sanitizes optional credit URLs', () => {
    const project = {
      ...approvedRawProject(),
      homeOrder: 0,
      credits: [{ label: 'Director', value: 'A Person', url: 'javascript:alert(1)' }],
    };
    const normalized = normalizeProject(project);

    expect(normalized.homeOrder).toBe(0);
    expect(normalized.credits).toEqual([{ _key: undefined, label: 'Director', value: 'A Person', url: undefined }]);
  });

  it('normalizes the complete optional presentation contract', () => {
    const normalized = normalizeProject({
      ...approvedRawProject(),
      homeCardSize: 'large',
      homeColumn: 3,
      homeOffset: 42.4,
      homeTreatment: 'masked',
      projectTheme: 'accent',
      accentColor: '#a1b2c3',
      titleTreatment: 'split',
      heroTreatment: 'fullViewport',
      layoutVariant: 'campaign',
      motionIntensity: 'high',
    });

    expect(normalized).toMatchObject({
      homeCardSize: 'large',
      homeColumn: 3,
      homeOffset: 42,
      homeTreatment: 'masked',
      projectTheme: 'accent',
      accentColor: '#A1B2C3',
      titleTreatment: 'split',
      heroTreatment: 'fullViewport',
      layoutVariant: 'campaign',
      motionIntensity: 'high',
    });
  });

  it('uses safe fallbacks for missing or malformed presentation fields', () => {
    const normalized = normalizeProject({
      ...approvedRawProject(),
      homeCardSize: 'huge',
      homeColumn: 5,
      homeOffset: 999,
      homeTreatment: 'unsafe',
      projectTheme: 'neon',
      accentColor: 'url(javascript:alert(1))',
      titleTreatment: 'unknown',
      heroTreatment: 'unknown',
      layoutVariant: 'unknown',
      motionIntensity: 'extreme',
    });

    expect(normalized).toMatchObject({
      homeCardSize: 'standard',
      homeColumn: undefined,
      homeOffset: 320,
      homeTreatment: 'standard',
      projectTheme: 'light',
      accentColor: undefined,
      titleTreatment: 'standard',
      heroTreatment: 'contained',
      layoutVariant: 'photoEssay',
      motionIntensity: 'medium',
    });
  });
});

describe('fixture media normalization', () => {
  it('maps every seed project to a valid, varied presentation without enabling a wide feature', () => {
    const projects = getFixtureProjects();

    expect(new Set(projects.map((project) => project.layoutVariant))).toEqual(new Set([
      'cinematic',
      'photoEssay',
      'campaign',
      'experimental',
    ]));
    expect(new Set(projects.map((project) => project.homeTreatment)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(projects.map((project) => project.projectTheme)).size).toBe(4);
    expect(projects.every((project) => project.homeColumn && project.homeColumn >= 1 && project.homeColumn <= 4)).toBe(true);
    expect(new Set(projects.map((project) => project.homeColumn))).toEqual(new Set([1, 2, 3, 4]));
    expect(projects.every((project) => project.homeCardSize !== 'wide')).toBe(true);
    expect(projects.every((project) => /^#[0-9A-F]{6}$/u.test(project.accentColor || ''))).toBe(true);
  });

  it('maps local assets to public media paths without presenting draft alt text as approved copy', () => {
    const arc = getFixtureProjects().find((project) => project.slug === 'arc');

    expect(arc).toBeDefined();
    expect(arc?.cover.poster).toMatchObject({
      src: '/media/images/michael/michael_arc_product.webp',
      alt: '',
      needsReview: true,
      objectPosition: '50% 50%',
    });
    expect(arc?.cover.poster.width).toBeGreaterThan(0);
    expect(arc?.cover.poster.height).toBeGreaterThan(0);
    expect(arc).not.toHaveProperty('sourcePage');

    const block = arc?.contentBlocks[0];
    expect(block?._type).toBe('containedImage');
    if (block?._type === 'containedImage') {
      expect(block.image).toMatchObject({
        src: '/media/images/michael/michael_arc_product.webp',
        alt: '',
        needsReview: true,
      });
    }
  });

  it('preserves motion safety metadata while normalizing sources', () => {
    const projects = getFixtureProjects();
    const native = projects.find((project) => project.slug === 'native-cucumber-mint-stop-motion');
    const mercury = projects.find((project) => project.slug === 'mercury-an-unexpected-life');

    expect(native?.cover).toMatchObject({
      mediaType: 'motion',
      previewVideo: '/media/video-previews/michael/michael_native_stop_motion_clip.mp4',
      previewIsPlaceholder: false,
    });
    const loop = native?.contentBlocks.find((block) => block._type === 'shortLoop');
    expect(loop?._type).toBe('shortLoop');
    if (loop?._type === 'shortLoop') {
      expect(loop.video).toMatchObject({
        src: '/media/video-previews/michael/michael_native_stop_motion_clip.mp4',
        prototypeOnly: true,
        accessibleDescription: native?.title,
      });
      expect(loop.autoplayPolicy).toBe('never');
    }

    expect(mercury?.cover.previewIsPlaceholder).toBe(false);
    expect(mercury?.cover.previewVideo).toMatch(/gallery-cut-08s\.mp4$/u);
    const hero = mercury?.contentBlocks.find((block) => block._type === 'heroVideo');
    expect(hero?._type).toBe('heroVideo');
    if (hero?._type === 'heroVideo') {
      expect(hero.video).toMatchObject({
        provider: 'vimeo',
        providerId: '867257158',
        externalUrl: 'https://vimeo.com/867257158',
        needsApprovedEmbed: true,
        sourceDurationSeconds: 190,
      });
    }
  });

  it('uses local Anjali cuts for gallery motion and Vimeo for full project playback', () => {
    const expected = new Map<string, readonly [string, string, number]>([
      ['adobe', ['adobe-what-whack-wears-gallery-cut-08s.mp4', '720040595', 93.845]],
      ['stella-artois-daydream', ['stella-artois-daydream-gallery-cut-06s.mp4', '439413250', 6.015]],
      ['rakuten', ['rakuten-duet-gallery-cut-08s.mp4', '479336941', 30.036667]],
    ] as const);

    for (const project of getFixtureProjects().filter((item) => item.owner === 'anjali')) {
      const media = expected.get(project.slug);
      expect(media).toBeDefined();
      expect(project.cover).toMatchObject({
        mediaType: 'motion',
        previewVideo: `/media/video-previews/anjali/${media?.[0]}`,
      });
      const video = project.contentBlocks.find((block) => block._type === 'video');
      expect(video?._type).toBe('video');
      if (video?._type === 'video') {
        expect(video.video).toMatchObject({
          provider: 'vimeo',
          providerId: media?.[1],
          externalUrl: `https://vimeo.com/${media?.[1]}`,
          sourceDurationSeconds: media?.[2],
          prototypeOnly: true,
        });
        expect(video.video.src).toBeUndefined();
      }
    }
  });
});

describe('prototype project detail copy', () => {
  it.each([
    ['local runtime mirror', localFixtureProjects],
    ['canonical seed source', canonicalFixtureProjects],
  ] as const)('uses real supplied-film gallery cuts for every Oliver cover in the %s', (_label, projects) => {
    const oliverProjects = projects.filter((project) => oliverFilmSlugs.has(project.slug));

    expect(oliverProjects).toHaveLength(5);
    for (const project of oliverProjects) {
      expect(project.cover?.previewVideo).toMatch(/gallery-cut-08s\.mp4$/u);
      expect(project.cover?.previewIsPlaceholder).toBe(false);
    }
  });

  it.each([
    ['local runtime mirror', localFixtureProjects],
    ['canonical seed source', canonicalFixtureProjects],
  ] as const)('keeps two deterministic, publication-blocked text notes in every %s record', (_label, projects) => {
    const allKeys = new Set<string>();

    expect(projects).toHaveLength(19);
    for (const project of projects) {
      const notes = project.contentBlocks.filter((block) => block._type === 'textNote');

      expect(notes).toHaveLength(2);
      expect(notes.map((note) => note._key)).toEqual([
        `${project.slug}-prototype-copy-01`,
        `${project.slug}-prototype-copy-02`,
      ]);
      if (oliverFilmSlugs.has(project.slug)) {
        expect([project.contentBlocks[0], project.contentBlocks.at(-1)]).toEqual(notes);
      } else {
        expect(project.contentBlocks.slice(-2)).toEqual(notes);
      }
      expect(notes.map((note) => note.alignment)).toEqual(['left', 'center']);
      expect(notes.map((note) => note.maxWidth)).toEqual(['medium', 'narrow']);

      for (const note of notes) {
        expect(note).toMatchObject({
          _type: 'textNote',
          needsReview: true,
          prototypeOnly: true,
        });
        expect(note).toHaveProperty('body');
        expect(note).not.toHaveProperty('text');
        expect(String(note.body)).toMatch(/Lorem ipsum|Ut enim ad minim veniam/u);
        expect(allKeys.has(String(note._key))).toBe(false);
        allKeys.add(String(note._key));
      }
    }

    expect(allKeys.size).toBe(38);
  });

  it.each([
    ['local runtime mirror', localFixtureProjects],
    ['canonical seed source', canonicalFixtureProjects],
  ] as const)('orders the five Oliver films as copy, stills, player, copy in the %s', (_label, projects) => {
    const films = projects.filter((project) => oliverFilmSlugs.has(project.slug));

    expect(films).toHaveLength(5);
    for (const project of films) {
      expect(project.contentBlocks.map((block) => block._type)).toEqual([
        'textNote',
        'imageGrid',
        'heroVideo',
        'textNote',
      ]);
      expect(project.contentBlocks.map((block) => block._key)).toEqual([
        `${project.slug}-prototype-copy-01`,
        `${project.slug}-block-02`,
        `${project.slug}-block-01`,
        `${project.slug}-prototype-copy-02`,
      ]);
    }
  });

  it('keeps canonical CMS seed copy aligned with the local runtime mirror', () => {
    const canonicalBySlug = new Map(canonicalFixtureProjects.map((project) => [project.slug, project]));

    expect(canonicalFixtureProjects.map((project) => project.slug)).toEqual(
      localFixtureProjects.map((project) => project.slug),
    );
    for (const localProject of localFixtureProjects) {
      const canonicalProject = canonicalBySlug.get(localProject.slug);
      expect(canonicalProject).toBeDefined();
      expect(canonicalProject).toMatchObject({
        role: localProject.role,
        shortDescription: localProject.shortDescription,
        whatWeDid: localProject.whatWeDid,
        credits: localProject.credits,
      });
      expect(canonicalProject?.contentBlocks.map((block) => block._key)).toEqual(
        localProject.contentBlocks.map((block) => block._key),
      );
    }
  });

  it('retains the sourced role and description copy in the first five records', () => {
    expect(canonicalFixtureProjects.slice(0, 5)).toMatchObject([
      {
        slug: 'mercury-an-unexpected-life',
        role: 'Director, Producer',
        shortDescription: 'A profile of Mercury founder Helen Mayer and how unexpected parenthood shaped her leadership.',
      },
      {
        slug: 'tour-de-france-x-toyota',
        role: 'Director',
        shortDescription: 'A gritty, high-velocity Toyota Tacoma spot with cyclist Nate Mesmer in the Marin Headlands.',
      },
      {
        slug: 'humu-make-work-better-holly',
        shortDescription: "A friendly product explainer translating Humu's data-driven workplace nudges into an approachable story.",
      },
      {
        slug: 'olympics-toyota-in-due-time',
        role: 'Director, DP, Editor',
        shortDescription: 'Toyota athlete Alex Massialas trains while the postponed Tokyo Olympics remain uncertain during COVID-19.',
      },
      {
        slug: 'mercury-one-of-the-greats',
        role: 'Director, Producer',
        shortDescription: 'A profile of Josh Fabian, competitive gaming, and his ambition for Metafy and gaming communities.',
      },
    ]);
  });
});

describe('project adjacency', () => {
  const projects = getFixtureProjects();

  it('uses the curated order without wrapping at either edge', () => {
    expect(adjacentProjects(projects, 'arc')).toMatchObject({
      previous: undefined,
      next: { slug: 'mercury-an-unexpected-life' },
    });
    expect(adjacentProjects(projects, 'untitled-portfolio-film')).toMatchObject({
      previous: { slug: 'chanel-test' },
      next: { slug: 'adobe' },
    });
    expect(adjacentProjects(projects, 'rakuten')).toMatchObject({
      previous: { slug: 'stella-artois-daydream' },
      next: undefined,
    });
  });

  it('returns the immediate neighbors for a middle project', () => {
    expect(adjacentProjects(projects, 'native-cucumber-mint-stop-motion')).toMatchObject({
      previous: { slug: 'mercury-an-unexpected-life' },
      next: { slug: 'tour-de-france-x-toyota' },
    });
  });

  it('returns no neighbors for an unknown slug', () => {
    expect(adjacentProjects(projects, 'not-a-project')).toEqual({
      previous: undefined,
      next: undefined,
    });
  });
});
