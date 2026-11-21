<script lang="ts">
  import type { Note } from '../data';

  let { state }: { state: Note[] } = $props();
</script>

<ul>
  {#each state as n (n.id)}
    <li class="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-line px-4 py-3.5 text-sm text-fg">
      <span class="text-lg">{n.icon}</span>
      <span>{n.text}</span>
      <small class="text-xs text-muted">{n.time}</small>
    </li>
  {/each}
</ul>
