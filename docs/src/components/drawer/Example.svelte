<script lang="ts">
  import type { Sheet, SheetState } from '@lzth/zupf';
  import { exampleCode } from '../../lib/codegen';
  import { inlineCode } from '../../lib/text';
  import { examplePages, type Example } from '../../lib/examples';
  import CodeBlock, { type CodeTab } from '../CodeBlock.svelte';
  import SectionHeading from '../SectionHeading.svelte';
  import Segmented from '../Segmented.svelte';
  import ExampleDrawer from './ExampleDrawer.svelte';

  // By id: examples hold functions (controls, `raw()` options), which can't be passed as island props.
  let { id }: { id: string } = $props();
  const base: Example = $derived(examplePages.flatMap((s) => s.examples ?? []).find((e) => e.id === id)!);

  let trigger = $state<HTMLButtonElement | null>(null);
  let sheet = $state<Sheet | null>(null);
  let sheetState = $state<SheetState>();
  let variant = $state(0);

  /** A variant's options come first so they read naturally in the code sample. */
  const withVariant = (v: NonNullable<Example['variants']>[number] | undefined): Example =>
    v ? { ...base, noHandle: v.noHandle ?? base.noHandle, options: { ...v.options, ...base.options } } : base;
  const ex = $derived(withVariant(base.variants?.[variant]));
  // One code sample per variant, all prerendered (code is highlighted at build time only). The browser keeps the
  // prerendered code and only needs the tab structure, so code generation is left out of the client bundle.
  const tabsPerVariant = $derived(
    (base.variants ?? [undefined]).map((v): CodeTab[] => {
      const { js, html, css } = import.meta.env.SSR
        ? exampleCode(withVariant(v))
        : { js: '', html: '', css: base.css };
      const tabs: CodeTab[] = [
        { label: 'JavaScript', lang: 'js', code: js },
        { label: 'HTML', lang: 'html', code: html },
      ];
      if (css) tabs.push({ label: 'CSS', lang: 'css', code: css });
      return tabs;
    }),
  );

  $effect(() => {
    if (!sheet || !ex.live) return undefined;
    sheetState = sheet.getState();
    return sheet.subscribe((s) => (sheetState = s));
  });
</script>

<section id={ex.id}>
  <SectionHeading id={ex.id} title={ex.title} />
  <p>{@html inlineCode(ex.description)}</p>
  <div class="demo-preview">
    {#if base.variants}
      <Segmented labels={base.variants.map((v) => v.label)} bind:value={variant} />
    {/if}
    <div class="flex flex-wrap justify-center gap-2">
      {#if !ex.noTrigger}
        <button class="btn btn-primary" bind:this={trigger}>Open Drawer</button>
      {/if}
      {#each ex.controls ?? [] as c (c.label)}
        <button class="btn" onclick={() => sheet && c.run(sheet)}>{c.label}</button>
      {/each}
    </div>
    {#if ex.live}
      <pre class="demo-log">{sheetState ? JSON.stringify(sheetState, null, 2) : ''}</pre>
    {/if}
  </div>
  {#each tabsPerVariant as tabs, i (i)}
    <div hidden={i !== variant}><CodeBlock {tabs} /></div>
  {/each}
  <!-- Keyed by variant: switching recreates the sheet with the new options. -->
  {#key variant}
    <ExampleDrawer {ex} trigger={ex.noTrigger ? undefined : trigger} onready={(s) => (sheet = s)} />
  {/key}
</section>
