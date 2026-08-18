import {readdir, readFile, stat} from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const failures = [];

async function filesWithin(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const files = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesWithin(target) : [target];
  }));
  return files.flat();
}

const files = await filesWithin(root);
const htmlFiles = files.filter((file) => file.endsWith('.html'));
const inspectableFiles = files.filter((file) =>
  /\.(?:css|html|js|json|map|txt|xml)$/u.test(file) || ['_headers', '_redirects'].includes(path.basename(file)),
);
if (!htmlFiles.length) failures.push('No HTML output was generated.');

const prohibited = [
  'SANITY_WRITE_TOKEN',
  'SANITY_PREVIEW_TOKEN',
  'manifestNotes',
  'manifestAssetId',
  'assetRightsApprovalEvidence',
  'assetRightsTerritories',
  'rightsApprovalEvidence',
  'rightsApprovedAt',
  'sourcePage',
  'sourcePath',
  'sha256',
  'source_media_url',
];

for (const file of inspectableFiles) {
  const contents = await readFile(file, 'utf8');
  for (const token of prohibited) {
    if (contents.includes(token)) failures.push(`${path.relative(root, file)} leaks prohibited token ${token}.`);
  }
}

for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const imageSources = [...html.matchAll(/(?:src|srcset)="([^"]+)"/giu)].flatMap((match) =>
    match[1].split(',').map((value) => value.trim().split(/\s+/u)[0]).filter((value) => value.startsWith('/media/')),
  );
  for (const source of imageSources) {
    const pathname = decodeURIComponent(source.split(/[?#]/u)[0]);
    const target = path.resolve(root, `.${pathname}`);
    if (!target.startsWith(`${root}${path.sep}`)) {
      failures.push(`${path.relative(root, file)} references an unsafe asset path ${pathname}.`);
      continue;
    }
    try {
      await stat(target);
    } catch {
      failures.push(`${path.relative(root, file)} references missing asset ${pathname}.`);
    }
  }
}

const headers = await readFile(path.join(root, '_headers'), 'utf8');
if (!headers.includes("default-src 'self'")) failures.push('Generated security headers are missing the CSP.');
if (!process.env.PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN && headers.includes('static.cloudflareinsights.com')) {
  failures.push('Analytics hosts are present without an analytics token.');
}

const mode = process.env.PUBLIC_CONTENT_MODE || 'prototype';
if (mode !== 'production') {
  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8');
    if (!/name="robots" content="noindex, nofollow"/iu.test(html)) {
      failures.push(`${path.relative(root, file)} is not noindex outside production.`);
    }
  }
  if (files.some((file) => path.basename(file) === 'sitemap-index.xml' || path.basename(file) === 'sitemap-0.xml')) {
    failures.push('A sitemap was emitted outside production mode.');
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Verified ${htmlFiles.length} HTML pages and ${files.length} built files.`);
}
