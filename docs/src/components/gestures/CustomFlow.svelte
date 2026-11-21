<script lang="ts">
  import Section from '../Section.svelte';
  import FlowPad from './FlowPad.svelte';

  // Fixed presets (no free-form input): each one's code sample is prerendered.
  const presets = [
    'tap tap hold+swipe-up',
    'hold tap hold',
    'swipe-down+swipe-right',
    'tap hold+swipe-left+swipe-right',
  ];

  let selected = $state(0);
  const pattern = $derived(presets[selected]);

  const code = presets.map((p) => ({
    js: `import { createGestures } from 'zupf';

const gestures = createGestures({ target: '#pad' });

const off = gestures.on('${p}', () => unlock());

gestures.subscribe(({ pressed, steps }) => {
  // steps: [['tap'], ['tap'], ['hold']], the last one in progress while pressed
  renderProgress(pressed ? steps.length - 1 : steps.length);
});`,
    html: `<div id="pad">
  <ol class="progress">…</ol>
</div>`,
  }));
</script>

<Section
  id="custom"
  title="Custom flows"
  description="Any sequence is a pattern: secret gestures, unlock flows, power-user shortcuts. Pick one below. `subscribe` reports the presses so far, so you can show progress."
  {code}
  variant={selected}
>
  <div class="flex w-[min(100%,520px)] flex-wrap justify-center gap-2">
    {#each presets as p, i (p)}
      <button
        class="btn h-7 px-2.5 font-system-mono text-xs leading-[normal] font-normal aria-pressed:border-fg"
        aria-pressed={i === selected}
        onclick={() => (selected = i)}
      >
        {p}
      </button>
    {/each}
  </div>
  {#key pattern}
    <FlowPad {pattern} />
  {/key}
</Section>
