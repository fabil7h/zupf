<script lang="ts">
  // Mobile navigation: a left-side zupf, opened from the header's menu button.
  import type { Snippet } from 'svelte';
  import type { Sheet } from '@lzth/zupf';
  import Drawer from './Drawer.svelte';
  import Icon from './Icon.svelte';

  let { children }: { children: Snippet } = $props();
  let menu = $state<HTMLButtonElement | null>(null);
  let sheet: Sheet | null = null;
</script>

<button bind:this={menu} class="icon-button md:hidden" aria-label="Open navigation">
  <Icon name="list" />
</button>
<Drawer
  id="mobile-nav"
  options={{ direction: 'left', shouldDrag: () => false }}
  trigger={menu}
  noHandle
  onready={(s) => (sheet = s)}
  onclick={(e) => {
    // Close after following a link (same-page anchors don't reload).
    if ((e.target as Element).closest('a')) sheet?.close();
  }}
  class="overflow-y-auto px-5 py-4 [--zupf-size:280px]"
>
  {@render children()}
</Drawer>
