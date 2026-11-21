<script lang="ts">
  /** Section title linking to itself; the link icon slides (and on desktop, turns) in on hover. */
  import Icon from './Icon.svelte';

  let { id, title }: { id: string; title: string } = $props();
</script>

<h2>
  <a href="#{id}" class="group inline-flex items-center gap-2">
    {title}
    <Icon
      name="link"
      class="-translate-x-1 text-subtle opacity-0 [transition:opacity_150ms_ease,translate_200ms_var(--ease-ios),rotate_300ms_var(--ease-ios)] group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 fine-pointer:-rotate-20 fine-pointer:group-hover:rotate-0 fine-pointer:group-focus-visible:rotate-0 motion-reduce:rotate-none! motion-reduce:translate-none! motion-reduce:transition-opacity"
    />
  </a>
</h2>
