<script lang="ts">
  import Section from '../Section.svelte';
  import { barCss, barHtml, barOptions, baseCss, basicCode, nestedCss } from './code';
  import { inbox, useContent, usePullToRefresh } from './ptr.svelte';

  let list = $state<HTMLDivElement>();
  const content = useContent(inbox);
  const pull = usePullToRefresh(() => list, { ...barOptions, onRefresh: content.load });

  const code = {
    js: basicCode.js,
    html: `<div class="ptr-wrapper">
  ${barHtml}
  <div id="list">
    <div class="carousel scroll-px-3 px-3">…</div>
    <div class="inner-scroller">…</div>
    <canvas data-zupf-no-drag></canvas>
    …
  </div>
</div>`,
    css: `${baseCss()}\n\n${nestedCss}\n\n${barCss}`,
  };
</script>

<Section
  id="nested"
  title="Nested content"
  description="Carousels keep their sideways swipes, inner scrollers scroll to their own top first, and `[data-zupf-no-drag]` opts an area out completely."
  {code}
>
  <div class="phone-frame h-105">
    <div data-zupf-ptr-indicator class="load-bar"></div>
    <div bind:this={list} class="flex h-full flex-col gap-3 overflow-auto bg-canvas pt-3 *:shrink-0">
      <div class="carousel scroll-px-3 px-3">
        {#each ['Swipe', 'me', 'sideways', '→'] as t (t)}
          <div class="grid h-22 place-items-center rounded-2xl border border-line bg-surface font-medium text-fg">
            {t}
          </div>
        {/each}
      </div>
      <div class="inner-scroller mx-3 rounded-xl border border-line px-3 py-2.5 text-[13px] text-fg">
        <strong>Inner scroller</strong>
        {#each { length: 10 }, i (i)}
          <p class="m-0 mt-1.5 text-muted">Scroll me first. Line {i + 1}</p>
        {/each}
      </div>
      <div
        class="mx-3 rounded-xl border border-line bg-[repeating-linear-gradient(45deg,transparent_0_8px,var(--color-surface)_8px_16px)] px-3 py-4.5 text-center text-[13px] text-muted"
        data-zupf-no-drag
      >
        data-zupf-no-drag
        <br />
        pulls never start here
      </div>
      <div><inbox.View state={content.state} /></div>
    </div>
  </div>
  <pre class="demo-log">status: {pull.status}</pre>
</Section>
