import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { isIndexableCanonicalHtml } from './src/lib/seo.ts';
import { PLAYER_FRAME_HOSTS, SANITY_CDN_HOSTS, isSafeEmail } from './shared/content-policy.ts';

// Astro evaluates this file before exposing Vite's import.meta.env values. Load
// the project dotenv file explicitly so the documented `.env` workflow and the
// shell/Cloudflare environment follow the same canonical and sitemap guards.
const configMode = process.argv.includes('build') || process.argv.includes('preview')
  ? 'production'
  : 'development';
const fileEnvironment = loadEnv(configMode, process.cwd(), '');
const environmentValue = (key) => process.env[key] ?? fileEnvironment[key];

const contentMode = environmentValue('PUBLIC_CONTENT_MODE') || 'prototype';
if (!['prototype', 'preview', 'production'].includes(contentMode)) {
  throw new Error('PUBLIC_CONTENT_MODE must be prototype, preview, or production.');
}
const isProductionContent = contentMode === 'production';
const configuredSite = environmentValue('PUBLIC_SITE_URL')?.trim();
const configuredBaseValue = environmentValue('PUBLIC_BASE_PATH')?.trim() || '/';
const configuredContactEmail = environmentValue('PUBLIC_CONTACT_EMAIL')?.trim();

if (
  !configuredBaseValue.startsWith('/') ||
  configuredBaseValue.includes('..') ||
  /[?#]/u.test(configuredBaseValue)
) {
  throw new Error('PUBLIC_BASE_PATH must be an absolute URL path without traversal, a query, or a hash.');
}
const base = configuredBaseValue === '/'
  ? '/'
  : `/${configuredBaseValue.replace(/^\/+|\/+$/gu, '')}`;

if (configuredContactEmail && !isSafeEmail(configuredContactEmail)) {
  throw new Error('PUBLIC_CONTACT_EMAIL must be a valid email address without line breaks.');
}

if (contentMode !== 'prototype') {
  if (!environmentValue('PUBLIC_SANITY_PROJECT_ID') || !environmentValue('PUBLIC_SANITY_DATASET')) {
    throw new Error(`${contentMode} content mode requires PUBLIC_SANITY_PROJECT_ID and PUBLIC_SANITY_DATASET.`);
  }
}

if (contentMode === 'preview' && !environmentValue('SANITY_PREVIEW_TOKEN')) {
  throw new Error('PUBLIC_CONTENT_MODE=preview requires the server-only SANITY_PREVIEW_TOKEN.');
}

if (isProductionContent && !configuredSite) {
  throw new Error('PUBLIC_CONTENT_MODE=production requires PUBLIC_SITE_URL to be the approved HTTPS site origin.');
}

const site = configuredSite || 'http://localhost:4321';
const outputDirectory = fileURLToPath(new globalThis.URL('./dist/', import.meta.url));
const analyticsConfigured = isProductionContent && Boolean(environmentValue('PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN')?.trim());

function generatedHeaders() {
  const analyticsScript = analyticsConfigured ? ' https://static.cloudflareinsights.com' : '';
  const analyticsConnect = analyticsConfigured ? ' https://cloudflareinsights.com' : '';
  const sanityCdn = SANITY_CDN_HOSTS.map((host) => `https://${host}`).join(' ');
  const playerFrames = PLAYER_FRAME_HOSTS.map((host) => `https://${host}`).join(' ');
  return `/*
  Cache-Control: public, max-age=0, must-revalidate
  Content-Security-Policy: default-src 'self'; img-src 'self' data: ${sanityCdn} https://i.vimeocdn.com https://i.ytimg.com; media-src 'self' ${sanityCdn}; frame-src ${playerFrames}; script-src 'self' 'unsafe-inline'${analyticsScript}; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.api.sanity.io https://*.apicdn.sanity.io${analyticsConnect}; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests
  Referrer-Policy: strict-origin-when-cross-origin
  X-Content-Type-Options: nosniff
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  X-Frame-Options: SAMEORIGIN

/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/media/*
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
`;
}

async function keepIndexableCanonicalPage(item) {
  const pathname = new globalThis.URL(item.url).pathname;
  const pathnameWithoutBase = base !== '/' && (pathname === base || pathname.startsWith(`${base}/`))
    ? pathname.slice(base.length) || '/'
    : pathname;
  const route = decodeURIComponent(pathnameWithoutBase).replace(/^\/+|\/+$/gu, '');
  const outputFile = route
    ? path.join(outputDirectory, route, 'index.html')
    : path.join(outputDirectory, 'index.html');

  try {
    const html = await readFile(outputFile, 'utf8');
    return isIndexableCanonicalHtml(html, item.url) ? item : undefined;
  } catch {
    // A URL without a generated HTML page cannot be a canonical page entry.
    return undefined;
  }
}

if (isProductionContent) {
  let canonical;
  try {
    canonical = new globalThis.URL(site);
  } catch {
    throw new Error('PUBLIC_SITE_URL must be a valid absolute HTTPS URL in production content mode.');
  }
  if (
    canonical.protocol !== 'https:' ||
    canonical.username ||
    canonical.password ||
    canonical.pathname !== '/' ||
    canonical.search ||
    canonical.hash
  ) {
    throw new Error('PUBLIC_SITE_URL must be a bare HTTPS origin in production content mode.');
  }
}

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'never',
  integrations: [
    ...(isProductionContent ? [sitemap({ serialize: keepIndexableCanonicalPage })] : []),
    {
      name: 'new-work-security-headers',
      hooks: {
        'astro:build:done': async () => {
          await writeFile(path.join(outputDirectory, '_headers'), generatedHeaders(), 'utf8');
        },
      },
    },
  ],
});
