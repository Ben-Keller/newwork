import {describe, expect, it} from 'vitest';
import {parseCmsPayload} from '../../src/lib/cms-contract';
import {
  isSafeEmail,
  idsAgreeWithWatchUrl,
  parseApprovedWatchUrl,
  parsedHttpsUrl,
  safeEditorialLink,
  safeWebVttUrl,
} from '../../shared/content-policy';

const settings = {
  siteName: 'New Work',
  defaultSeo: {},
  reel: {},
};

const project = {
  _id: 'project.one',
  title: 'One',
  slug: {current: 'one'},
  cover: {},
  types: [],
  contentBlocks: [],
};

const note = {
  _id: 'note.one',
  title: 'One note',
  summary: 'A summary.',
  date: '2026-08-01',
  media: {},
};

describe('CMS payload boundary', () => {
  it('accepts the minimum projected shape and preserves records', () => {
    expect(parseCmsPayload({settings, projects: [project], notes: [note]})).toEqual({
      settings,
      projects: [project],
      notes: [note],
    });
  });

  it.each([
    [{...settings, siteName: ''}, 'siteSettings.siteName'],
    [{...settings, defaultSeo: undefined}, 'siteSettings.defaultSeo'],
    [{...settings, reel: undefined}, 'siteSettings.reel'],
  ])('rejects malformed settings', (candidate, message) => {
    expect(() => parseCmsPayload({settings: candidate, projects: [], notes: []})).toThrow(message);
  });

  it('validates the optional people collection shape without rejecting draft entries', () => {
    expect(() => parseCmsPayload({
      settings: {...settings, aboutPeople: 'wrong'},
      projects: [],
      notes: [],
    })).toThrow('siteSettings.aboutPeople must be an array');

    expect(parseCmsPayload({
      settings: {...settings, aboutPeople: [{}]},
      projects: [],
      notes: [],
    }).settings.aboutPeople).toEqual([{}]);
  });

  it('rejects non-record lists and reports the exact entry', () => {
    expect(() => parseCmsPayload({settings, projects: 'wrong', notes: []})).toThrow('projects must be an array');
    expect(() => parseCmsPayload({settings, projects: [null], notes: []})).toThrow('projects[0] must be an object');
  });

  it('reports invalid project and note contracts before normalization', () => {
    expect(() => parseCmsPayload({settings, projects: [{_id: 'broken'}], notes: []})).toThrow('broken is missing or has invalid');
    expect(() => parseCmsPayload({settings, projects: [project], notes: [{_id: 'bad-note'}]})).toThrow('bad-note is missing or has invalid');
  });
});

describe('shared public-input policy', () => {
  it('allows only credential-free HTTPS URLs', () => {
    expect(parsedHttpsUrl('https://example.com/path')?.hostname).toBe('example.com');
    expect(parsedHttpsUrl('http://example.com')).toBeUndefined();
    expect(parsedHttpsUrl('https://user:secret@example.com')).toBeUndefined();
  });

  it('sanitizes email and editorial-link schemes', () => {
    expect(isSafeEmail('studio@example.com')).toBe(true);
    expect(isSafeEmail('bad\n@example.com')).toBe(false);
    expect(safeEditorialLink('/work/arc')).toBe('/work/arc');
    expect(safeEditorialLink('mailto:studio@example.com')).toBe('mailto:studio@example.com');
    expect(safeEditorialLink('javascript:alert(1)')).toBeUndefined();
  });

  it('requires exact provider URL and player ID agreement', () => {
    expect(parseApprovedWatchUrl('https://vimeo.com/867257158')).toMatchObject({provider: 'vimeo', providerId: '867257158'});
    expect(idsAgreeWithWatchUrl('https://vimeo.com/867257158', '867257158', undefined)).toBe(true);
    expect(idsAgreeWithWatchUrl('https://youtu.be/dQw4w9WgXcQ', undefined, 'different01')).toBe(false);
  });

  it('accepts only Sanity-hosted VTT caption files', () => {
    expect(safeWebVttUrl('https://cdn.sanity.io/files/demo/production/captions.vtt')).toContain('.vtt');
    expect(safeWebVttUrl('https://cdn.sanity.io/files/demo/production/captions.srt')).toBeUndefined();
    expect(safeWebVttUrl('https://example.com/captions.vtt')).toBeUndefined();
  });
});
