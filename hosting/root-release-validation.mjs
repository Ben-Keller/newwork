import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import path from 'node:path';
import {filesWithin, references} from './lib.mjs';

export async function verifyRootRelease(output, config, {production = false} = {}) {
  const info = JSON.parse(await readFile(path.join(output, 'release-info.json'), 'utf8'));
  assert.equal(info.source, config.source, 'Unexpected release source.');
  assert.equal(info.origin, config.site, 'Unexpected canonical origin.');
  assert.equal(info.base, config.base || '/', 'The release must use its configured base path.');
  const base = info.base === '/' ? '' : info.base;
  assert(['prototype', 'production'].includes(info.mode), 'Unknown content mode.');
  if (production) assert.equal(info.mode, 'production', 'Only published CMS content may deploy.');
  const files = await filesWithin(output);
  const html = files.filter(file => file.endsWith('.html'));
  const home = await readFile(path.join(output, 'index.html'), 'utf8');
  assert(!home.includes('http-equiv="refresh"'), 'The root must render the site, not a version redirect.');
  assert.equal((home.match(/data-project-card(?:\s|>)/gu) || []).length, 16, 'The release must contain sixteen gallery tiles.');
  const canonical = home.match(/<link\b[^>]*rel="canonical"[^>]*>/iu)?.[0].match(/href="([^"]+)"/iu)?.[1];
  assert.equal(canonical, `${config.site}${base}/`, 'Homepage canonical must match the configured address.');
  const failures = [];
  for (const file of html) {
    const text = await readFile(file, 'utf8');
    const rel = path.relative(output, file);
    const legacy = config.legacyPrefixes.some(prefix => rel.startsWith(`${prefix}/`));
    if (!legacy && /(?:href|src)="\/(?:newwork\/)?v[12]\//u.test(text)) failures.push(`${rel}: primary route uses a review prefix`);
    if ((info.mode === 'prototype' || config.indexable === false) && !text.includes('noindex')) failures.push(`${rel}: review content must remain noindex`);
    for (const ref of references(text)) {
      if (!ref.startsWith('/') || ref.startsWith('//')) continue;
      const fullPath = decodeURIComponent(ref.split(/[?#]/u)[0]);
      if (base && fullPath !== base && !fullPath.startsWith(`${base}/`)) {
        failures.push(`${rel}: reference escapes the review path ${ref}`);
        continue;
      }
      const pathname = fullPath.slice(base.length);
      const candidates = [path.join(output, pathname), path.join(output, pathname, 'index.html')];
      if (!(await Promise.all(candidates.map(file => access(file).then(() => true, () => false)))).some(Boolean)) failures.push(`${rel}: missing local reference ${ref}`);
    }
  }
  if (info.mode === 'production' && config.indexable !== false) {
    assert(!/<meta[^>]*name="robots"[^>]*content="[^"]*noindex/iu.test(home), 'Production homepage must allow indexing.');
    await access(path.join(output, 'sitemap-index.xml'));
  }
  for (const prefix of config.legacyPrefixes) {
    const redirect = await readFile(path.join(output, prefix, 'index.html'), 'utf8');
    assert(redirect.includes(`location.replace("${base}/" + location.search + location.hash)`), `${prefix} must preserve query and fragment.`);
  }
  if (failures.length) throw new Error([...new Set(failures)].join('\n'));
  return {pages: html.length, mode: info.mode};
}
