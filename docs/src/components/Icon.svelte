<script lang="ts" module>
  // Phosphor icons, inlined as SVG so they inherit `currentColor`. Only the icons imported here are bundled.
  import copy from '@phosphor-icons/core/fill/copy-fill.svg?raw';
  import github from '@phosphor-icons/core/fill/github-logo-fill.svg?raw';
  import moon from '@phosphor-icons/core/fill/moon-fill.svg?raw';
  import sun from '@phosphor-icons/core/fill/sun-fill.svg?raw';
  import link from '@phosphor-icons/core/regular/link-simple.svg?raw';
  import list from '@phosphor-icons/core/regular/list.svg?raw';

  const icons = { copy, github, link, list, moon, sun } as const;
  export type IconName = keyof typeof icons;
</script>

<script lang="ts">
  let { name, size = 16, class: className = '' }: { name: IconName; size?: number; class?: string } = $props();
</script>

<!-- Static, authored SVG. -->
<span class="icon {className}" style:--icon-size="{size}px" aria-hidden="true">{@html icons[name]}</span>
