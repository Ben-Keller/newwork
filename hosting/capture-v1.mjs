// Explicit, one-time archival operation. Deployment never recaptures the live site.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { filesWithin, references, root, textFile } from './lib.mjs';

const source = 'https://ben-keller.github.io/newwork/';
const commit = 'd5da0e5aefd65ca576a8b09c6355f09fd0a82bb9';
const release = path.join(root, 'versions/v1');
const snapshot = path.join(release, 'snapshot');
try {
  await stat(snapshot);
  if (!process.argv.includes('--resume')) throw new Error('V1 already exists. Refusing to overwrite the frozen release.');
  try {
    await stat(path.join(release, 'manifest.json'));
    throw new Error('A completed V1 archive cannot be recaptured.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await mkdir(snapshot, { recursive: true });
const temporary = await mkdtemp(path.join(tmpdir(), 'newwork-v1-'));
try {
  const archive = execFileSync('git', ['archive', commit, 'new-work-site/public'], { cwd: root, maxBuffer: 128 * 1024 * 1024 });
  execFileSync('tar', ['-xf', '-', '-C', temporary], { input: archive });
  // Include dynamically addressed letter kits and other public assets, too.
  // These bytes come from the deployed commit, never from the V2 working tree.
  await cp(path.join(temporary, 'new-work-site/public'), snapshot, { recursive: true });
} finally {
  await rm(temporary, { recursive: true, force: true });
}

const base = new URL(source);
const pending = new Map();
const downloaded = new Set();
const enqueue = (value, parent, optional = false) => {
  let url;
  try { url = new URL(value, parent); } catch { return; }
  if (url.origin !== base.origin || !(url.pathname + '/').startsWith(base.pathname)) return;
  url.search = '';
  url.hash = '';
  if (!downloaded.has(url.href)) pending.set(url.href, { url, optional });
};
enqueue(source, source);
for (const name of ['404.html', 'robots.txt', 'sitemap-index.xml', 'sitemap-0.xml']) enqueue(name, source, true);
while (pending.size) {
  const batch = [...pending.values()].slice(0, 6);
  for (const { url } of batch) { pending.delete(url.href); downloaded.add(url.href); }
  await Promise.all(batch.map(async ({ url, optional }) => {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok && !(url.pathname.endsWith('/404.html') && response.status === 404)) {
      if (optional && response.status === 404) return;
      throw new Error(`${response.status} capturing ${url.href}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const relative = decodeURIComponent(url.pathname.slice(base.pathname.length));
    const filename = !relative || !path.extname(relative) ? path.join(relative, 'index.html') : relative;
    const output = path.resolve(snapshot, filename);
    if (!output.startsWith(snapshot + path.sep)) throw new Error(`Unsafe capture path: ${url.href}`);
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, bytes);
    if (!textFile.test(output)) return;
    const text = bytes.toString('utf8');
    for (const ref of references(text)) {
      const parent = /^(?:_astro|media)\//u.test(ref) ? source : url;
      enqueue(ref, parent);
    }
    for (const match of text.matchAll(/<loc>([^<]+)<\/loc>/gu)) enqueue(match[1], url);
  }));
  console.log(`Captured ${downloaded.size} URLs; ${pending.size} queued.`);
}
const files = {};
for (const file of (await filesWithin(snapshot)).sort()) {
  files[path.relative(snapshot, file)] = createHash('sha256').update(await readFile(file)).digest('hex');
}
await writeFile(path.join(release, 'manifest.json'), JSON.stringify({
  source, commit,
  deployment: 'https://github.com/Ben-Keller/newwork/actions/runs/33130567979',
  capturedAt: new Date().toISOString(), files,
}, null, 2) + '\n');
console.log(`Frozen V1: ${Object.keys(files).length} files. No CMS data was queried or exported.`);
