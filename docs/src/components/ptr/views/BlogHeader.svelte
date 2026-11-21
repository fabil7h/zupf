<script lang="ts">
  /** Blog title and topic chips; rendered above the pulled posts (sticky). */
  import { blogTopics } from '../data';
</script>

<div class="grid gap-0.5">
  <strong class="font-serif text-2xl tracking-[-0.01em]">The Field Notes</strong>
  <small>Essays on building for small screens</small>
</div>
<nav class="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-none" aria-label="Topics">
  {#each blogTopics as t, i (t)}
    <span
      class="flex-none rounded-full border border-line-strong px-3 py-1.25 text-[13px] text-muted corner-round data-active:border-fg data-active:bg-fg data-active:text-canvas"
      data-active={i === 0 || undefined}
    >
      {t}
    </span>
  {/each}
</nav>
