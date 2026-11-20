// Static site generation: render every route from the SSR bundle into the client build's index.html.
//   vp build docs && node docs/prerender.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite-plus';

const docs = dirname(fileURLToPath(import.meta.url));
const out = join(docs, '..', 'docs-dist');

// Load the app through Vite, so TSX and CSS imports work in Node without a separate SSR build.
const vite = await createServer({ root: docs, appType: 'custom', server: { middlewareMode: true }, logLevel: 'error' });
const { render, routes } = await vite.ssrLoadModule('/entry-server.tsx');

const template = await readFile(join(out, 'index.html'), 'utf8');
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

async function write(file, route) {
  const { html, title } = await render(route);
  const page = template
    .replace(/<title>.*?<\/title>/, `<title>${escape(title)}</title>`)
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
