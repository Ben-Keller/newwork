import type { APIRoute } from 'astro';
import { getContentMode, getSiteContent } from '../lib/content';

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = site || new URL('http://localhost:4321');
  if (getContentMode() !== 'production') {
    return new Response('User-agent: *\nDisallow: /\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const content = await getSiteContent();
  const defaultNoIndex = Boolean(content.settings.defaultSeo.noIndex);
  const hasIndexablePage =
    !defaultNoIndex ||
    content.projects.some((project) => !(project.seo?.noIndex ?? defaultNoIndex)) ||
    (
      content.settings.notesEnabled &&
      content.notes.some((note) => !(note.seo?.noIndex ?? defaultNoIndex))
    );
  const sitemap = hasIndexablePage
    ? `Sitemap: ${new URL(`${import.meta.env.BASE_URL}sitemap-index.xml`, siteUrl).href}\n`
    : '';
  const body = `User-agent: *\nAllow: /\nDisallow: /404\n${sitemap}`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
