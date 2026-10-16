import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteDirectory = path.resolve(scriptDirectory, '..');
const logoPath = path.join(siteDirectory, 'public/media/brand/social-wordmark.svg');
const outputPaths = [
  path.join(siteDirectory, 'public/media/brand/social-share-v2.png'),
  path.join(siteDirectory, '../assets/web-ready/brand/social-share-v2.png'),
];

// Keep the current outlined/solid wordmark within the centered safe area. Platforms
// may show the full 1200x630 card or crop it to a square thumbnail; both retain
// the same undistorted artwork and generous breathing room.
const logo = await sharp(logoPath)
  .resize({ width: 520, height: 420, fit: 'inside', withoutEnlargement: true })
  .png()
  .toBuffer();

const canvas = sharp({
  create: {
    width: 1200,
    height: 630,
    channels: 4,
    background: '#f7f6f2',
  },
}).composite([{ input: logo, gravity: 'center' }]).png({ compressionLevel: 9 });

const output = await canvas.toBuffer();
await Promise.all(outputPaths.map(async (outputPath) => {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(output).toFile(outputPath);
}));

console.log(`Generated ${outputPaths.length} social share assets.`);
