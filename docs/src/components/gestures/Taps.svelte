<script lang="ts">
  import Section from '../Section.svelte';
  import { useGestures, useLastGesture } from './gestures.svelte';
  import HoldBar from './HoldBar.svelte';
  import Result from './Result.svelte';

  let pad = $state<HTMLDivElement>();
  const last = useLastGesture();
  const { fire } = last;
  useGestures(() => pad, { gestures: { tap: fire, 'double-tap': fire, 'triple-tap': fire, 'long-press': fire } });

  const code = {
    js: `import { createGestures } from 'zupf';

createGestures({
  target: '#pad',
  gestures: {
    'tap': (e) => show(e.gesture),
    'double-tap': (e) => show(e.gesture),
    'triple-tap': (e) => show(e.gesture),
    'long-press': (e) => show(e.gesture),
  },
});`,
    html: `<div id="pad">
  Tap, double tap, triple tap or hold
  <div class="hold-bar"></div>
</div>`,
    css: `#pad .hold-bar {
  position: absolute;
  inset: auto 0 0;
  height: 3px;
  background: currentColor;
  opacity: 0.3;
  transform: scaleX(0);
  transform-origin: left;
}

/* data-pressed: while a finger is down. Fill the bar over holdTime. */
#pad[data-pressed] .hold-bar {
  transform: scaleX(1);
  transition: transform 500ms linear;
}

/* data-holding: the press became a hold. */
#pad[data-holding] .hold-bar {
  opacity: 1;
}`,
  };
</script>

<Section
  id="taps"
  title="Taps and long press"
  description="Bind patterns by name. A tap waits briefly in case a double tap follows; a long press fires while the finger is still down."
  {code}
>
  <div bind:this={pad} class="gesture-pad group">
    <Result last={last.last} hint="Tap, double tap, triple tap or hold" />
    <HoldBar />
  </div>
  <pre class="demo-log">{last.log.length ? last.log.join('\n') : 'gesture   ← steps performed'}</pre>
</Section>
