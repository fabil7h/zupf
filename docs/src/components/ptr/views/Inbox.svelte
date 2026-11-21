<script lang="ts">
  import type { Mail } from '../data';

  let { state }: { state: Mail[] } = $props();
</script>

<ul>
  {#each state as m (m.id)}
    <li class="group flex gap-3 border-b border-line px-4 py-3 text-fg" data-unread={m.unread || undefined}>
      <span
        class="grid size-9 flex-none place-items-center rounded-full border border-line bg-surface text-sm font-semibold corner-round group-data-unread:border-info group-data-unread:bg-info group-data-unread:text-white"
      >
        {m.from[0]}
      </span>
      <span class="grid min-w-0 gap-0.5 text-sm">
        <span class="flex justify-between gap-2">
          <strong>{m.from}</strong>
          <small class="text-xs text-muted">{m.time}</small>
        </span>
        <span class="truncate group-data-unread:font-semibold">{m.subject}</span>
        <span class="truncate text-[13px] text-muted">{m.preview}</span>
      </span>
    </li>
  {/each}
</ul>
