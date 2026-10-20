import {describe, expect, it} from 'vitest';
import {resolveFooterLogos} from '../../src/lib/footer-projects';

const image = {src: '/cover.webp', width: 960, height: 720, alt: 'Project cover'};
const projects = [
  {id: 'one', title: 'First project', slug: 'first', client: 'Client 01', cover: {poster: image, mediaType: 'still' as const, cardRatio: 'portrait' as const}},
  {id: 'two', title: 'Second project', slug: 'second', client: 'Client 02', cover: {poster: image, previewPosterOverride: {...image, src: '/override.webp'}, mediaType: 'still' as const, cardRatio: 'portrait' as const}},
];

describe('footer project destinations', () => {
  it('matches existing unique client labels and preserves logo order', () => {
    const links = resolveFooterLogos([{key: 'b', name: ' client 02 '}, {key: 'a', name: 'Client 01'}], projects);
    expect(links.map(link => link.href)).toEqual(['/work/second', '/work/first']);
    expect(links[0]?.image?.src).toBe('/override.webp');
    expect(links[1]?.projectTitle).toBe('First project');
  });
  it('lets a project reference override both a matching name and an old URL', () => {
    const [link] = resolveFooterLogos([{key: 'a', name: 'Client 01', projectId: 'two', url: 'https://example.com'}], projects);
    expect(link?.href).toBe('/work/second');
  });
  it('does not replace explicit external links with an inferred project', () => {
    const [link] = resolveFooterLogos([{key: 'a', name: 'Client 01', url: 'https://example.com'}], projects);
    expect(link?.href).toBe('https://example.com');
    expect(link?.image).toBeUndefined();
  });
  it('does not link missing references, ambiguous clients or unmatched names', () => {
    const links = resolveFooterLogos([
      {key: 'missing', name: 'Client 01', projectId: 'unpublished', url: 'https://example.com'},
      {key: 'ambiguous', name: 'Client 01'},
      {key: 'other', name: 'Other client'},
    ], [...projects, {...projects[0]!, id: 'three', slug: 'third'}]);
    expect(links.every(link => !link.href && !link.image)).toBe(true);
  });
});
