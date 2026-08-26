import {createClient} from '@sanity/client';

export const sanityClient = createClient({
  projectId: '7un4plyu',
  dataset: 'production',
  apiVersion: '2026-08-26',
  useCdn: false,
});
