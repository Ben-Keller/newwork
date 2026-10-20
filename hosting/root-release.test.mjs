import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {redirectHtml} from './lib.mjs';
import {verifyRootRelease} from './root-release-validation.mjs';
const config = {source: 'new-work-site', site: 'https://newworkagency.com', legacyPrefixes: ['v1','v2','newwork','newwork/v1','newwork/v2']};
async function fixture(t, mode = 'production') {
  const dir = await mkdtemp(path.join(tmpdir(), 'newwork-release-'));
  t.after(() => rm(dir, {recursive: true, force: true}));
  await writeFile(path.join(dir, 'release-info.json'), JSON.stringify({source: config.source, origin: config.site, base: '/', mode}));
  await writeFile(path.join(dir, 'index.html'), `<link rel="canonical" href="${config.site}/">${mode === 'prototype' ? '<meta name="robots" content="noindex">' : ''}${'<article data-project-card></article>'.repeat(16)}`);
  await writeFile(path.join(dir, 'sitemap-index.xml'), '<sitemapindex/>');
  for (const prefix of config.legacyPrefixes) {
    await mkdir(path.join(dir, prefix), {recursive: true});
    await writeFile(path.join(dir, prefix, 'index.html'), redirectHtml('/'));
  }
  return dir;
}
test('accepts production and all legacy bookmark prefixes', async t => {
  const dir = await fixture(t);
  assert.deepEqual(await verifyRootRelease(dir, config, {production: true}), {pages: 6, mode: 'production'});
});
test('prototype is reviewable but cannot enter the production publisher', async t => {
  const dir = await fixture(t, 'prototype');
  await verifyRootRelease(dir, config);
  await assert.rejects(verifyRootRelease(dir, config, {production: true}), /Only published CMS/);
});
test('rejects missing assets and a wrongly packaged source', async t => {
  const dir = await fixture(t);
  const home = path.join(dir, 'index.html');
  await writeFile(home, `${await readFile(home, 'utf8')}<img src="/missing.webp">`);
  await assert.rejects(verifyRootRelease(dir, config), /missing local reference/);
  await writeFile(path.join(dir, 'release-info.json'), JSON.stringify({source: 'retired-website-copy', origin: config.site, base: '/', mode: 'production'}));
  await assert.rejects(verifyRootRelease(dir, config), /Unexpected release source/);
});
test('rejects noindex production and an incorrect gallery count', async t => {
  const dir = await fixture(t);
  const home = path.join(dir, 'index.html');
  const original = await readFile(home, 'utf8');
  await writeFile(home, `${original}<meta name="robots" content="noindex">`);
  await assert.rejects(verifyRootRelease(dir, config), /allow indexing/);
  await writeFile(home, original.replace('<article data-project-card></article>', ''));
  await assert.rejects(verifyRootRelease(dir, config), /sixteen gallery/);
});

test('review releases keep all links inside the repository base and stay noindex', async t => {
  const dir = await fixture(t);
  const review = {...config, site: 'https://ben-keller.github.io', base: '/newwork', indexable: false};
  await writeFile(path.join(dir, 'release-info.json'), JSON.stringify({source: review.source, origin: review.site, base: review.base, mode: 'production'}));
  const home = `<link rel="canonical" href="${review.site}/newwork/"><meta name="robots" content="noindex">${'<article data-project-card></article>'.repeat(16)}`;
  await writeFile(path.join(dir, 'index.html'), home);
  for (const prefix of review.legacyPrefixes) await writeFile(path.join(dir, prefix, 'index.html'), redirectHtml('/newwork/'));
  await verifyRootRelease(dir, review, {production: true});
  await writeFile(path.join(dir, 'index.html'), `${home}<a href="/contact">Contact</a>`);
  await assert.rejects(verifyRootRelease(dir, review), /escapes the review path/);
  await writeFile(path.join(dir, 'index.html'), home.replace('<meta name="robots" content="noindex">', ''));
  await assert.rejects(verifyRootRelease(dir, review), /must remain noindex/);
});
