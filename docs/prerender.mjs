// Static site generation: render every route from the SSR bundle into the client build's index.html.
//   vp build docs && vp build docs --ssr entry-server.tsx --outDir ../docs-server && node docs/prerender.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs-dist');
const { render, routes } = await import(pathToFileURL(join(root, 'docs-server/entry-server.js')).href);

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
