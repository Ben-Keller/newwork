import {readdir, stat} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve('public/media/images');
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
        await pipeline[format.extension](format.options).toFile(output);
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
