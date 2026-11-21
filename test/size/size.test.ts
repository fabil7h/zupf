import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { build, type Rolldown } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';

/**
 * Size budgets in gzip bytes (level 9), with ~5-10% headroom. Raise one deliberately when a change is worth it.
 * The lib is built fresh into a temp dir, so a stale `dist/` can't hide a regression.
 */
const BUDGET = {
  bundle: 14_500,
  css: { 'style.css': 2_200, 'pull-to-refresh.css': 1_200 },
  /** What a consumer pays when importing only one feature (checks tree-shaking). */
  exports: { createSheet: 10_500, createPullToRefresh: 3_600, createGestures: 3_300 },
};

const root = resolve(import.meta.dirname, '../..');
const gzip = (s: string) => gzipSync(s, { level: 9 }).length;
const brotli = (s: string) => brotliCompressSync(s).length;

let out: string;
let lib: string;

beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), 'zupf-size-'));
  execFileSync(join(root, 'node_modules/.bin/vp'), ['pack', '-d', out, '--no-dts', '--no-publint', '--no-sourcemap'], {
    cwd: root,
    stdio: 'pipe',
  });
  lib = join(out, 'index.js');
});

afterAll(() => rmSync(out, { recursive: true, force: true }));

/** Minified bundle of an app that imports only `name` from the built lib. */
async function bundleImportOf(name: string): Promise<string> {
  const entry = '\0entry';
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    plugins: [
      {
        name: 'size-entry',
        resolveId: (id) => (id === 'entry' ? entry : null),
        load: (id) => (id === entry ? `export { ${name} } from ${JSON.stringify(lib)};` : null),
      },
    ],
    build: {
      write: false,
      minify: true,
      target: 'es2022',
      rollupOptions: { input: 'entry', preserveEntrySignatures: 'exports-only' },
    },
  });
  const output = (Array.isArray(result) ? result[0] : result) as Rolldown.RolldownOutput;
  return output.output.find((o) => o.type === 'chunk')!.code;
}

describe('size', () => {
  it('full bundle', async ({ annotate }) => {
    const code = readFileSync(lib, 'utf8');
    await annotate(`index.js: ${code.length} min, ${gzip(code)} gzip, ${brotli(code)} brotli`);
    expect(gzip(code)).toBeLessThanOrEqual(BUDGET.bundle);
  });

  it.for(Object.entries(BUDGET.css))('%s', async ([file, budget], { annotate }) => {
    // Copied verbatim into dist by `pack.copy`.
    const src = file === 'style.css' ? 'src/drawer/style.css' : 'src/pull-to-refresh/style.css';
    const css = readFileSync(join(root, src), 'utf8');
    await annotate(`${file}: ${css.length} raw, ${gzip(css)} gzip`);
    expect(gzip(css)).toBeLessThanOrEqual(budget);
  });

  it.for(Object.entries(BUDGET.exports))('import { %s } alone', async ([name, budget], { annotate }) => {
    const code = await bundleImportOf(name);
    await annotate(`${name}: ${code.length} min, ${gzip(code)} gzip`);
    expect(gzip(code)).toBeLessThanOrEqual(budget);
  });
});
