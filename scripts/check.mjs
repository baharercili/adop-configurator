import { open, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const built = process.argv.includes('--built');
const site = path.join(root, built ? '_site' : 'web');
const source = path.join(root, 'web');
const manifest = built ? JSON.parse(await readFile(path.join(site, 'deployment-manifest.json'), 'utf8')) : { base: '/', routes: [] };
const base = manifest.base;
const origin = 'https://adop.example';
const failures = [];
const counts = { html: 0, javascript: 0, css: 0, galleryItems: 0, galleryImages: 0, sourceFiles: 0 };
function requireThat(condition, message) { if (!condition) failures.push(message); }
async function files(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['.DS_Store', '.git', '.openai', 'Thumbs.db'].includes(entry.name)) continue;
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...await files(path.join(directory, entry.name), relative));
    else if (entry.isFile()) result.push(relative);
  }
  return result.sort();
}
const all = await files(site);
const sourceFiles = await files(source);
const known = new Set(all);

function localFile(value, resourceURL, label) {
  if (!value || /^(?:#|data:|mailto:|tel:|javascript:)/i.test(value)) return null;
  const url = new URL(value.replaceAll('&amp;', '&'), resourceURL);
  if (url.origin !== origin) return null;
  if (!url.pathname.startsWith(base)) { failures.push(`${label}: URL escapes deployment base: ${value}`); return null; }
  const relative = decodeURIComponent(url.pathname.slice(base.length));
  const resolved = !relative || relative.endsWith('/') ? relative + 'index.html' : relative;
  if (!known.has(resolved) && !known.has(relative + '/index.html')) failures.push(`${label}: missing local file: ${value}`);
  return resolved;
}

for (const relative of sourceFiles) {
  counts.sourceFiles++;
  requireThat(known.has(relative), 'Missing copied source: ' + relative);
  const info = await stat(path.join(source, relative));
  requireThat(info.size < 100 * 1024 * 1024, 'File exceeds GitHub normal-file limit: ' + relative);
  if (!relative.endsWith('.html') && known.has(relative)) requireThat(info.size === (await stat(path.join(site, relative))).size, 'Copied file size changed: ' + relative);
}

for (const relative of all) {
  const resourceURL = new URL(base + relative, origin);
  if (relative.endsWith('.js')) {
    counts.javascript++;
    try { new vm.Script(await readFile(path.join(site, relative), 'utf8'), { filename: relative }); } catch (error) { failures.push('JavaScript syntax: ' + error.message); }
  }
  if (relative.endsWith('.html')) {
    counts.html++;
    const html = await readFile(path.join(site, relative), 'utf8');
    const baseMatch = html.match(/<base\b[^>]*href=["']([^"']+)["']/i);
    const documentURL = baseMatch ? new URL(baseMatch[1], resourceURL) : resourceURL;
    if (built && relative !== '404.html') {
      requireThat(Boolean(baseMatch), 'Missing deployment base in ' + relative);
      requireThat(html.includes('data-adop-pages-path'), 'Missing route bootstrap in ' + relative);
      requireThat(html.includes('data-adop-local-fragments'), 'Missing current-document fragment binding in ' + relative);
    }
    for (const match of html.matchAll(/\b(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi)) localFile(match[1], documentURL, relative);
  }
  if (relative.endsWith('.css')) {
    counts.css++;
    const css = await readFile(path.join(site, relative), 'utf8');
    for (const match of css.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/gi)) localFile(match[1], resourceURL, relative);
  }
}

for (const route of manifest.routes) {
  requireThat(known.has(route.alias ?? route.page), 'Missing route: ' + route.route);
  if (route.alias) {
    const html = await readFile(path.join(site, route.alias), 'utf8');
    const script = html.match(/<script data-adop-pages-path>([\s\S]*?)<\/script>/)?.[1];
    if (script) {
      const location = { pathname: new URL(route.route, origin).pathname, search: '?wall=297.4&tvMount=surface', hash: '#results-title' };
      let replaced;
      vm.runInNewContext(script, { location, history: { state: null, replaceState: (...args) => { replaced = args[2]; } } });
      requireThat(replaced === location.pathname.slice(0, -1) + location.search + location.hash, 'Route normalization loses query or fragment: ' + route.route);
    }
  }
}

if (built) {
  const html = await readFile(path.join(site, 'anasayfa', 'index.html'), 'utf8');
  const script = html.match(/<script data-adop-local-fragments>([\s\S]*?)<\/script>/)?.[1];
  requireThat(Boolean(script), 'Missing fragment regression fixture script.');
  if (script) {
    const listeners = new Map();
    const anchor = { attributes: { href: '#home-content' }, getAttribute(name) { return this.attributes[name] ?? null; }, setAttribute(name, value) { this.attributes[name] = value; }, setAttributeNS(namespace, name, value) { this.setAttribute(name, value); } };
    const use = { ...anchor, attributes: { href: '#home-life-boxes' } };
    const xlink = { ...anchor, attributes: { 'xlink:href': '#legacy-symbol' } };
    const declaration = { values: { filter: 'url(#local-filter)', transform: 'translateX(10px)' }, length: 2, item(index) { return ['filter', 'transform'][index]; }, getPropertyValue(name) { return this.values[name]; }, getPropertyPriority() { return ''; }, setProperty(name, value) { this.values[name] = value; } };
    const location = { href: origin + base + 'anasayfa?wall=297.4#intro' };
    const history = { pushState(state, title, value) { location.href = new URL(value, location.href).href; }, replaceState(state, title, value) { location.href = new URL(value, location.href).href; } };
    const document = { readyState: 'loading', styleSheets: [], querySelectorAll(selector) { return selector === '[style]' ? [{ style: declaration }] : [anchor, use, xlink]; }, addEventListener(name, listener) { listeners.set(name, listener); } };
    const window = { addEventListener(name, listener) { listeners.set(name, listener); } };
    vm.runInNewContext(script, { document, window, location, history, URL, Map, WeakMap });
    listeners.get('DOMContentLoaded')();
    const expected = origin + base + 'anasayfa?wall=297.4';
    requireThat(anchor.attributes.href === expected + '#home-content', 'Skip link must stay on current alias and query.');
    requireThat(use.attributes.href === expected + '#home-life-boxes', 'SVG use must stay on current alias and query.');
    requireThat(xlink.attributes['xlink:href'] === expected + '#legacy-symbol', 'SVG xlink must stay on current alias and query.');
    requireThat(declaration.values.filter === 'url("' + expected + '#local-filter")', 'CSS fragment must stay on current alias and query.');
    requireThat(declaration.values.transform === 'translateX(10px)', 'Fragment fix must retain unrelated style declarations.');
    history.replaceState(null, '', base + 'anasayfa?wall=310#new');
    requireThat(anchor.attributes.href === origin + base + 'anasayfa?wall=310#home-content', 'Fragment links must follow updated configurator queries.');
    requireThat(use.attributes.href === origin + base + 'anasayfa?wall=310#home-life-boxes', 'SVG fragments must follow updated configurator queries.');
  }
}

const context = { window: {} };
vm.runInNewContext(await readFile(path.join(site, 'inspiration-data.js'), 'utf8'), context, { timeout: 1000 });
const gallery = context.window.AdopInspiration?.items ?? [];
counts.galleryItems = gallery.length;
requireThat(gallery.length === 500, 'Inspiration gallery must contain 500 entries.');
requireThat(new Set(gallery.map(item => item.id)).size === gallery.length, 'Duplicate inspiration IDs.');
for (const item of gallery) {
  for (const key of ['src', 'medium', 'full']) {
    const relative = localFile(item[key], new URL(base, origin), `Gallery ${item.id} ${key}`);
    if (relative && known.has(relative)) {
      counts.galleryImages++;
      const handle = await open(path.join(site, relative));
      try {
        const header = Buffer.alloc(12);
        const result = await handle.read(header, 0, 12, 0);
        requireThat(result.bytesRead === 12 && header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP', 'Invalid WebP: ' + relative);
      } finally { await handle.close(); }
    }
  }
}
if (built) requireThat(known.has('.nojekyll'), 'Missing .nojekyll.');
if (failures.length) { console.error(JSON.stringify({ ok: false, base, counts, failures }, null, 2)); process.exitCode = 1; }
else console.log(JSON.stringify({ ok: true, target: built ? '_site/' : 'web/', base, counts, routes: manifest.routes.length, checks: ['local references', 'JavaScript syntax', '500 gallery items and 1500 WebP signatures', 'source copy integrity', ...(built ? ['extensionless route query/fragment preservation', 'current-document skip/SVG/CSS fragments after query changes'] : [])] }, null, 2));
