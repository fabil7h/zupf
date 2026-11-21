<script lang="ts">
  let { last, hint }: { last: { label: string; n: number } | null; hint: string } = $props();
</script>

{#if last}
  {#key last.n}
    <strong class="animate-gesture-pop text-[22px] font-semibold motion-reduce:animate-none">{last.label}</strong>
  {/key}
{:else}
  <span class="text-sm text-muted">{hint}</span>
{/if}
