<script lang="ts">
  import Indicator, { type IndicatorKind } from './Indicator.svelte';
  import { blog, useContent, usePullToRefresh } from './ptr.svelte';
  import BlogHeader from './views/BlogHeader.svelte';

  /** `null`: no indicator element; a panel behind the posts is revealed instead. */
  let { indicator, area }: { indicator: IndicatorKind | null; area?: string } = $props();

  let posts = $state<HTMLDivElement>();
  const content = useContent(blog, 1100);
  // Recreated per style (keyed by the parent), so reading the prop once is intended.
  // svelte-ignore state_referenced_locally
  const pull = usePullToRefresh(() => posts, { onRefresh: content.load, ...(indicator ? {} : { indicator: null }) });
</script>

<div class="phone-frame h-130">
  <div class="h-full overflow-auto overscroll-y-contain bg-canvas text-fg">
    <header class="sticky top-0 z-1 grid gap-3 border-b border-line bg-canvas px-4 pt-4 pb-3">
      <BlogHeader />
    </header>
    <div class="relative bg-surface {area ?? ''}">
      {#if indicator}
        <Indicator kind={indicator} />
      {:else}
        <div class="reveal-panel"></div>
      {/if}
      <div bind:this={posts} class="bg-canvas">
        <blog.View state={content.state} />
      </div>
    </div>
  </div>
</div>
<pre class="demo-log">status: {pull.status}</pre>
