import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { filesWithin, redirectHtml, root, textFile } from './lib.mjs';

const config = JSON.parse(await readFile(path.join(root, 'hosting/config.json'), 'utf8'));
const configuredSite = process.env.PAGES_SITE_URL || config.site;
const base = process.env.PAGES_BASE_PATH ?? config.base;
const origin = new URL(configuredSite);
if (origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password
  || !['https:', 'http:'].includes(origin.protocol)) throw new Error('PAGES_SITE_URL must be a bare origin.');
const site = origin.origin;
if (!/^\/(?:[\w-]+(?:\/[\w-]+)*)?$/u.test(base)) throw new Error('Invalid PAGES_BASE_PATH.');
const prefix = base === '/' ? '' : base;
const output = path.join(root, 'pages-dist');
const versions = config.includeV1 ? ['v1', 'v2'] : ['v2'];
if (!versions.includes(config.defaultVersion)) throw new Error('The default version must be included in this build.');

const run = (args, env = {}) => {
  const result = spawnSync('pnpm', args, { cwd: path.join(root, 'new-work-site'), env: { ...process.env, ...env }, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`pnpm ${args.join(' ')} failed.`);
};
const v2Environment = {
  PUBLIC_SITE_URL: site,
  PUBLIC_BASE_PATH: `${prefix}/v2`,
  // Preserve the content being reviewed locally. Switching to the CMS is an
  // explicit config change; a Sanity publish cannot silently replace this V2.
  PUBLIC_CONTENT_MODE: config.v2ContentMode,
};
run(['build'], v2Environment);
run(['verify:dist'], v2Environment);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(root, 'new-work-site/dist'), path.join(output, 'v2'), { recursive: true });

if (config.includeV1) {
  const archive = path.join(root, 'versions/v1');
  const manifest = JSON.parse(await readFile(path.join(archive, 'manifest.json'), 'utf8'));
  const source = new URL(manifest.source);
  const sourceBase = source.pathname.replace(/\/$/u, '');
  const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const rebase = new RegExp(`${escape(source.origin + sourceBase)}|${escape(sourceBase)}(?=[/\\s"'?#<\x60]|$)`, 'gu');
  const snapshot = path.join(archive, 'snapshot');
  const files = await filesWithin(snapshot);
  if (files.length !== Object.keys(manifest.files).length) throw new Error('V1 snapshot file inventory changed.');
  for (const file of files) {
    const relative = path.relative(snapshot, file);
    let bytes = await readFile(file);
    if (createHash('sha256').update(bytes).digest('hex') !== manifest.files[relative]) throw new Error(`V1 snapshot changed: ${relative}`);
    if (textFile.test(file)) {
      bytes = Buffer.from(bytes.toString('utf8').replace(rebase, (match) =>
        `${match.startsWith('http') ? site : ''}${prefix}/v1`));
    }
    const target = path.join(output, 'v1', relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
    // Preserve old bookmarked pages while keeping all of their assets in V1.
    if (relative.endsWith('/index.html')) {
      const route = relative.slice(0, -'/index.html'.length);
      if (/^(?:v1|v2)(?:\/|$)/u.test(route)) throw new Error('A legacy route overlaps a version mount.');
      const redirect = path.join(output, relative);
      await mkdir(path.dirname(redirect), { recursive: true });
      await writeFile(redirect, redirectHtml(`${prefix}/v1/${route}`, 'New Work V1'));
    }
  }
}

const defaultHome = await readFile(path.join(output, config.defaultVersion, 'index.html'), 'utf8');
const shareImage = defaultHome.match(/<meta property="og:image" content="([^"]+)"/u)?.[1]?.replaceAll('&amp;', '&');
await writeFile(path.join(output, 'index.html'), redirectHtml(`${prefix}/${config.defaultVersion}/`, 'New Work Agency', {
  image: shareImage,
  url: `${site}${prefix}/${config.defaultVersion}/`,
}));
await writeFile(path.join(output, '.nojekyll'), '');
await writeFile(path.join(output, '404.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><title>Page not found — New Work</title></head><body><h1>Page not found</h1><p><a href="${prefix}/v2/">Visit New Work</a>${config.includeV1 ? ` · <a href="${prefix}/v1/">Visit V1</a>` : ''}</p></body></html>\n`);
console.log(`Pages artifact ready: ${output} (${versions.join(', ')}; root opens ${config.defaultVersion}).`);
