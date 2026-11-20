import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vite-plus/test';

it('loads the docs stylesheet before the app can paint', () => {
  const html = readFileSync(resolve('docs/index.html'), 'utf8');
  const document = new DOMParser().parseFromString(html, 'text/html');
  const style = document.head.querySelector<HTMLStyleElement>('style');

  expect(document.head.querySelector('link[rel="stylesheet"]')).toBeNull();
  expect(style?.textContent).toContain("@import '/docs.css'");
});
