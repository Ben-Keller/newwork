import {rename, stat} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const atlas = path.resolve('public/media/atlas-grid.webp');
const maximumWidth = 3200;
const maximumBytes = 450 * 1024;
const before = await stat(atlas);
const metadata = await sharp(atlas).metadata();

if ((metadata.width ?? 0) <= maximumWidth && before.size <= maximumBytes) {
  console.log(`About reel atlas is already optimized: ${metadata.width} px, ${before.size} bytes.`);
  process.exit(0);
}

const temporary = `${atlas}.optimizing.webp`;
await sharp(atlas)
  .resize({width: maximumWidth, withoutEnlargement: true})
  .webp({quality: 72, effort: 6})
  .toFile(temporary);

const after = await stat(temporary);
if (after.size >= before.size) {
  throw new Error('About reel atlas optimization did not reduce the source; refusing to replace it.');
}

await rename(temporary, atlas);
console.log(`About reel atlas optimized: ${before.size} -> ${after.size} bytes.`);
