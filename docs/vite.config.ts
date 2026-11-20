import { defineConfig } from 'vite-plus';

// Docs app. JSX is compiled by Oxc (no Babel) with Preact's automatic runtime.
export default defineConfig({
  // Served from the domain root: pages are real paths (`/drawer/`).
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  build: { outDir: '../docs-dist', emptyOutDir: true, target: 'es2022' },
});
