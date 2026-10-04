import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const textFile = /\.(?:html|css|js|json|svg|xml|txt|webmanifest)$/iu;

export async function filesWithin(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlinks are not allowed in Pages output: ${target}`);
    return entry.isDirectory() ? filesWithin(target) : [target];
  }))).flat();
}

export function references(text) {
  text = text.replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&');
  const values = [];
  for (const match of text.matchAll(/\b(href|src|srcset|data-[\w-]*(?:src|source|poster))=["']([^"']+)["']/giu)) {
    if (match[2].startsWith('data:')) continue;
    if (match[1].startsWith('data-') && !/^(?:https?:\/\/|\/|\.\/)/u.test(match[2])) continue;
    values.push(...match[2].split(',').map((value) => value.trim().split(/\s/u)[0]));
  }
  for (const match of text.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/gu)) values.push(match[1]);
  for (const match of text.matchAll(/["'`]((?:\.{1,2}\/)?[\w./@-]+\.(?:js|css|woff2?|png|webp|avif|svg|mp4|json))(?:\?[^"'`]*)?["'`]/gu)) {
    values.push(match[1]);
  }
  return [...new Set(values.filter((value) => !/^(?:data:|#|%23)/iu.test(value) && !value.includes('${')))];
}

export function redirectHtml(destination, title = 'New Work', share = {}) {
  const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  const social = share.image ? `<meta property="og:type" content="website"><meta property="og:title" content="${escape(title)}"><meta property="og:url" content="${escape(share.url)}"><meta property="og:image" content="${escape(share.image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="New Work Agency"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:image" content="${escape(share.image)}"><meta name="twitter:image:alt" content="New Work Agency">` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><title>${title}</title><link rel="canonical" href="${destination}">${social}<meta http-equiv="refresh" content="0;url=${destination}"><script>location.replace(${JSON.stringify(destination)} + location.search + location.hash)</script></head><body><a href="${destination}">Continue to ${title}</a></body></html>\n`;
}
