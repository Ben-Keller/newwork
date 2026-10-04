import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { root } from './lib.mjs';

const config = JSON.parse(await readFile(path.join(root, 'hosting/config.json'), 'utf8'));
const base = (process.env.PAGES_BASE_PATH ?? config.base).replace(/\/$/u, '');
const directory = path.join(root, 'pages-dist');
const port = Number(process.env.PAGES_PREVIEW_PORT || 4326);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.xml': 'application/xml' };
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (base && pathname !== base && !pathname.startsWith(base + '/')) throw new Error('Not found');
    const relative = pathname.slice(base.length).replace(/^\/+/, '');
    let target = path.resolve(directory, relative || '.');
    if (target !== directory && !target.startsWith(directory + path.sep)) throw new Error('Not found');
    if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
    const bytes = await readFile(target);
    response.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' });
    response.end(bytes);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/html' });
    response.end(await readFile(path.join(directory, '404.html')));
  }
}).listen(port, '127.0.0.1', () => console.log(`Versioned Pages preview: http://127.0.0.1:${port}${base}/`));
