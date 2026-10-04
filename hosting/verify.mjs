import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { filesWithin, references, root } from './lib.mjs';

const config = JSON.parse(await readFile(path.join(root, 'hosting/config.json'), 'utf8'));
const site = new URL(process.env.PAGES_SITE_URL || config.site).origin;
const base = (process.env.PAGES_BASE_PATH ?? config.base).replace(/\/$/u, '');
const output = path.join(root, 'pages-dist');
const versions = config.includeV1 ? ['v1', 'v2'] : ['v2'];
const failures = new Set();
let pages = 0;
for (const version of versions) {
  const directory = path.join(output, version);
  const mount = `${base}/${version}`;
  const files = await filesWithin(directory);
  for (const file of files.filter((file) => /\.(?:html|css|js)$/u.test(file))) {
    const relative = path.relative(directory, file);
    if (relative.endsWith('.html')) pages++;
    const sourceUrl = new URL(`${mount}/${relative.replace(/index\.html$/u, '')}`, site);
    const content = await readFile(file, 'utf8');
    for (const reference of references(content)) {
      let url;
      // Reel catalogs store unprefixed media inputs and pass them through
      // withBase at runtime. Verify those assets within this version as well.
      const resolvedReference = file.endsWith('.js') && reference.startsWith('/media/')
        ? `${mount}${reference}` : reference;
      try { url = new URL(resolvedReference, /^(?:_astro|media)\//u.test(reference) ? `${site}${mount}/` : sourceUrl); } catch { continue; }
      if (url.origin !== site) continue;
      if (url.pathname !== mount && !url.pathname.startsWith(mount + '/')) {
        failures.add(`${version}/${relative} escapes its version: ${reference}`);
        continue;
      }
      const target = path.resolve(directory, '.' + decodeURIComponent(url.pathname.slice(mount.length) || '/'));
      if (target !== directory && !target.startsWith(directory + path.sep)) {
        failures.add(`Unsafe local path: ${reference}`);
        continue;
      }
      try {
        const info = await stat(target);
        if (info.isDirectory()) await stat(path.join(target, 'index.html'));
      } catch {
        // Astro's 404 canonical uses /404 while its output is 404.html.
        if (url.pathname === `${mount}/404` && files.includes(path.join(directory, '404.html'))) continue;
        failures.add(`${version}/${relative} references missing ${reference}`);
      }
    }
  }
}
const home = await readFile(path.join(output, 'index.html'), 'utf8');
assert(home.includes(`url=${base}/${config.defaultVersion}/`), 'The root must open the configured version.');
assert((await stat(path.join(output, '.nojekyll'))).isFile());
const v2 = await readFile(path.join(output, 'v2/index.html'), 'utf8');
assert(v2.includes('data-bts'), 'V2 must contain the current BTS carousel.');
assert(!v2.includes('data-manifesto'), 'V2 must not restore the removed placeholder section.');
if (config.includeV1) {
  const v1 = await readFile(path.join(output, 'v1/index.html'), 'utf8');
  assert(v1.includes('data-manifesto'), 'The frozen V1 homepage changed.');
  assert(!v1.includes('data-bts='), 'V2 content leaked into V1.');
}
const bytes = (await Promise.all((await filesWithin(output)).map(async (file) => (await stat(file)).size)))
  .reduce((sum, size) => sum + size, 0);
assert(bytes < 1024 ** 3, 'The Pages artifact exceeds 1 GiB.');
if (failures.size) throw new Error(`Version isolation/output checks failed:\n${[...failures].join('\n')}`);
console.log(`Verified ${pages} versioned pages, independent local assets, root redirect, and ${(bytes / 1024 ** 2).toFixed(1)} MiB artifact.`);
