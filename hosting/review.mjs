import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { connect } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const ports = { baseline: 4325, revision: 4327, comparison: 4328 };
const children = [];
async function ready(port, name) {
  const listening = await new Promise(resolve => {
    const socket = connect({ host: '127.0.0.1', port });
    const finish = value => { socket.destroy(); resolve(value); };
    socket.once('connect', () => finish(true)); socket.once('error', () => finish(false));
    socket.setTimeout(1000, () => finish(false));
  });
  if (!listening) return false;
  const response = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(15000) });
  const html = await response.text();
  const matches = response.ok && html.includes('data-logo-work-page')
    && (name === 'revision' ? html.includes('data-home-identity') : !html.includes('data-home-identity'));
  if (!matches) throw new Error(`Port ${port} is occupied by a different preview. Stop it before starting the comparison.`);
  return true;
}
for (const [name, directory] of [['baseline','new-work-site'],['revision','new-work-oliver-review']]) {
  const port = ports[name];
  if (await ready(port, name)) { console.log(`Using existing ${name} preview on ${port}`); continue; }
  const child = spawn(process.execPath, ['node_modules/astro/bin/astro.mjs', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: path.join(root, directory), stdio: 'inherit', env: { ...process.env, ASTRO_DEV_BACKGROUND: '0', PUBLIC_CONTENT_MODE: 'prototype' },
  });
  children.push(child);
  child.on('exit', code => { if (code) console.error(`${name} exited (${code}); other previews were not stopped.`); });
}
const html = await readFile(new URL('./review.html', import.meta.url));
const server = createServer((request, response) => {
  if (request.url !== '/') { response.writeHead(404); response.end('Not found'); return; }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(html);
});
server.listen(ports.comparison, '127.0.0.1', () => console.log(`Compare: http://127.0.0.1:${ports.comparison}/\nExisting: http://127.0.0.1:${ports.baseline}/\nOliver review: http://127.0.0.1:${ports.revision}/`));
const stop = () => { children.forEach(child => child.kill('SIGTERM')); server.close(() => process.exit(0)); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
