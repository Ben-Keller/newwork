import {readFile, readdir, stat} from 'node:fs/promises';
import {Buffer} from 'node:buffer';
import path from 'node:path';

const mediaRoot = path.resolve('public/media');
const limits = {
  image: 1 * 1024 * 1024,
  preview: 2.5 * 1024 * 1024,
  reelAtlas: 450 * 1024,
};

async function filesWithin(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const files = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesWithin(target) : [target];
  }));
  return files.flat();
}

const failures = [];
const files = await filesWithin(mediaRoot);
for (const file of files) {
  const relative = path.relative(mediaRoot, file);
  const fileStat = await stat(file);
  if (relative === 'atlas-grid.webp' && fileStat.size > limits.reelAtlas) {
    failures.push(`${relative} exceeds the 450 KiB About-reel atlas budget`);
  }
  if (/^images\//u.test(relative) && /\.webp$/iu.test(file) && !/\.w\d+\.webp$/iu.test(file)) {
    if (fileStat.size > limits.image) failures.push(`${relative} exceeds the 1 MiB image-source budget`);
  }
  if (!/\.mp4$/iu.test(file)) continue;
  const isPreview = /^video-previews\//u.test(relative);
  if (!isPreview) {
    failures.push(`${relative} is a full local film; project films must use an approved streaming host`);
    continue;
  }
  const limit = limits.preview;
  if (fileStat.size > limit) {
    failures.push(`${relative} exceeds the 2.5 MiB preview-video budget`);
  }
  const bytes = await readFile(file);
  const moov = bytes.indexOf(Buffer.from('moov'));
  const mdat = bytes.indexOf(Buffer.from('mdat'));
  if (moov < 0 || mdat < 0 || moov > mdat) failures.push(`${relative} is not fast-start optimized`);
}

if (failures.length) {
  throw new Error(`Media budget verification failed:\n- ${failures.join('\n- ')}`);
}

console.log(`Verified media budgets and fast-start delivery across ${files.length} files.`);
