import {describe, expect, it} from 'vitest'
import {
  aboutPeopleSeedItems,
  mergeSeedWithExisting,
  resolveSeedUpdateMode,
  seedDocumentLookupKeys,
  seedIsDryRun,
} from '../../scripts/seed-sanity'

describe('About people seed mapping', () => {
  it('preserves profile blockers and stable keys while converting fixture bios to Portable Text', () => {
    const fixture = [{
      _key: 'about-person-oliver',
      name: 'Oliver',
      projectOwner: 'oliver',
      bio: 'Lorem ipsum dolor sit amet.',
      needsReview: true,
      prototypeOnly: true,
    }]

    const mapped = aboutPeopleSeedItems(fixture) as Array<Record<string, unknown>>
    expect(mapped).toHaveLength(1)
    expect(mapped[0]).toMatchObject({
      _key: 'about-person-oliver',
      _type: 'aboutPerson',
      name: 'Oliver',
      projectOwner: 'oliver',
      needsReview: true,
      prototypeOnly: true,
    })
    expect(mapped[0]?.bio).toEqual([
      expect.objectContaining({
        _type: 'block',
        children: [expect.objectContaining({text: 'Lorem ipsum dolor sit amet.'})],
      }),
    ])
    expect(aboutPeopleSeedItems(fixture)).toEqual(mapped)
  })
})

describe('seed preservation policy', () => {
  it('keeps an editor presentation choice while adding newly modeled defaults', () => {
    const seed = {
      _id: 'project.seed.example',
      layoutVariant: 'cinematic',
      projectTheme: 'light',
      motionIntensity: 'medium',
    }
    const existing = {
      _id: 'project.seed.example',
      layoutVariant: 'experimental',
      projectTheme: 'dark',
    }

    expect(mergeSeedWithExisting(seed, existing)).toMatchObject({
      layoutVariant: 'experimental',
      projectTheme: 'dark',
      motionIntensity: 'medium',
    })
    expect(mergeSeedWithExisting(seed, existing, 'force')).toMatchObject({
      layoutVariant: 'cinematic',
      projectTheme: 'light',
      motionIntensity: 'medium',
    })
  })

  it('preserves reviewed editorial values while reasserting heightened blockers', () => {
    const seed = {
      _id: 'project.seed.example',
      _type: 'project',
      title: 'Fixture title',
      visible: false,
      needsReview: true,
      doNotPublishWithoutExplicitApproval: true,
      contentBlocks: [
        {
          _key: 'block-1',
          _type: 'shortLoop',
          prototypeOnly: true,
          caption: 'Fixture caption',
        },
      ],
    }
    const existing = {
      _id: 'project.seed.example',
      _type: 'project',
      title: 'Editor-approved title',
      visible: true,
      needsReview: false,
      doNotPublishWithoutExplicitApproval: false,
      contentBlocks: [
        {
          _key: 'block-1',
          _type: 'shortLoop',
          prototypeOnly: false,
          caption: 'Editor caption',
        },
      ],
    }

    expect(mergeSeedWithExisting(seed, existing)).toMatchObject({
      title: 'Editor-approved title',
      visible: true,
      needsReview: false,
      doNotPublishWithoutExplicitApproval: true,
      contentBlocks: [
        {
          _key: 'block-1',
          prototypeOnly: true,
          caption: 'Editor caption',
        },
      ],
    })
  })

  it('reasserts nested fixture blockers when the referenced asset is unchanged', () => {
    const seed = {
      _type: 'image',
      asset: {_type: 'reference', _ref: 'image-fixture'},
      needsReview: true,
      needsApprovedMaster: true,
      sourceUrl: 'https://example.com/fixture-source',
    }
    const existing = {
      _type: 'image',
      asset: {_type: 'reference', _ref: 'image-fixture'},
      needsReview: false,
      needsApprovedMaster: false,
      sourceUrl: 'https://example.com/fixture-source',
    }

    expect(mergeSeedWithExisting(seed, existing)).toMatchObject({
      needsReview: false,
      needsApprovedMaster: true,
    })
  })

  it('does not transfer old fixture blockers onto a human-replaced asset', () => {
    const seed = {
      _type: 'file',
      asset: {_type: 'reference', _ref: 'file-fixture'},
      needsReview: true,
      prototypeOnly: true,
      needsApprovedMaster: true,
      sourceUrl: 'https://example.com/fixture-source',
    }
    const existing = {
      _type: 'file',
      asset: {_type: 'reference', _ref: 'file-approved-master'},
      needsReview: false,
      prototypeOnly: false,
      needsApprovedMaster: false,
      sourceUrl: 'https://example.com/approved-master',
    }

    expect(mergeSeedWithExisting(seed, existing)).toEqual(existing)
  })

  it('keeps existing-only keyed editorial items and adds newly seeded keys', () => {
    const seed = [
      {_key: 'shared', caption: 'Fixture caption', needsApprovedEmbed: true},
      {_key: 'new-fixture', caption: 'New fixture item'},
    ]
    const existing = [
      {_key: 'shared', caption: 'Editor caption', needsApprovedEmbed: false},
      {_key: 'editor-only', caption: 'Editor-only item'},
    ]

    const firstMerge = mergeSeedWithExisting(seed, existing)
    expect(firstMerge).toEqual([
      {_key: 'shared', caption: 'Editor caption', needsApprovedEmbed: true},
      {_key: 'editor-only', caption: 'Editor-only item'},
      {_key: 'new-fixture', caption: 'New fixture item'},
    ])
    expect(mergeSeedWithExisting(seed, firstMerge)).toEqual(firstMerge)
  })
})

describe('seed force-update policy', () => {
  it('makes fixture-owned values and arrays authoritative without promoting content', () => {
    const seed = {
      _id: 'project.seed.example',
      _type: 'project',
      title: 'Updated fixture title',
      visible: false,
      needsReview: true,
      types: ['Photography'],
      contentBlocks: [{_key: 'fixture-block', _type: 'containedImage'}],
    }
    const existing = {
      _id: 'project.seed.example',
      _type: 'project',
      title: 'Editor title',
      visible: true,
      needsReview: false,
      types: ['Film'],
      contentBlocks: [{_key: 'editor-block', _type: 'textNote'}],
      editorOnlyField: 'retained because the fixture does not model it',
    }

    expect(mergeSeedWithExisting(seed, existing, 'force')).toEqual({
      _id: 'project.seed.example',
      _type: 'project',
      title: 'Updated fixture title',
      visible: false,
      needsReview: true,
      types: ['Photography'],
      contentBlocks: [{_key: 'fixture-block', _type: 'containedImage'}],
      editorOnlyField: 'retained because the fixture does not model it',
    })
  })
})

describe('seed update-mode selection', () => {
  it('defaults to preservation mode', () => {
    expect(resolveSeedUpdateMode([], {})).toBe('preserve')
  })

  it('allows an explicit CLI or environment force opt-in', () => {
    expect(resolveSeedUpdateMode(['--force-update'], {})).toBe('force')
    expect(resolveSeedUpdateMode([], {SANITY_SEED_UPDATE_MODE: 'force'})).toBe('force')
  })

  it('recognizes dry runs without changing the merge policy', () => {
    expect(seedIsDryRun(['--dry-run'])).toBe(true)
    expect(resolveSeedUpdateMode(['--dry-run'], {})).toBe('preserve')
  })

  it('rejects misspelled modes and options rather than guessing', () => {
    expect(() => resolveSeedUpdateMode([], {SANITY_SEED_UPDATE_MODE: 'replace'})).toThrow(
      'SANITY_SEED_UPDATE_MODE must be either preserve or force.',
    )
    expect(() => resolveSeedUpdateMode(['--force'], {})).toThrow('Unknown seed option')
  })
})

describe('seed document identity', () => {
  it('matches migrated records through a hidden legacy ID without assigning it as _id', () => {
    expect(seedDocumentLookupKeys({
      _type: 'project',
      legacyId: 'project.michael.arc',
      slug: {_type: 'slug', current: 'arc'},
    })).toEqual([
      'legacy:project:project.michael.arc',
      'legacy:project.michael.arc',
      'id:project.michael.arc',
      'slug:portfolio:arc',
    ])
  })

  it('keeps singleton IDs and separates equal slugs belonging to different types', () => {
    expect(seedDocumentLookupKeys({_id: 'siteSettings', _type: 'siteSettings'})).toEqual([
      'id:siteSettings',
    ])
    expect(seedDocumentLookupKeys({_type: 'note', slug: {current: 'arc'}})).toEqual([
      'slug:note:arc',
    ])
  })
})
