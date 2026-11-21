<script lang="ts">
  import type { Tuning } from './code';
  import { inbox, useContent, usePullToRefresh } from './ptr.svelte';

  let { options }: { options: Tuning } = $props();

  const readout = (offset: number, progress: number) =>
    `offset: ${Math.round(offset)}px  ·  progress: ${progress.toFixed(2)}`;

  let list = $state<HTMLDivElement>();
  let pullReadout = $state(readout(0, 0));
  const content = useContent(inbox);
  // Recreated per variant (keyed by the parent), so reading the prop once is intended.
  // svelte-ignore state_referenced_locally
  const pull = usePullToRefresh(() => list, {
    ...options,
    onRefresh: content.load,
    onPull: (offset, progress) => (pullReadout = readout(offset, progress)),
  });
</script>

<div class="phone-frame h-105">
  <div class="threshold-line" style:--threshold="{options.threshold ?? 64}px">threshold</div>
  <div data-zupf-ptr-indicator><span data-zupf-ptr-spinner></span></div>
  <div bind:this={list} class="h-full overflow-auto bg-canvas">
    <inbox.View state={content.state} />
  </div>
</div>
<pre class="demo-log">status: {pull.status} · {pullReadout}</pre>
