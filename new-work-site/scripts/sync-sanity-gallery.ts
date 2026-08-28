import {createClient} from '@sanity/client';
import {excludedWorkGalleryItemIdList} from '../src/content/local/gallery-curation';
import {
  DEFAULT_SANITY_DATASET,
  DEFAULT_SANITY_PROJECT_ID,
  SANITY_API_VERSION,
} from '../src/lib/sanity-config';

type Reference = {_type: 'reference'; _ref: string};
type GalleryPlacement = {
  _key?: string;
  _type?: string;
  cardSize?: string;
  treatment?: string;
  assetId?: string;
  assetKind?: string;
  assetSlug?: string;
  workId?: string;
  workSlug?: string;
};
type GalleryAsset = {
  _id: string;
  kind: 'image' | 'video';
  slug: string;
  workId: string;
  workSlug: string;
  projectOrder?: number;
};
type WorkPage = {
  _id: string;
  gallery?: GalleryPlacement[];
};

const args = new Set(process.argv.slice(2).filter((argument) => argument !== '--'));
const apply = args.has('--apply') && !args.has('--dry-run');
const dryRun = !apply;
const projectId = process.env.PUBLIC_SANITY_PROJECT_ID?.trim() || DEFAULT_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET?.trim() || DEFAULT_SANITY_DATASET;
const token = process.env.SANITY_AUTH_TOKEN?.trim() || process.env.SANITY_TOKEN?.trim();
const excluded = new Set<string>(excludedWorkGalleryItemIdList);

if (apply && !token) {
  throw new Error('SANITY_AUTH_TOKEN or SANITY_TOKEN is required to apply the gallery sync.');
}

function reference(_ref: string): Reference {
  return {_type: 'reference', _ref};
}

function hasValue(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function cardSize(value: unknown): string {
  return hasValue(value) && ['standard', 'tall', 'large', 'wide'].includes(value) ? value : 'standard';
}

function treatment(value: unknown): string {
  return hasValue(value) && ['standard', 'masked', 'framed', 'poster'].includes(value) ? value : 'standard';
}

function isExcluded(workSlug?: string, assetSlug?: string): boolean {
  if (workSlug && excluded.has(workSlug)) return true;
  if (assetSlug && excluded.has(assetSlug)) return true;
  return Boolean(workSlug && assetSlug && excluded.has(`${workSlug}--${assetSlug}`));
}

function isProjectPlacement(placement: GalleryPlacement): boolean {
  return typeof placement._key === 'string' && /^project-\d+$/u.test(placement._key);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: SANITY_API_VERSION,
  perspective: 'published',
  useCdn: false,
  ...(apply && token ? {token} : {}),
});

const snapshotQuery = `{
  "workPage": *[_id == "workPage"][0]{
    _id,
    gallery[]{
      _key,
      _type,
      cardSize,
      treatment,
      "assetId": asset->_id,
      "assetKind": asset->kind,
      "assetSlug": asset->slug.current,
      "workId": asset->project->_id,
      "workSlug": asset->project->slug.current
    }
  },
  "assets": *[
    _type == "mediaItem" &&
    !(_id in path("drafts.**")) &&
    defined(project) &&
    defined(slug.current) &&
    length(slug.current) > 0 &&
    kind in ["image", "video"] &&
    (decorative == true || length(coalesce(alt, "")) > 0) &&
    select(
      kind == "image" => defined(image.asset),
      kind == "video" => defined(poster.asset) && (defined(videoFile.asset) || defined(videoUrl)),
      false
    )
  ] | order(projectOrder asc, _createdAt asc) {
    _id,
    kind,
    "slug": slug.current,
    "workId": project->_id,
    "workSlug": project->slug.current,
    projectOrder
  }
}`;

const snapshot = await client.fetch<{workPage: WorkPage | null; assets: GalleryAsset[]}>(snapshotQuery);
if (!snapshot.workPage?._id || !Array.isArray(snapshot.workPage.gallery)) {
  throw new Error('The published workPage gallery is missing.');
}

const videosByWork = new Map<string, GalleryAsset>();
for (const asset of snapshot.assets) {
  if (asset.kind === 'video' && !videosByWork.has(asset.workId)) videosByWork.set(asset.workId, asset);
}

const targetGallery: Array<{
  _key: string;
  _type: 'workPlacement';
  asset: Reference;
  cardSize: string;
  treatment: string;
}> = [];
const selectedAssetIds = new Set<string>();
const removed: string[] = [];
const promoted: Array<{key: string; from: string; to: string}> = [];
const duplicateSkipped: string[] = [];

snapshot.workPage.gallery.forEach((placement, index) => {
  const key = placement._key || `gallery-${index + 1}`;
  if (!placement.assetId || !placement.workId) {
    removed.push(`${key}:missing-asset-or-project`);
    return;
  }
  if (isExcluded(placement.workSlug, placement.assetSlug)) {
    removed.push(`${key}:${placement.assetSlug || placement.workSlug || placement.assetId}`);
    return;
  }

  let assetId = placement.assetId;
  let assetSlug = placement.assetSlug || placement.assetId;
  const preferredVideo = isProjectPlacement(placement) ? videosByWork.get(placement.workId) : undefined;
  if (preferredVideo && preferredVideo._id !== assetId) {
    promoted.push({key, from: assetSlug, to: preferredVideo.slug});
    assetId = preferredVideo._id;
    assetSlug = preferredVideo.slug;
  }

  if (selectedAssetIds.has(assetId)) {
    duplicateSkipped.push(`${key}:${assetSlug}`);
    return;
  }
  selectedAssetIds.add(assetId);
  targetGallery.push({
    _key: key,
    _type: 'workPlacement',
    asset: reference(assetId),
    cardSize: cardSize(placement.cardSize),
    treatment: treatment(placement.treatment),
  });
});

const plan = {
  dryRun,
  projectId,
  dataset,
  before: snapshot.workPage.gallery.length,
  after: targetGallery.length,
  removed,
  promoted,
  duplicateSkipped,
  videoPlacementsAfter: targetGallery.filter((placement) => {
    const asset = snapshot.assets.find((candidate) => candidate._id === placement.asset._ref);
    return asset?.kind === 'video';
  }).length,
};

if (!apply) {
  console.log(JSON.stringify(plan, null, 2));
  console.log('Run with --apply to update the published Sanity Work-page gallery.');
} else {
  await client
    .patch(snapshot.workPage._id)
    .set({gallery: targetGallery})
    .commit({autoGenerateArrayKeys: false});
  console.log(JSON.stringify({...plan, applied: true, dryRun: false}, null, 2));
}
