<script lang="ts">
  import { useGestures, useLastGesture } from './gestures.svelte';
  import HoldBar from './HoldBar.svelte';
  import Result from './Result.svelte';

  let { pattern, hint }: { pattern: string; hint: string } = $props();

  const ARROWS = { up: '↑', down: '↓', left: '←', right: '→' } as const;

  let pad = $state<HTMLDivElement>();
  const last = useLastGesture((e) => (e.direction ? `${ARROWS[e.direction]} ${e.gesture}` : e.gesture));
  // Recreated per pattern (keyed by the parent), so reading the prop once is intended.
  // svelte-ignore state_referenced_locally
  useGestures(() => pad, { gestures: { [pattern]: last.fire } });
</script>

<div bind:this={pad} class="gesture-pad group">
  <Result last={last.last} {hint} />
  <HoldBar />
</div>
<pre class="demo-log">{last.log.length ? last.log.join('\n') : 'gesture   ← steps performed'}</pre>
