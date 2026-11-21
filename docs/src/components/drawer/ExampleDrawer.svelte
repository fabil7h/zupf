<script lang="ts">
  import type { Sheet, SheetOptions } from '@lzth/zupf';
  import { resolveOptions } from '../../lib/codegen';
  import type { Example } from '../../lib/examples';
  import { styleTag } from '../../lib/text';
  import Drawer from '../Drawer.svelte';
  // Recursive: nested examples render as nested sheets.
  // oxlint-disable-next-line import/no-cycle, import/no-self-import
  import Self from './ExampleDrawer.svelte';

  interface Props {
    ex: Example;
    trigger?: HTMLElement | null;
    nested?: boolean;
    onready?: (sheet: Sheet) => void;
  }
  let { ex, trigger, nested, onready }: Props = $props();

  // `#sheet` / `#overlay` in the example CSS are rewritten to this example's elements.
  const css = $derived(ex.css?.replace(/#sheet\b(?!-)/g, `#${ex.id}-sheet`).replace(/#overlay\b(?!-)/g, `#${ex.id}-overlay`));
  const options = $derived(resolveOptions(ex.options) as Omit<SheetOptions, 'content'>);
</script>

<Drawer
  id={ex.id}
  {options}
  trigger={typeof options.trigger === 'string' ? options.trigger : trigger}
  {nested}
  noHandle={ex.noHandle}
  {onready}
>
  {#if css}{@html styleTag(css)}{/if}
  <!-- Example markup is authored HTML, so the code tab shows exactly what is rendered. -->
  <div class="contents">{@html ex.markup}</div>
  {#each ex.children ?? [] as child (child.id)}
    <Self ex={child} nested />
  {/each}
</Drawer>
