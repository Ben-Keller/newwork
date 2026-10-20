import {withBase} from './base-path';
import type {ClientLogoView, ImageView, ProjectView} from './types';

type FooterProject = Pick<ProjectView, 'id' | 'title' | 'slug' | 'client' | 'cover'>;
export interface FooterLogoLink extends ClientLogoView {
  href?: string;
  projectTitle?: string;
  image?: ImageView;
}

/** Resolve only against the projects that have pages in this build. Existing
 * logos without a reference can match one exact client label; never guess
 * between multiple projects or replace an editor's explicit destination. */
export function resolveFooterLogos(
  logos: readonly ClientLogoView[],
  projects: readonly FooterProject[],
): FooterLogoLink[] {
  return logos.map(logo => {
    const matches = logo.projectId
      ? projects.filter(project => project.id === logo.projectId)
      : logo.url ? [] : projects.filter(project =>
        project.client?.trim().toLowerCase() === logo.name.trim().toLowerCase());
    const project = matches.length === 1 ? matches[0] : undefined;
    if (!project?.slug) return {...logo, href: logo.projectId ? undefined : logo.url};
    const image = project.cover.previewPosterOverride || project.cover.poster;
    return {...logo, href: withBase(`/work/${project.slug}`), projectTitle: project.title,
      image: image.src ? image : undefined};
  });
}
