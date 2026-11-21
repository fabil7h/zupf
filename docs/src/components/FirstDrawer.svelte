<script lang="ts">
  import Drawer from './Drawer.svelte';

  let trigger = $state<HTMLButtonElement | null>(null);
</script>

<div class="demo-preview">
  <div class="flex flex-wrap justify-center gap-2">
    <button class="btn btn-primary" bind:this={trigger}>Open Drawer</button>
  </div>
</div>
<Drawer id="gs" {trigger}>
  <div class="sheet-body">
    <h2 data-zupf-title>Hello</h2>
    <p data-zupf-description>Drag me down to close.</p>
    <button class="btn" data-zupf-close>Close</button>
  </div>
</Drawer>
