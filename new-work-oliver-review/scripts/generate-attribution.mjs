import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = path.join(root, 'src/content/local/asset-manifest.csv');
const outputPath = path.join(root, 'src/content/local/asset-attribution.json');

function parseCsv(source) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const csv = await readFile(inputPath, 'utf8');
const [headers, ...rows] = parseCsv(csv);
if (!headers) throw new Error('Asset manifest has no header row.');

const get = (row, name) => row[headers.indexOf(name)] ?? '';
const records = {};

for (const row of rows) {
  if (get(row, 'asset_layer') !== 'web-ready') continue;
  const relativePath = get(row, 'local_path');
  const width = Number(get(row, 'width_px')) || undefined;
  const height = Number(get(row, 'height_px')) || undefined;
  const durationSeconds = Number(get(row, 'duration_seconds')) || undefined;
  records[relativePath] = {
    id: get(row, 'asset_id'),
    person: get(row, 'person'),
    project: get(row, 'project'),
    assetLayer: get(row, 'asset_layer'),
    kind: get(row, 'kind'),
    path: relativePath,
    derivedFrom: get(row, 'derived_from'),
    formatOrCodec: get(row, 'format_or_codec'),
    width,
    height,
    durationSeconds,
    sourceReportedDimensionsOrDuration: get(row, 'source_reported_dimensions_or_duration'),
    sourcePage: get(row, 'source_page'),
    sourceAssetUrl: get(row, 'source_media_url'),
    derivation: get(row, 'derivation'),
    rightsStatus: get(row, 'rights_status'),
    usageStatus: get(row, 'publish_status'),
    notes: get(row, 'notes'),
    checksum: get(row, 'sha256'),
  };
}

await writeFile(outputPath, `${JSON.stringify(records, null, 2)}\n`);
console.log(`Generated ${Object.keys(records).length} attribution records.`);
