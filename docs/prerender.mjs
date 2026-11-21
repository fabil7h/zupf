// Static site generation: render every route from the SSR bundle into the client build's index.html.
//   vp build docs && node docs/prerender.mjs
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite-plus';

const docs = dirname(fileURLToPath(import.meta.url));
const out = join(docs, '..', 'docs-dist');

// Load the app through Vite, so TSX and CSS imports work in Node without a separate SSR build.
const vite = await createServer({ root: docs, appType: 'custom', server: { middlewareMode: true }, logLevel: 'error' });
const { render, routes, routeModules } = await vite.ssrLoadModule('/entry-server.tsx');

const template = await readFile(join(out, 'index.html'), 'utf8');
const manifestFile = join(out, '.vite', 'manifest.json');
const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
const unmapped = routes.filter((route) => !routeModules[route]);
if (unmapped.length) throw new Error(`prerender: add ${unmapped.join(', ')} to routeModules in pages.ts`);

/** `<link rel="modulepreload">` for a route's lazy chunk and its shared imports, so they load alongside the entry. */
function preloadLinks(route) {
  const source = routeModules[route];
  if (!source) return '';
  if (!manifest[source]) throw new Error(`prerender: ${source} (for ${route}) is not in the build manifest`);
  const files = new Set();
  const visit = (key) => {
    const chunk = manifest[key];
    if (!chunk || chunk.isEntry || files.has(chunk.file)) return;
    files.add(chunk.file);
    for (const dep of chunk.imports ?? []) visit(dep);
  };
  visit(source);
  return [...files].map((file) => `<link rel="modulepreload" crossorigin href="/${file}" />`).join('');
}
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

async function write(file, route) {
  const { html, title } = await render(route);
  const page = template
    .replace(/<title>.*?<\/title>/, `<title>${escape(title)}</title>`)
    .replace('</head>', () => `${preloadLinks(route)}</head>`)
    .replace('<div id="app"></div>', () => `<div id="app">${html}</div>`);
  if (page === template) throw new Error(`prerender: no #app placeholder in index.html for ${route}`);
  await mkdir(dirname(join(out, file)), { recursive: true });
  await writeFile(join(out, file), page);
  console.log(`prerendered ${file}`);
}

// Sequential: `render` stubs the global `location`.
// oxlint-disable-next-line no-await-in-loop
for (const route of routes) await write(route === '/' ? 'index.html' : `${route.slice(1)}index.html`, route);
// Static hosts (GitHub Pages, Netlify…) serve this for unknown URLs.
await write('404.html', '/404/');
await vite.close();
// Build metadata only; not part of the site.
await rm(join(out, '.vite'), { recursive: true, force: true });
