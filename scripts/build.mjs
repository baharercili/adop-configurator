import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'web');
const output = path.join(root, '_site');

function option(name, fallback) {
  const exact = process.argv.indexOf(name);
  if (exact !== -1) return process.argv[exact + 1] ?? '';
  const assigned = process.argv.find(value => value.startsWith(name + '='));
  return assigned ? assigned.slice(name.length + 1) : fallback;
}

function normalizeBase(value = '') {
  if (!value || value === '/') return '/';
  const parts = value.replace(/^\/+|\/+$/g, '').split('/');
  if (parts.some(part => !/^[A-Za-z0-9._~-]+$/.test(part) || part === '.' || part === '..')) {
    throw new Error('Base must be a URL path such as /adop-configurator/.');
  }
  return '/' + parts.join('/') + '/';
}

if (process.argv.includes('--help')) {
  console.log('Build the static website: node scripts/build.mjs [--base /adop-configurator/]');
  process.exit(0);
}

const base = normalizeBase(option('--base', process.env.BASE_PATH ?? ''));
await stat(path.join(source, 'index.html'));
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, {
  recursive: true,
  filter: entry => !['.DS_Store', '.git', '.openai', 'Thumbs.db'].includes(path.basename(entry)),
});

async function files(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...await files(path.join(directory, entry.name), relative));
    else if (entry.isFile()) result.push(relative);
  }
  return result.sort();
}

const sourceFiles = await files(output);
const pages = sourceFiles.filter(file => file.endsWith('.html'));
const routes = [];

function pageHead(directory) {
  const pageBase = base + (directory === '.' ? '' : directory + '/');
  // Aliases are physical directories on Pages. Normalize only their address before
  // the retained application reads pathname; keep every query and fragment intact.
  const bootstrap = `(function(){var b=${JSON.stringify(base)},p=location.pathname;if(p.indexOf(b)!==0)return;var r=p.slice(b.length);if(/^(?:v2\\/)?(?:anasayfa|moduller|modul|kombinasyonlar|ilham|gorunum)\\/$/.test(r)){history.replaceState(history.state,'',p.slice(0,-1)+location.search+location.hash);}})();`;
  return `<base href="${pageBase}"><script data-adop-pages-path>${bootstrap}</script>`;
}

for (const page of pages) {
  const original = await readFile(path.join(source, page), 'utf8');
  const directory = path.posix.dirname(page);
  const html = original.replace(/<head(?:\s[^>]*)?>/i, match => match + pageHead(directory));
  if (html === original) throw new Error('Missing <head> in ' + page);
  await writeFile(path.join(output, page), html);
  const stem = path.posix.basename(page, '.html');
  if (stem === 'index') {
    routes.push({ page, route: base + (directory === '.' ? '' : directory + '/') });
    continue;
  }
  const alias = path.posix.join(directory === '.' ? '' : directory, stem, 'index.html');
  await mkdir(path.dirname(path.join(output, alias)), { recursive: true });
  await writeFile(path.join(output, alias), html);
  routes.push({ page, alias, route: base + alias.replace(/index\.html$/, '') });
}

const notFound = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sayfa bulunamadı — ADØP</title><style>body{font:18px system-ui,sans-serif;color:#30352b;background:#f6f5f1;padding:10vw;line-height:1.6}a{color:inherit}h1{font-size:clamp(2rem,6vw,4rem)}</style></head><body><h1>Bu sayfa bulunamadı.</h1><a href="${base}anasayfa.html">ADØP ana sayfasına dön ↗</a></body></html>`;
await writeFile(path.join(output, '404.html'), notFound);
await writeFile(path.join(output, '.nojekyll'), '');
const manifest = { base, source: 'web/', output: '_site/', sourceFileCount: sourceFiles.length, htmlPageCount: pages.length, routes };
await writeFile(path.join(output, 'deployment-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Built ${sourceFiles.length} source files and ${routes.length} routes into _site/ (base: ${base}).`);
