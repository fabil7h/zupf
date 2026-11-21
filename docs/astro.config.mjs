// @ts-check
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

const lib = fileURLToPath(new URL('../src', import.meta.url));

// Static docs: every page is prerendered HTML; demos hydrate as Svelte islands.
export default defineConfig({
  site: 'https://zupf.dev',
  // Pages are real paths with a trailing slash (`/drawer/`), served as `drawer/index.html`.
  trailingSlash: 'always',
  build: { format: 'directory' },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  integrations: [svelte()],
  vite: {
    plugins: [tailwindcss()],
    // Demos import the library from source, like a user would import the package.
    resolve: { alias: { zupf: `${lib}/index.ts` } },
    // Serve the docs and the library source; nothing else from the repo.
    server: { fs: { allow: ['.', lib] } },
  },
});
