<script lang="ts">
  import Section from '../Section.svelte';
  import { baseCss, formatOptions, listHtml, thresholdCss, tuningVariants } from './code';
  import TuningDemo from './TuningDemo.svelte';

  let variant = $state(0);
  const { label, options } = $derived(tuningVariants[variant]);
  const code = tuningVariants.map((v) => ({
    js: `const ptr = createPullToRefresh({
  content: '#list',
${formatOptions(v.options)}  onPull: (offset, progress) => console.log(offset, progress),
  onRefresh: loadNewItems,
});`,
    html: `<div class="ptr-wrapper">
  <div class="threshold-line" style="--threshold: ${v.options.threshold ?? 64}px">threshold</div>
  <div data-zupf-ptr-indicator>
    <span data-zupf-ptr-spinner></span>
  </div>
  ${listHtml()}
</div>`,
    css: `${baseCss()}\n\n${thresholdCss}`,
  }));
</script>

<Section
  id="tuning"
  title="Threshold and feel"
  description="`threshold`: how far to pull before release refreshes. `max`: where resistance tops out. `refreshingOffset`: where the content rests while loading. `duration` / `easing`: the settle animation. `onPull` reports every frame."
  {code}
  variants={tuningVariants.map((v) => v.label)}
  bind:variant
>
  {#key label}
    <TuningDemo {options} />
  {/key}
</Section>
