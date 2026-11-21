<script lang="ts" module>
  import { arrowCss, arrowPath, revealCss, ringCss } from './code';
  import type { IndicatorKind } from './Indicator.svelte';

  interface IndicatorStyle {
    label: string;
    /** `null`: no indicator element (`indicator: null`), a panel behind the posts instead. */
    kind: IndicatorKind | null;
    /** Class on the area around the indicator and content. */
    area?: string;
    css?: string;
    /** Indicator markup for the HTML tab. */
    html: string;
  }

  const styles: IndicatorStyle[] = [
    {
      label: 'Progress ring',
      kind: 'ring',
      css: ringCss,
      html: `<div data-zupf-ptr-indicator>
  <span class="ring"></span>
</div>`,
    },
    {
      label: 'Arrow + label',
      kind: 'arrow',
      css: arrowCss,
      html: `<div data-zupf-ptr-indicator class="arrow-indicator">
  <svg class="arrow" viewBox="0 0 24 24"><path d="${arrowPath}" /></svg>
  <span data-zupf-ptr-spinner></span>
  <span class="label"></span>
</div>`,
    },
    { label: 'Reveal', kind: null, area: 'reveal', css: revealCss, html: `<div class="reveal-panel"></div>` },
    {
      label: 'Built-in spinner',
      kind: 'spinner',
      html: `<div data-zupf-ptr-indicator>
  <span data-zupf-ptr-spinner></span>
</div>`,
    },
  ];
</script>

<script lang="ts">
  import Section from '../Section.svelte';
  import BlogDemo from './BlogDemo.svelte';
  import { blogCss, indent } from './code';

  let variant = $state(0);
  const style = $derived(styles[variant]);
  const code = styles.map((s) => ({
    js: `const ptr = createPullToRefresh({
  content: '#posts',
  // Hand the progress to your indicator's CSS as --progress (0..1)
  onPull: (offset, progress) => ptr.indicator.style.setProperty('--progress', progress),
  // scroller: '.blog' is found automatically (nearest scrollable ancestor);
  // pass it explicitly when the scroller is further away or not scrollable yet${
    s.kind ? '' : '\n  indicator: null, // the panel behind the posts is the indicator'
  }
  onRefresh: async () => {
    const posts = await fetch('/api/posts?since=' + lastSeen).then((r) => r.json());
    if (posts.length) renderPosts(posts);
  },
});`,
    html: `<main class="blog">
  <header>
    <h1>The Field Notes</h1>
    <nav class="topics">…</nav>
  </header>
  <div class="${s.area ? `posts-area ${s.area}` : 'posts-area'}">
${indent(s.html, 4)}
    <div id="posts">
      <article class="featured">…</article>
      <article>…</article>
    </div>
  </div>
</main>`,
    css: s.css ? `${blogCss}\n\n${s.css}` : blogCss,
  }));
</script>

<Section
  id="blog"
  title="Indicator styles"
  description="The indicator is your own markup, styled in plain CSS: zupf sets `data-state` on it, and `onPull` reports the progress. Switch styles above: a progress ring, an arrow with a label, or a panel revealed behind the posts (`indicator: null`). The sticky header stays put; only the posts move."
  {code}
  variants={styles.map((s) => s.label)}
  bind:variant
>
  <!-- Keyed: switching recreates the instance (the indicator element changes). -->
  {#key style.label}
    <BlogDemo indicator={style.kind} area={style.area} />
  {/key}
</Section>
