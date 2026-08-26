import {evaluate, parse} from 'groq-js';
import {describe, expect, it} from 'vitest';
import {
  ALL_PUBLIC_PROJECT_DETAILS_QUERY,
  HOME_PROJECTS_QUERY,
  PREVIEW_PROJECT_DETAILS_QUERY,
  PREVIEW_SITE_SETTINGS_QUERY,
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
    rightsApprovalStatus: 'approved',
    rightsApprovalEvidence: 'Owner approval recorded in ticket NW-1.',
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

function approvedNote() {
  return {
    _id: 'note.approved',
    _type: 'note',
    title: 'Approved note',
    slug: {current: 'approved-note'},
    summary: 'One confirmed sentence.',
    date: '2025-01-01',
    visible: true,
    rightsApprovalStatus: 'approved',
    rightsApprovalEvidence: 'Owner approval recorded in ticket NW-2.',
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
      {...approved, _id: 'rights', rightsApprovalStatus: 'pending'},
      {...approved, _id: 'evidence', rightsApprovalEvidence: ''},
      {...approved, _id: 'placeholder', cover: {...approved.cover, previewIsPlaceholder: true}},
      {...approved, _id: 'blocker', contentBlocks: [{...approved.contentBlocks[0], needsApprovedMaster: true}]},
      {...approved, _id: 'missing-image', contentBlocks: [{...approved.contentBlocks[0], image: undefined}]},
    ];
    expect(await idsFor(PUBLIC_PROJECT_FILTER, [approved, ...blocked])).toEqual(['project.approved']);
  });

  it('accepts only the fully approved note', async () => {
    const approved = approvedNote();
    const blocked = [
      {...approved, _id: 'note-hidden', visible: false},
      {...approved, _id: 'note-rights', rightsApprovalStatus: 'pending'},
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

describe('About people projections', () => {
  const people = [
    {
      _key: 'approved',
      _type: 'aboutPerson',
      name: 'Approved person',
      projectOwner: 'oliver',
      bio: [{_type: 'block', children: [{_type: 'span', text: 'Approved biography.'}]}],
      selectedWork: [
        {
          _key: 'approved-work',
          _type: 'aboutWork',
          title: 'Approved work',
          image: {asset: {_ref: 'image-about-work'}},
        },
        {
          _key: 'blocked-work',
          _type: 'aboutWork',
          title: 'Blocked work',
          image: {asset: {_ref: 'image-about-work-blocked'}},
          prototypeOnly: true,
        },
      ],
      needsReview: false,
      prototypeOnly: false,
    },
    {
      _key: 'prototype',
      _type: 'aboutPerson',
      name: 'Prototype person',
      projectOwner: 'michael',
      bio: [{_type: 'block', children: [{_type: 'span', text: 'Placeholder biography.'}]}],
      needsReview: true,
      prototypeOnly: true,
    },
  ];
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
  const aboutPage = {_id: 'aboutPage', _type: 'aboutPage', people};

  it('filters provisional profiles individually from the public projection', async () => {
    const result = await queryResult<{aboutPage: {people: Array<{name: string; selectedWork: Array<{title: string}>}>}}>(
      SITE_SETTINGS_QUERY,
      [settings, aboutPage],
    );

    expect(result.aboutPage.people.map((person) => person.name)).toEqual(['Approved person']);
    expect(result.aboutPage.people[0]?.selectedWork.map((work) => work.title)).toEqual(['Approved work']);
  });

  it('retains provisional profiles in the preview projection', async () => {
    const result = await queryResult<{aboutPage: {people: Array<{name: string; selectedWork?: Array<{title: string}>}>}}>(
      PREVIEW_SITE_SETTINGS_QUERY,
      [settings, aboutPage],
    );

    expect(result.aboutPage.people.map((person) => person.name)).toEqual([
      'Approved person',
      'Prototype person',
    ]);
    expect(result.aboutPage.people[0]?.selectedWork?.map((work) => work.title)).toEqual([
      'Approved work',
      'Blocked work',
    ]);
  });
});
