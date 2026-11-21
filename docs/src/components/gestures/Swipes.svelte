<script lang="ts">
  import Section from '../Section.svelte';
  import SwipePad from './SwipePad.svelte';

  const variants = [
    { label: 'Swipe', pattern: 'swipe', hint: 'Swipe in any direction' },
    { label: 'Hold, then swipe', pattern: 'hold+swipe', hint: 'Hold until the bar fills, then swipe' },
    { label: 'L shapes', pattern: 'swipe-down+swipe-right', hint: 'Swipe down, then turn right' },
  ];

  let variant = $state(0);
  const { pattern, hint } = $derived(variants[variant]);
  const code = variants.map((v) => ({
    js: `import { createGestures } from 'zupf';

createGestures({
  target: '#pad',
  gestures: {
    '${v.pattern}': (e) => show(e.direction), // 'up' | 'down' | 'left' | 'right'
  },
});`,
    html: `<div id="pad">${v.hint}</div>`,
  }));
</script>

<Section
  id="swipes"
  title="Swipes"
  description="`swipe` matches any direction (read `e.direction`), `swipe-up` etc. match one. `+` chains tokens within one press: `hold+swipe` is a long press then a swipe, and a turn mid-swipe adds a token."
  variants={variants.map((v) => v.label)}
  bind:variant
  {code}
>
  {#key pattern}
    <SwipePad {pattern} {hint} />
  {/key}
</Section>
