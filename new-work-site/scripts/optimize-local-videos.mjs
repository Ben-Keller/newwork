import {spawnSync} from 'node:child_process';
import {copyFile, mkdir, readdir, rename, stat} from 'node:fs/promises';
import path from 'node:path';

const canonicalRoot = path.resolve('../assets/web-ready');
const publicRoot = path.resolve('public/media');
const previewBudget = 2.5 * 1024 * 1024;

async function filesWithin(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const files = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesWithin(target) : [target];
  }));
  return files.flat();
}

function probe(file) {
  const result = spawnSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height',
    '-show_entries', 'format=size',
    '-of', 'json',
    file,
  ], {encoding: 'utf8'});
  if (result.status !== 0) throw new Error(result.stderr || `Unable to inspect ${file}`);
  const data = JSON.parse(result.stdout);
  return {
    size: Number(data.format?.size || 0),
    width: Number(data.streams?.[0]?.width || 0),
    height: Number(data.streams?.[0]?.height || 0),
  };
}

const files = (await filesWithin(path.join(canonicalRoot, 'video-previews')))
  .filter((file) => /\.mp4$/iu.test(file));
let optimized = 0;
let copied = 0;

for (const file of files) {
  const relative = path.relative(canonicalRoot, file);
  const maximumDimension = 960;
  const budget = previewBudget;
  const before = probe(file);
  const needsOptimization = before.size > budget || Math.max(before.width, before.height) > maximumDimension;

  if (needsOptimization) {
    const temporary = `${file}.optimizing.mp4`;
    const result = spawnSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-i', file,
      '-vf', `scale='min(${maximumDimension},iw)':-2`,
      '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '27',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      temporary,
    ], {stdio: 'inherit'});
    if (result.status !== 0) throw new Error(`Unable to optimize ${relative}`);
    const after = await stat(temporary);
    if (after.size >= before.size) {
      throw new Error(`Optimization did not reduce ${relative}; refusing to replace it.`);
    }
    await rename(temporary, file);
    optimized += 1;
  }

  const publicFile = path.join(publicRoot, relative);
  await mkdir(path.dirname(publicFile), {recursive: true});
  await copyFile(file, publicFile);
  copied += 1;
}

console.log(`Video optimization complete: ${optimized} encoded, ${copied} public mirrors synchronized.`);
