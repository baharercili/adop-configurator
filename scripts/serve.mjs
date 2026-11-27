import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
function option(name, fallback) {
  const index = process.argv.indexOf(name);
  const assigned = process.argv.find(value => value.startsWith(name + '='));
  return index !== -1 ? (process.argv[index + 1] ?? '') : assigned ? assigned.slice(name.length + 1) : fallback;
}
if (process.argv.includes('--help')) {
  console.log('Serve the website: node scripts/serve.mjs [--dir _site|web] [--base /adop-configurator/] [--port 4173] [--host 127.0.0.1]');
  process.exit(0);
}
let defaultDirectory = '_site';
try { await stat(path.join(root, '_site', 'index.html')); } catch { defaultDirectory = 'web'; }
const directory = path.resolve(root, option('--dir', defaultDirectory));
let recordedBase = '/';
try { recordedBase = JSON.parse(await readFile(path.join(directory, 'deployment-manifest.json'), 'utf8')).base; } catch {}
const requestedBase = option('--base', recordedBase);
const base = requestedBase && requestedBase !== '/' ? '/' + requestedBase.replace(/^\/+|\/+$/g, '') + '/' : '/';
if (!/^\/(?:[A-Za-z0-9._~-]+\/)*$/.test(base) || base.split('/').some(part => part === '.' || part === '..')) throw new Error('Invalid mount path.');
const port = Number(option('--port', process.env.PORT ?? '4173'));
const host = option('--host', '127.0.0.1');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port.');
await stat(path.join(directory, 'index.html'));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.glb': 'model/gltf-binary' };
async function existing(file) { try { return await stat(file); } catch { return null; } }
const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
    const url = new URL(request.url, 'http://localhost');
    if (base !== '/' && url.pathname === base.slice(0, -1)) { response.writeHead(302, { Location: base + url.search }); response.end(); return; }
    if (!url.pathname.startsWith(base)) { response.writeHead(404); response.end('Not found'); return; }
    let relative;
    try { relative = decodeURIComponent(url.pathname.slice(base.length)); } catch { response.writeHead(400); response.end('Invalid URL'); return; }
    if (relative.includes('\0') || relative.split('/').some(part => part === '..') || relative.startsWith('.')) { response.writeHead(404); response.end('Not found'); return; }
    let file = path.resolve(directory, relative || '.');
    if (file !== directory && !file.startsWith(directory + path.sep)) { response.writeHead(404); response.end('Not found'); return; }
    let info = await existing(file);
    if (info?.isDirectory()) { file = path.join(file, 'index.html'); info = await existing(file); }
    if (!info && !path.extname(relative)) {
      file = path.resolve(directory, relative.replace(/\/$/, '') + '.html');
      info = await existing(file);
      if (info && relative.endsWith('/')) { response.writeHead(302, { Location: url.pathname.slice(0, -1) + url.search }); response.end(); return; }
    }
    if (!info?.isFile()) {
      const fallback = path.join(directory, '404.html');
      if (await existing(fallback)) { response.writeHead(404, { 'Content-Type': types['.html'] }); if (request.method === 'HEAD') response.end(); else createReadStream(fallback).pipe(response); }
      else { response.writeHead(404); response.end('Not found'); }
      return;
    }
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (request.method === 'HEAD') response.end(); else createReadStream(file).pipe(response);
  } catch (error) { response.writeHead(500); response.end('Could not serve file'); console.error(error.message); }
});
server.listen(port, host, () => console.log(`ADØP: http://${host}:${port}${base} (${path.relative(root, directory)}/)`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
