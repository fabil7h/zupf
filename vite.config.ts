import { defineConfig } from 'vite-plus';
import { playwright } from 'vite-plus/test/browser-playwright';
import type { BrowserCommand } from 'vite-plus/test/node';

/**
 * Real mouse drag inside the browser-test iframe, in iframe CSS pixels.
 * Steps are spaced by `delay` ms so velocity-based logic sees a human-like gesture.
 */
const drag: BrowserCommand<[x: number, y: number, dx: number, dy: number, steps?: number, delay?: number]> = async (
  ctx,
  x,
  y,
  dx,
  dy,
  steps = 20,
  delay = 16,
) => {
  if (ctx.provider.name !== 'playwright') throw new Error('drag requires the playwright provider');
  const frame = await ctx.frame();
  const box = (await (await frame.frameElement()).boundingBox())!;
  const scale = box.width / (await frame.evaluate(() => window.innerWidth));
  const at = (px: number, py: number) => [box.x + px * scale, box.y + py * scale] as const;
  const { mouse } = ctx.page;
  await mouse.move(...at(x, y));
  await mouse.down();
  for (let i = 1; i <= steps; i++) {
    // Sequential on purpose: each move is a separate, timed input event.
    // oxlint-disable-next-line no-await-in-loop
    await mouse.move(...at(x + (dx * i) / steps, y + (dy * i) / steps));
    // oxlint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, delay));
  }
  await mouse.up();
};

export default defineConfig({
  // Library build (tsdown). Declarations come from Oxc's isolated-declarations emitter.
  pack: {
    entry: ['src/index.ts'],
    tsconfig: 'src/tsconfig.json',
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    dts: true,
    minify: true,
    sourcemap: true,
    publint: true,
    copy: [{ from: 'src/style.css', to: 'dist' }],
  },

  // Oxlint
  lint: {
    ignorePatterns: ['dist/**', 'docs-dist/**'],
    plugins: ['typescript', 'unicorn', 'oxc', 'import'],
    categories: { correctness: 'error', suspicious: 'warn', perf: 'warn' },
    options: { typeAware: true, typeCheck: true },
    rules: {
      // DOM code narrows event targets and query results constantly; guards are used where it matters.
      'typescript/no-unsafe-type-assertion': 'off',
      // Side-effect imports: stylesheets and type augmentation.
      'import/no-unassigned-import': ['warn', { allow: ['**/*.css', 'vite-plus/test/browser'] }],
    },
  },

  // Oxfmt
  fmt: {
    ignorePatterns: ['dist/**', 'docs-dist/**', 'package-lock.json'],
    singleQuote: true,
    printWidth: 120,
    sortPackageJson: true,
  },

  // Vitest
  test: {
    projects: [
      {
        test: { name: 'unit', include: ['test/unit/**/*.test.ts'], environment: 'jsdom' },
      },
      {
        test: {
          name: 'browser',
          include: ['test/browser/**/*.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium', viewport: { width: 430, height: 860 } }],
            commands: { drag },
          },
        },
      },
    ],
  },
});
