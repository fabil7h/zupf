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
    copy: [
      { from: 'src/drawer/style.css', to: 'dist' },
      { from: 'src/pull-to-refresh/style.css', to: 'dist', rename: 'pull-to-refresh.css' },
    ],
  },

  // Oxlint
  lint: {
    ignorePatterns: ['dist/**', 'docs-dist/**'],
    plugins: ['typescript', 'unicorn', 'oxc', 'import', 'promise', 'react'],
    categories: { correctness: 'error', suspicious: 'warn', perf: 'warn' },
    options: { typeAware: true, typeCheck: true },
    rules: {
      // Security: code injection, XSS sinks, unsafe links.
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-proto': 'error',
      'no-caller': 'error',
      'react/no-danger': 'error',
      'react/jsx-no-script-url': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/iframe-missing-sandbox': 'error',
      'unicorn/no-document-cookie': 'error',
      'typescript/no-floating-promises': 'error',
      'typescript/no-misused-promises': 'error',

      // Code smells.
      complexity: ['warn', { max: 20 }],
      'max-depth': ['warn', { max: 4 }],
      'max-params': ['warn', { max: 4 }],
      'max-nested-callbacks': ['warn', { max: 4 }],
      'max-lines-per-function': ['warn', { max: 120, skipBlankLines: true, skipComments: true }],
      'no-nested-ternary': 'warn',
      'no-param-reassign': 'warn',
      eqeqeq: ['warn', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'typescript/no-explicit-any': 'warn',
      'typescript/switch-exhaustiveness-check': 'warn',
      'import/no-cycle': 'error',

      // Docs use Preact's automatic JSX runtime and `class`, not React.
      'react/react-in-jsx-scope': 'off',
      'react/no-unknown-property': 'off',
      // Mount-once effects are common in docs; intentional ones carry an inline disable with a reason.
      'react-hooks/exhaustive-deps': 'warn',
      // React Compiler rules: Preact has no compiler, and mutating `useRef` values is the intended use.
      'react/immutability': 'off',
      // Preact accepts string `style`.
      'react/style-prop-object': 'off',
      // Rendered lists are static (split strings, fixed bars/steps): index keys are stable.
      'react/no-array-index-key': 'off',
      // `.then` callbacks here only run side effects (setState); a return value adds nothing.
      'promise/always-return': 'off',

      // DOM code narrows event targets and query results constantly; guards are used where it matters.
      'typescript/no-unsafe-type-assertion': 'off',
      // Side-effect imports: stylesheets and type augmentation.
      'import/no-unassigned-import': ['warn', { allow: ['**/*.css', 'vite-plus/test/browser'] }],
    },
    overrides: [
      {
        // Reviewed HTML sinks: all render authored, static content (or escaped via docs/highlight.ts).
        // Any new `dangerouslySetInnerHTML` outside this list fails the build.
        files: [
          'docs/app.tsx',
          'docs/pages/Drawer.tsx',
          'docs/components/Icon.tsx',
          'docs/components/CodeBlock.tsx',
          'docs/components/Example.tsx',
        ],
        rules: { 'react/no-danger': 'off' },
      },
      {
        // `describe` blocks are long by nature.
        files: ['test/**'],
        rules: { 'max-lines-per-function': 'off' },
      },
      {
        // Signatures dictated by external APIs (browser-command protocol).
        files: ['**/*.d.ts', 'vite.config.ts'],
        rules: { 'max-params': 'off' },
      },
      {
        // Build script: console output is the point.
        files: ['docs/prerender.mjs'],
        rules: { 'no-console': 'off' },
      },
    ],
  },

  // Oxfmt
  fmt: {
    // Tailwind arbitrary values rely on whitespace remaining encoded with underscores.
    ignorePatterns: ['dist/**', 'docs-dist/**', 'docs/docs.css', 'package-lock.json'],
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
        // Bundle size budgets (gzip), including per-export tree-shaking.
        test: { name: 'size', include: ['test/size/**/*.test.ts'], environment: 'node' },
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
      {
        // Main-thread work budgets (forced layouts / style recalcs) measured via CDP. Chromium only.
        test: {
          name: 'perf',
          include: ['test/perf/**/*.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium', viewport: { width: 430, height: 860 } }],
          },
        },
      },
    ],
  },
});
