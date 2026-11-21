import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite-plus';

// Docs app. JSX is compiled by Oxc (no Babel) with Preact's automatic runtime.
export default defineConfig({
  // Served from the domain root: pages are real paths (`/drawer/`).
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  plugins: [tailwindcss()],
  // The manifest maps lazy route modules to chunks for prerender's modulepreload links; prerender deletes it.
  build: { outDir: '../docs-dist', emptyOutDir: true, target: 'es2022', manifest: true },
});
