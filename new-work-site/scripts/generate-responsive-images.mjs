import {readdir, stat} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve('public/media/images');
// This landscape photograph is cropped tightly into a portrait gallery tile.
// Keep the original resolution with a high-quality delivery encode that fits
// the source-image budget. The private original remains untouched.
const rainbowName = 'michael-wow-rainbow-pavement.webp';
const rainbowOriginal = path.resolve('../assets/source/michael/portfolio-expansion', rainbowName);
const rainbowOutput = path.join(root, 'michael/portfolio-expansion', rainbowName);
try {
  const originalStat = await stat(rainbowOriginal);
  const outputStat = await stat(rainbowOutput);
  const metadata = await sharp(rainbowOutput).metadata();
  if (metadata.width !== 2339 || outputStat.size > 1024 * 1024 || originalStat.mtimeMs > outputStat.mtimeMs) {
    await sharp(rainbowOriginal).webp({quality: 98, effort: 6, smartSubsample: true}).toFile(rainbowOutput);
  }
} catch (error) {
  // The private original is optional in CI; the checked-in canonical image
  // remains sufficient to reproduce all delivery formats there.
  if (error.code !== 'ENOENT') throw error;
}
const targetWidths = [320, 480, 720, 960, 1200];
const formats = [
  {
    extension: 'webp',
    options: {quality: 82, effort: 5},
  },
  {
    extension: 'avif',
    options: {quality: 58, effort: 3, chromaSubsampling: '4:2:0'},
  },
];

async function filesWithin(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const files = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesWithin(target) : [target];
  }));
  return files.flat();
}

const originals = (await filesWithin(root)).filter((file) =>
  /\.webp$/iu.test(file) && !/\.w\d+\.webp$/iu.test(file),
);

const tasks = [];
for (const source of originals) {
  const metadata = await sharp(source).metadata();
  if (!metadata.width) continue;
  const sourceStat = await stat(source);
  for (const format of formats) {
    const widths = format.extension === 'avif'
      ? [...targetWidths.filter((candidate) => candidate < metadata.width), metadata.width]
      : targetWidths.filter((candidate) => candidate < metadata.width);
    for (const width of widths) {
      const widthSuffix = width === metadata.width ? '' : `.w${width}`;
      const output = source.replace(/\.webp$/iu, `${widthSuffix}.${format.extension}`);
      if (output === source) continue;
      tasks.push(async () => {
        let current;
        try {
          current = await stat(output);
        } catch {
          current = undefined;
        }
        if (current && current.mtimeMs >= sourceStat.mtimeMs) return false;
        const pipeline = sharp(source).resize({width, withoutEnlargement: true});
        const options = path.basename(source) === rainbowName
          ? (format.extension === 'avif'
            ? {quality: 80, effort: 4, chromaSubsampling: '4:4:4'}
            : {quality: 94, effort: 5})
          : format.options;
        await pipeline[format.extension](options).toFile(output);
        return true;
      });
    }
  }
}

let generated = 0;
let cursor = 0;
const workers = Array.from({length: Math.min(4, tasks.length)}, async () => {
  while (cursor < tasks.length) {
    const task = tasks[cursor];
    cursor += 1;
    if (await task()) generated += 1;
  }
});
await Promise.all(workers);

console.log(`Responsive image derivatives ready: ${originals.length} originals, ${generated} files generated.`);
