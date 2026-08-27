import {describe, expect, it} from 'vitest';
import {michaelPhotoWork} from '../../src/content/local/michael-gallery';
import {buildWorkGallery} from '../../src/lib/content';
import {selectWorkAsset, selectWorkPhoto} from '../../src/lib/project-layout';

describe('unified Project asset doorways', () => {
  it('treats linked images and videos as the same kind of front-gallery doorway', () => {
    const [imagePhoto, videoPhoto] = michaelPhotoWork.photos;
    const work = {
      ...michaelPhotoWork,
      assets: [
        {
          id: 'asset.image',
          slug: 'image-asset',
          kind: 'image' as const,
          poster: imagePhoto!.image,
        },
        {
          id: 'asset.video',
          slug: 'video-asset',
          kind: 'video' as const,
          poster: videoPhoto!.image,
          video: {src: 'https://cdn.sanity.io/files/example/video.mp4', poster: videoPhoto!.image},
        },
      ],
      photos: [],
      defaultPhotoId: undefined,
    };
    const entries = buildWorkGallery([work], [
      {_key: 'image', workId: work.id, assetId: 'asset.image', cardSize: 'standard', treatment: 'standard'},
      {_key: 'video', workId: work.id, assetId: 'asset.video', cardSize: 'large', treatment: 'framed'},
    ]);

    expect(entries.map((entry) => [entry.asset?.kind, entry.href])).toEqual([
      ['image', `/work/${work.slug}/image-asset`],
      ['video', `/work/${work.slug}/video-asset`],
    ]);
    expect(selectWorkAsset(work, 'video-asset').cover).toMatchObject({
      poster: videoPhoto!.image,
      mediaType: 'motion',
      previewVideo: 'https://cdn.sanity.io/files/example/video.mp4',
    });
  });

  it('creates multiple gallery placements that all point to one Work document', () => {
    const [first, second] = michaelPhotoWork.photos;
    const entries = buildWorkGallery([michaelPhotoWork], [
      {_key: 'first', workId: michaelPhotoWork.id, photoId: first!.id, cardSize: 'standard', treatment: 'standard'},
      {_key: 'second', workId: michaelPhotoWork.id, photoId: second!.id, cardSize: 'large', treatment: 'framed'},
    ]);

    expect(entries).toHaveLength(2);
    expect(entries.every((entry) => entry.work === michaelPhotoWork)).toBe(true);
    expect(entries.map((entry) => entry.href)).toEqual([
      `/work/${michaelPhotoWork.slug}/${first!.id}`,
      `/work/${michaelPhotoWork.slug}/${second!.id}`,
    ]);
  });

  it('promotes the clicked photo and puts the rest of the shoot below it', () => {
    const selectedPhoto = michaelPhotoWork.photos[1]!;
    const selectedWork = selectWorkPhoto(michaelPhotoWork, selectedPhoto.id);

    expect(selectedWork.id).toBe(michaelPhotoWork.id);
    expect(selectedWork.cover.poster.src).toBe(selectedPhoto.image.src);
    expect(selectedWork.defaultPhotoId).toBe(selectedPhoto.id);
    expect(selectedWork.contentBlocks).toHaveLength(michaelPhotoWork.photos.length - 1);
    expect(selectedWork.contentBlocks.some((block) => (
      'image' in block && block.image.src === selectedPhoto.image.src
    ))).toBe(false);
  });

  it('uses the editor-selected default when no gallery doorway overrides it', () => {
    const selectedWork = selectWorkPhoto(michaelPhotoWork);
    const defaultPhoto = michaelPhotoWork.photos.find((photo) => photo.id === michaelPhotoWork.defaultPhotoId);
    expect(selectedWork.cover.poster.src).toBe(defaultPhoto?.image.src);
  });
});
