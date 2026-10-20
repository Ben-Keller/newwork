import {afterEach, describe, expect, it, vi} from 'vitest';
import {buildBtsItems, formatClock} from '../../src/lib/bts';
import {michaelPhotoWork as photo} from '../../src/content/local/michael-gallery';
import {getFixtureProjects} from '../../src/lib/content';
import {applyWorkGallery, buildPrototypeWorkGallery, buildWorkGallery, isExcludedWorkGalleryItem, preferUnifiedWorkDocuments} from '../../src/lib/content/work-gallery';
import {splashRendition} from '../../src/lib/media/splash-renditions';
import {observeReducedData} from '../../src/lib/motion/reduced-data';
import {observeReducedMotion} from '../../src/lib/motion/reduced-motion';
const films = getFixtureProjects();
const chosen = photo.photos.filter(item => !isExcludedWorkGalleryItem(photo.slug, item.id)).slice(0, 3);
const placements = chosen.map(item => ({_key: item.id, workId: photo.id, photoId: item.id, cardSize: 'standard' as const, treatment: 'standard' as const}));
const photos = buildWorkGallery([photo], placements);
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
describe('client gallery editing', () => {
  it('applies authored selection without mutating the project library', () => {
    const draft = {...films[0]!, id: `drafts.${films[0]!.id}`};
    const source = [draft, films[1]!];
    const result = applyWorkGallery(source, [{_key: 'selected', workId: films[0]!.id, cardSize: 'large', treatment: 'framed'}]);
    expect(result[0]).toMatchObject({id: draft.id, featuredOnHome: true, homeOrder: 1, homeCardSize: 'large', homeTreatment: 'framed', homeOffset: 0});
    expect(result[1]!.featuredOnHome).toBe(false);
    expect(source[0]!.homeOrder).toBe(draft.homeOrder);
    expect(applyWorkGallery(source, []).every(item => !item.featuredOnHome)).toBe(true);
    expect(applyWorkGallery(source, undefined).map(item => item.id)).toEqual(source.map(item => item.id));
  });
  it('prefers unified Work records over legacy duplicates', () => {
    const current = {_id: 'w', _type: 'work', slug: {current: 'same'}};
    const legacy = {_id: 'p', _type: 'project', slug: 'same'};
    expect(preferUnifiedWorkDocuments([legacy, current, {}, {_id: 'fallback'}])).toEqual([current, {_id: 'fallback'}]);
    expect(preferUnifiedWorkDocuments([current, legacy])).toEqual([current]);
  });
  it('omits missing references and uses the selected photo doorway', () => {
    const result = buildWorkGallery([photo], [...placements, {_key: 'missing', workId: 'missing', cardSize: 'standard', treatment: 'standard'}]);
    expect(result).toHaveLength(3);
    expect(result[1]!.image).toEqual(chosen[1]!.image);
    expect(result[1]!.href).toBe(`/work/${photo.slug}/${chosen[1]!.id}`);
    expect(buildWorkGallery([photo])[0]!.image).toEqual(photo.photos.find(item => item.id === photo.defaultPhotoId)!.image);
  });
  it('interleaves photos with films in prototype fallback', () => {
    const selected = films.slice(0, 2);
    const mixed = buildPrototypeWorkGallery([...selected, photo], photo.id);
    expect(mixed.slice(0, 4).map(item => item.work.id)).toEqual([selected[0]!.id, photo.id, selected[1]!.id, photo.id]);
    expect(buildPrototypeWorkGallery(selected, 'missing')).toEqual(buildWorkGallery(selected));
  });
});
describe('BTS editorial selections', () => {
  it('preserves authored order and deduplicates without changing the gallery', () => {
    const entries = [photos[2]!, photos[0]!, photos[2]!, photos[1]!];
    const original = structuredClone(entries);
    expect(buildBtsItems(entries, 3, true).map(item => item.image.src)).toEqual([photos[2]!.image.src, photos[0]!.image.src, photos[1]!.image.src]);
    expect(entries).toEqual(original);
  });
  it('alternates shoots, caps the mosaic and chooses appropriate media sizes', () => {
    const other = buildWorkGallery([films[0]!])[0]!;
    const result = buildBtsItems([...photos, other], 3);
    expect(result.map(item => item.project)).toEqual([photo.title, other.work.title, photo.title]);
    expect(result[0]!.time).toBe('05:30');
    expect(result.at(-1)!.time).toBe('21:45');
    expect(result[0]!.video).toBeUndefined();
    expect(result[1]!.video).toBe(other.work.cover.previewVideo);
    expect(result[0]!.thumb).not.toBe(result[0]!.large);
  });
  it('handles empty or missing images and a single frame', () => {
    expect(buildBtsItems([], 15)).toEqual([]);
    expect(buildBtsItems(photos, 0)).toEqual([]);
    expect(buildBtsItems([{...photos[0]!, image: {...photos[0]!.image, src: ''}}, photos[1]!])).toHaveLength(1);
    expect(buildBtsItems([photos[0]!])[0]!.time).toBe('05:30');
    expect(formatClock(1440)).toBe('00:00');
    expect(formatClock(59.6)).toBe('01:00');
  });
});
describe('review deployment and media fallbacks', () => {
  it('keeps the review prefix for high-resolution splash renditions', () => {
    const result = splashRendition('/newwork/media/video-previews/oliver/mercury-helen-mayer/gallery-cut-08s.mp4');
    expect(result?.video).toBe('/newwork/media/video-previews/oliver/mercury-helen-mayer/splash-cut-08s.mp4');
    expect(result?.poster).toContain('/newwork/media/');
    expect(splashRendition(undefined)).toBeUndefined();
    expect(splashRendition('https://cdn.sanity.io/files/project/video.mp4')).toBeUndefined();
  });
  it('adds and removes only the configured base', async () => {
    vi.stubEnv('BASE_URL', '/newwork/');
    const {withBase, withoutBase} = await import('../../src/lib/base-path');
    expect(withBase('/contact')).toBe('/newwork/contact');
    expect(withBase('work/arc')).toBe('/newwork/work/arc');
    expect(withBase('https://example.com')).toBe('https://example.com');
    expect(withoutBase('/newwork')).toBe('/');
    expect(withoutBase('/newwork/contact')).toBe('/contact');
    expect(withoutBase('/newwork-elsewhere')).toBe('/newwork-elsewhere');
  });
  it('uses safe disposable observers without browser preferences', () => {
    const data = vi.fn(); const motion = vi.fn();
    const stopData = observeReducedData(data, {});
    const stopMotion = observeReducedMotion(motion);
    expect(data).toHaveBeenCalledWith(false);
    expect(motion).toHaveBeenCalledWith(false);
    stopData(); stopMotion();
  });
});
