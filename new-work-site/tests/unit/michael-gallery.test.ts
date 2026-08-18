import { describe, expect, it } from 'vitest';
import {
  developmentGalleryPlaceholder,
  michaelDevelopmentGallery,
} from '../../src/content/local/michael-gallery';

describe('standalone photography gallery', () => {
  it('gives every source photograph a stable route id and complete placeholder copy', () => {
    const ids = michaelDevelopmentGallery.map((item) => item.id);
    const placeholders = michaelDevelopmentGallery.map((_, index) => developmentGalleryPlaceholder(index));

    expect(ids).toHaveLength(25);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(placeholders.map((placeholder) => placeholder.title)).size).toBe(placeholders.length);
    expect(placeholders.every((placeholder) =>
      placeholder.title.length > 0
      && placeholder.description.length > 0
      && placeholder.opening.length > 0
      && placeholder.closing.length > 0)).toBe(true);
  });
});
