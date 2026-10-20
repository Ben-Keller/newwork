import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import horizontal from '../../public/media/brand/oliver-horizontal.svg?raw';
import { usesApprovedWordmark, wordmarkGlyphs } from '../../src/lib/brand/wordmark-artwork';

describe('shared CMS wordmark artwork', () => {
  it('recognizes the exact approved content-addressed upload', () => {
    const hash = createHash('sha1').update(horizontal).digest('hex');
    expect(usesApprovedWordmark({ src: `https://cdn.sanity.io/files/project/production/${hash}.svg` })).toBe(true);
    expect(usesApprovedWordmark()).toBe(true);
    expect(wordmarkGlyphs.map(letter => letter.glyph).join('')).toBe('newwork.');
  });
  it('uses the replacement image in both states when the editor changes the artwork', () => {
    expect(usesApprovedWordmark({ src: 'https://cdn.sanity.io/files/project/production/replacement.svg' })).toBe(false);
    expect(usesApprovedWordmark({ src: 'https://cdn.sanity.io/images/project/production/replacement.png' })).toBe(false);
  });
});
