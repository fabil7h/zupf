import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vite-plus/test';

it('loads the docs stylesheet before the app can paint', () => {
  const html = readFileSync(resolve('docs/index.html'), 'utf8');
  const document = new DOMParser().parseFromString(html, 'text/html');

  expect(document.head.querySelector<HTMLLinkElement>('link[rel="stylesheet"]')?.href).toMatch(/\/docs\.css$/);
});
