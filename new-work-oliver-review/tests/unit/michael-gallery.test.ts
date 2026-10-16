import {describe, expect, it} from 'vitest';
import {michaelPhotoWork, michaelWorkPhotos} from '../../src/content/local/michael-gallery';

describe('prototype photography Work', () => {
  it('stores every source photograph inside one Work item with a stable doorway id', () => {
    const ids = michaelWorkPhotos.map((photo) => photo.id);

    expect(michaelPhotoWork.template).toBe('photo');
    expect(michaelPhotoWork.photos).toHaveLength(25);
    expect(new Set(ids).size).toBe(ids.length);
    expect(michaelPhotoWork.photos.map((photo) => photo.id)).toEqual(ids);
  });

  it('uses an image from the same photo set as the editor-selected default', () => {
    expect(michaelPhotoWork.photos.some((photo) => photo.id === michaelPhotoWork.defaultPhotoId)).toBe(true);
    expect(michaelPhotoWork.cover.poster.src).toBe(michaelPhotoWork.photos[0]?.image.src);
  });

  it('preserves the reviewed source order used by existing Work-page placements', () => {
    expect(michaelPhotoWork.photos[1]?.id).toBe('michael-wow-rainbow-pavement');
    expect(michaelPhotoWork.photos[7]?.id).toBe('michael-8023156-uniform-portrait');
  });
});
