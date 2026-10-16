const normalizeTransitionKey = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 80);
  return normalized || 'untitled';
};

export const projectMediaTransitionName = (slug: string): string =>
  `project-${normalizeTransitionKey(slug)}-media`;

export const projectTitleTransitionName = (slug: string): string =>
  `project-${normalizeTransitionKey(slug)}-title`;

export const projectTransitionNames = (slug: string): Readonly<{ media: string; title: string }> => ({
  media: projectMediaTransitionName(slug),
  title: projectTitleTransitionName(slug),
});
