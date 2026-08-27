import {createClient} from '@sanity/client';
import {SANITY_RELEASE_AUDIT_QUERY} from '../sanity/queries';
import {auditPublishedSanity} from '../src/lib/content/sanity-audit';
import {
  DEFAULT_SANITY_DATASET,
  DEFAULT_SANITY_PROJECT_ID,
  SANITY_API_VERSION,
} from '../src/lib/sanity-config';

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID?.trim() || DEFAULT_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET?.trim() || DEFAULT_SANITY_DATASET;

const client = createClient({
  projectId,
  dataset,
  apiVersion: SANITY_API_VERSION,
  perspective: 'published',
  useCdn: false,
});

try {
  const snapshot = await client.fetch(SANITY_RELEASE_AUDIT_QUERY);
  const result = auditPublishedSanity(snapshot);

  for (const warning of result.warnings) console.warn(`Warning: ${warning}`);
  if (result.errors.length) {
    console.error('Published Sanity content is not release-ready:');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    const {galleryPlacements, publicNotes, publicWorks, works} = result.summary;
    console.log(
      `Sanity release audit passed: ${publicWorks}/${works} Work documents public, `
      + `${galleryPlacements} gallery placements, ${publicNotes} public Notes.`,
    );
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Sanity release audit could not query ${projectId}/${dataset}: ${message}`);
  process.exitCode = 1;
}
