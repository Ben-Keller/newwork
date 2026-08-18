import type { CaptionBlock, ContentBlockView, ContentMode, ProjectView } from '../../lib/types';
import type { ProjectMediaBlock, ProjectPresentation } from '../../lib/project-layout';

export interface ProjectTemplateProps {
  project: ProjectView;
  mode: ContentMode;
  heroBlock: ProjectMediaBlock;
  heroCaptions: CaptionBlock[];
  blocks: ContentBlockView[];
  presentation: ProjectPresentation;
  previous?: ProjectView;
  next?: ProjectView;
}
