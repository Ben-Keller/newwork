import {createHash} from 'node:crypto';
import {appendFile, readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

// Public, published content only. No CMS or GitHub credential is required.
export async function publishedContent() {
  const url = new URL('https://7un4plyu.api.sanity.io/v2025-08-04/data/query/production');
  url.searchParams.set('query', '*[!(_id in path("drafts.**")) && !(_id in path("versions.**")) && _type in ["siteSettings", "workPage", "footerSettings", "contactPage", "work", "mediaItem", "sanity.imageAsset", "sanity.fileAsset"]] | order(_id) {_id, _rev, _updatedAt}');
  url.searchParams.set('perspective', 'published');
  const response = await fetch(url, {signal: AbortSignal.timeout(30000)});
  if (!response.ok) throw new Error(`Published content check failed: HTTP ${response.status}`);
  const {result} = await response.json();
  if (!Array.isArray(result) || !result.length || result.some(doc => !doc._id || !doc._rev || !doc._updatedAt)) throw new Error('Invalid published content response.');
  return {
    contentFingerprint: createHash('sha256').update(JSON.stringify(result)).digest('hex'),
    contentUpdatedAt: result.map(doc => doc._updatedAt).sort().at(-1),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const content = await publishedContent();
  let changed = true;
  if (process.argv.includes('--check-live')) {
    const config = JSON.parse(await readFile(new URL('./review-release.json', import.meta.url), 'utf8'));
    try {
      const response = await fetch(`${config.site}${config.base}/release-info.json?check=${Date.now()}`, {cache: 'no-store', signal: AbortSignal.timeout(30000)});
      if (response.ok) {
        const live = await response.json();
        changed = live.contentFingerprint !== content.contentFingerprint || live.commit !== process.env.GITHUB_SHA;
      }
    } catch {
      // A temporarily unavailable site should trigger recovery, not hide changes.
      changed = true;
    }
  }
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
  console.log(JSON.stringify({...content, changed}));
}
