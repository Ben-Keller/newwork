import {evaluate, parse} from 'groq-js';
import {describe, expect, it} from 'vitest';
import {
  ALL_PUBLIC_PROJECT_DETAILS_QUERY,
  HOME_PROJECTS_QUERY,
  PREVIEW_PROJECT_DETAILS_QUERY,
  PREVIEW_SITE_SETTINGS_QUERY,
  PUBLIC_ASSET_FILTER,
  PUBLIC_NOTE_FILTER,
  PUBLIC_PROJECT_FILTER,
  SITE_SETTINGS_QUERY,
} from '../../sanity/queries';

async function idsFor(filter: string, dataset: unknown[]): Promise<string[]> {
  const tree = parse(`*[${filter}]._id`);
  const result = await evaluate(tree, {dataset});
  return await result.get() as string[];
}

async function queryResult<T>(query: string, dataset: unknown[]): Promise<T> {
  const tree = parse(query);
  const result = await evaluate(tree, {dataset});
  return await result.get() as T;
}

function approvedProject() {
  return {
    _id: 'project.approved',
    _type: 'project',
    title: 'Approved project',
    slug: {current: 'approved-project'},
    visible: true,
    featuredOnHome: true,
    homeOrder: 10,
    cover: {
      poster: {asset: {_ref: 'image-cover'}},
      alt: 'A confirmed project cover.',
    },
    contentBlocks: [{
      _key: 'hero',
      _type: 'heroImage',
      image: {asset: {_ref: 'image-hero'}},
      alt: 'A confirmed hero image.',
    }],
    types: ['Photography'],
  };
}

function approvedAsset(projectId = 'project.approved') {
  return {
    _id: `asset.${projectId}`,
    _type: 'mediaItem',
    title: 'Approved image',
    slug: {current: `asset-${projectId}`},
    kind: 'image',
    project: {_type: 'reference', _ref: projectId},
    projectOrder: 0,
    image: {asset: {_ref: 'image-asset'}},
    alt: 'A confirmed project image.',
  };
}

function approvedNote() {
  return {
    _id: 'note.approved',
    _type: 'note',
    title: 'Approved note',
    slug: {current: 'approved-note'},
    summary: 'One confirmed sentence.',
    date: '2025-01-01',
    visible: true,
    media: {
      kind: 'image',
      image: {asset: {_ref: 'image-note'}},
      alt: 'A confirmed note image.',
    },
  };
}

describe('public GROQ safety filters', () => {
  it('accepts only the fully approved project', async () => {
    const approved = approvedProject();
    const blocked = [
      {...approved, _id: 'hidden', visible: false},
      {...approved, _id: 'review', needsReview: true},
      {...approved, _id: 'placeholder', cover: {...approved.cover, previewIsPlaceholder: true}},
      {...approved, _id: 'blocker', contentBlocks: [{...approved.contentBlocks[0], needsApprovedMaster: true}]},
      {...approved, _id: 'missing-image', contentBlocks: [{...approved.contentBlocks[0], image: undefined}]},
    ];
    const assets = [approved, ...blocked].map((project) => approvedAsset(project._id));
    expect(await idsFor(PUBLIC_PROJECT_FILTER, [approved, ...blocked, ...assets])).toEqual(['project.approved']);
  });

  it('treats every linked Asset equally and blocks an invalid Project asset', async () => {
    const project = approvedProject();
    const approved = approvedAsset(project._id);
    const incomplete = {
      ...approvedAsset(project._id),
      _id: 'asset.incomplete',
      slug: {current: 'incomplete'},
      projectOrder: 1,
      alt: '',
    };
    expect(await idsFor(PUBLIC_ASSET_FILTER, [approved, incomplete])).toEqual([approved._id]);
    expect(await idsFor(PUBLIC_PROJECT_FILTER, [project, approved, incomplete])).toEqual([]);
  });

  it('accepts only the fully approved note', async () => {
    const approved = approvedNote();
    const blocked = [
      {...approved, _id: 'note-hidden', visible: false},
      {...approved, _id: 'note-alt', media: {...approved.media, alt: ''}},
      {...approved, _id: 'note-review', media: {...approved.media, needsReview: true}},
    ];
    expect(await idsFor(PUBLIC_NOTE_FILTER, [approved, ...blocked])).toEqual(['note.approved']);
  });
});

describe('project presentation projections', () => {
  it.each([
    ['home', HOME_PROJECTS_QUERY],
    ['public detail', ALL_PUBLIC_PROJECT_DETAILS_QUERY],
    ['preview detail', PREVIEW_PROJECT_DETAILS_QUERY],
  ])('includes every editable presentation field in the %s query', (_label, query) => {
    [
      'homeCardSize',
      'homeColumn',
      'homeOffset',
      'homeTreatment',
      'projectTheme',
      'accentColor',
      'titleTreatment',
      'heroTreatment',
      'layoutVariant',
      'motionIntensity',
    ].forEach((field) => expect(query).toContain(field));
    expect(query).toContain('owner');
  });
});

describe('About page projection', () => {
  const settings = {
    _id: 'siteSettings',
    _type: 'siteSettings',
    siteName: 'New Work',
    defaultSeo: {
      metaTitle: 'New Work',
      metaDescription: 'Approved description.',
      shareImage: {asset: {_ref: 'image-share'}},
      shareImageAlt: 'Approved share image.',
    },
  };
  const aboutPage = {
    _id: 'aboutPage',
    _type: 'aboutPage',
    openingHeadline: 'A custom opening.',
    closingHeadline: 'What should we make next?',
  };

  it.each([SITE_SETTINGS_QUERY, PREVIEW_SITE_SETTINGS_QUERY])(
    'returns the editable About text',
    async (query) => {
      const result = await queryResult<{
        aboutPage: {openingHeadline: string; closingHeadline: string};
      }>(query, [settings, aboutPage]);

      expect(result.aboutPage).toEqual(expect.objectContaining({
        openingHeadline: 'A custom opening.',
        closingHeadline: 'What should we make next?',
      }));
    },
  );
});
