<script lang="ts" module>
  export type IndicatorKind = 'ring' | 'arrow' | 'spinner';
</script>

<script lang="ts">
  // Live markup of the indicator styles; the HTML tabs show the same markup (see IndicatorStyles.svelte).
  import { arrowPath } from './code';

  let { kind }: { kind: IndicatorKind } = $props();
</script>

{#if kind === 'ring'}
  <div data-zupf-ptr-indicator><span class="ring"></span></div>
{:else if kind === 'arrow'}
  <div data-zupf-ptr-indicator class="arrow-indicator">
    <svg class="arrow" viewBox="0 0 24 24"><path d={arrowPath} /></svg>
    <span data-zupf-ptr-spinner></span>
    <span class="label"></span>
  </div>
{:else}
  <div data-zupf-ptr-indicator><span data-zupf-ptr-spinner></span></div>
{/if}
