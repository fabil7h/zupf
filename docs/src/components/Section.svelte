<script lang="ts" module>
  export interface SectionCode {
    js: string;
    html: string;
    css?: string;
  }
</script>

<script lang="ts">
  // A demo section: linked heading, description, live preview (with optional variant picker) and its code.
  import type { Snippet } from 'svelte';
  import { inlineCode, styleTag } from '../lib/text';
  import CodeBlock, { type CodeTab } from './CodeBlock.svelte';
  import SectionHeading from './SectionHeading.svelte';
  import Segmented from './Segmented.svelte';

  interface Props {
    id: string;
    title: string;
    /** Plain text; `backticks` become <code>. */
    description: string;
    /** The code, or one per variant (indexed by `variant`): each is prerendered, so all are given up front. */
    code: SectionCode | SectionCode[];
    /** Labels for the variant picker. */
    variants?: string[];
    variant?: number;
    children: Snippet;
  }

  let { id, title, description, code, variants, variant = $bindable(0), children }: Props = $props();

  const codes = $derived(Array.isArray(code) ? code : [code]);
  const tabs = (c: SectionCode): CodeTab[] => [
    { label: 'JavaScript', lang: 'js', code: c.js },
    { label: 'HTML', lang: 'html', code: c.html },
    ...(c.css ? [{ label: 'CSS', lang: 'css' as const, code: c.css }] : []),
  ];
  const css = $derived(codes[variant]?.css);
</script>

<section {id}>
  <SectionHeading {id} {title} />
  <p>{@html inlineCode(description)}</p>
  <!-- The CSS tab is applied live. -->
  {#if css}
    {@html styleTag(css)}
  {/if}
  <div class="demo-preview">
    {#if variants}
      <Segmented labels={variants} bind:value={variant} />
    {/if}
    {@render children()}
  </div>
  {#each codes as c, i (i)}
    <div hidden={i !== variant}><CodeBlock tabs={tabs(c)} /></div>
  {/each}
</section>
