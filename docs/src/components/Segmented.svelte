<script lang="ts">
  /** Variant picker. Never wider than the page: long pickers scroll instead. */
  let { labels, value = $bindable(0) }: { labels: string[]; value?: number } = $props();
</script>

<div
  class="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-xl border border-line-strong bg-surface p-0.75 scrollbar-none"
  role="radiogroup"
  aria-label="Variant"
>
  {#each labels as label, i (label)}
    <button
      class="flex-none cursor-pointer rounded-md px-3 py-1 text-[13px] whitespace-nowrap text-muted transition-ui hover:text-fg active:scale-[0.97] active:duration-80 aria-checked:bg-canvas aria-checked:text-fg aria-checked:shadow-[0_0_0_1px_var(--color-line),0_1px_2px_rgb(0_0_0/0.05)]"
      role="radio"
      aria-checked={i === value}
      onclick={() => (value = i)}
    >
      {label}
    </button>
  {/each}
</div>
