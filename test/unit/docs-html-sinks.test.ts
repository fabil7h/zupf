// The docs are linted by `astro check`, which has no rule against raw HTML. This keeps the list of places that render
// HTML strings reviewed ({@html} in Svelte, set:html in Astro, and DOM sinks like innerHTML in any script): a new one
// fails until it is added here.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, it } from 'vite-plus/test';

const root = join(import.meta.dirname, '../../docs/src');

/** File → number of HTML sinks, with what each renders. All content is authored in the repo or escaped. */
const reviewed: Record<string, number> = {
  'components/CodeBlock.svelte': 1, // Shiki tokens, prerendered (lib/highlight.ts)
  'components/Icon.svelte': 1, // Phosphor SVGs imported with ?raw
  'components/Section.svelte': 2, // inlineCode() (escaped) and styleTag() of the demo's own CSS sample
  'components/Table.astro': 1, // inlineCode()
  'components/Prose.astro': 1, // inlineCode()
  'components/drawer/Example.svelte': 1, // inlineCode() of the example description
  'components/drawer/ExampleDrawer.svelte': 2, // styleTag() of the example CSS, and markup from lib/examples.ts
  'components/ptr/InDrawer.svelte': 1, // styleTag() of the drawer CSS sample from ptr/code.ts
  'pages/drawer.astro': 1, // inlineCode() of the section intro
};

const sinks =
  /\{@html\s|\bset:html=|\.(?:inner|outer)HTML\s*\+?=|\binsertAdjacentHTML\b|\bdocument\.write(?:ln)?\b|\bcreateContextualFragment\b/g;

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) return files(join(dir, e.name));
    return /\.(svelte|astro|[cm]?[jt]s)$/.test(e.name) ? [join(dir, e.name)] : [];
  });

it('renders HTML strings only in reviewed places', () => {
  const found: Record<string, number> = {};
  for (const file of files(root)) {
    const count = readFileSync(file, 'utf8').match(sinks)?.length ?? 0;
    if (count) found[relative(root, file).replaceAll('\\', '/')] = count;
  }
  expect(found).toEqual(reviewed);
});
