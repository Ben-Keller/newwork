import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root,'reviews/oliver-2026-10/baseline-manifest.json'),'utf8'));
const sourceOnly = process.argv.includes('--source-only');
const generated = file => file.startsWith('artifacts/qa/') || /^public\/media\/images\/.*\.avif$/u.test(file);
const files = sourceOnly ? manifest.files.filter(file => !generated(file.path)) : manifest.files;
const changed = [];
for (const file of files) {
  try { if (createHash('sha256').update(await readFile(path.join(root,manifest.source,file.path))).digest('hex') !== file.sha256) changed.push(file.path); }
  catch { changed.push(file.path); }
}
const ignored = new Set(['node_modules', 'dist', '.astro', 'coverage', 'test-results', 'playwright-report', '.lighthouseci', '.DS_Store']);
const recorded = new Set(manifest.files.map(file => file.path));
async function scan(directory, prefix = '') {
  const additions = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name) || (entry.name.startsWith('.env') && entry.name !== '.env.example')) continue;
    const relative = prefix + entry.name;
    if (sourceOnly && generated(relative)) continue;
    if (entry.isDirectory()) additions.push(...await scan(path.join(directory, entry.name), relative + '/'));
    else if (!recorded.has(relative)) additions.push(relative);
  }
  return additions;
}
const added = await scan(path.join(root, manifest.source));
changed.push(...added.map(file => `added: ${file}`));
if (changed.length) { console.error('Existing-version files changed:',changed); process.exitCode=1; }
else console.log(`Baseline intact: ${files.length} ${sourceOnly ? "source" : "captured"} files match the October review snapshot.`);
