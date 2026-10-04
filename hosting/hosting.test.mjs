import assert from 'node:assert/strict';
import { test } from 'node:test';
import { references, redirectHtml } from './lib.mjs';

test('discovers module, image, and encoded CSS asset references', () => {
  const refs = references(`<link href="/newwork/_astro/site.css"><img srcset="/newwork/media/a.webp 320w, /newwork/media/b.webp 640w"><div style="mask:url(&quot;/newwork/media/mask.svg&quot;)"></div>import "./child.js";`);
  assert(refs.includes('/newwork/_astro/site.css'));
  assert(refs.includes('/newwork/media/a.webp'));
  assert(refs.includes('/newwork/media/b.webp'));
  assert(refs.includes('/newwork/media/mask.svg'));
  assert(refs.includes('./child.js'));
});

test('does not crawl metadata, SVG fragments, or dynamic URL expressions', () => {
  assert.deepEqual(references('<div data-title-source="pp-neue-montreal"></div>new URL(e,location.href); url(%23n); url(${image});'), []);
});

test('root and legacy redirects preserve query and fragment with a no-JS fallback', () => {
  const html = redirectHtml('/newwork/v2/');
  assert(html.includes('location.replace("/newwork/v2/" + location.search + location.hash)'));
  assert(html.includes('http-equiv="refresh" content="0;url=/newwork/v2/"'));
  assert(html.includes('<a href="/newwork/v2/">'));
});
