<script lang="ts">
  // Copy icon that turns into a check drawn stroke by stroke (cut out of a filled square, like the Phosphor one).
  // Both states stay in the DOM and CSS transitions between them, so nothing plays on page load.
  import Icon from './Icon.svelte';

  let { copied }: { copied: boolean } = $props();
  const uid = $props.id();
  const mask = `copied-${uid}`;
</script>

<span class="icon group inline-grid!" style:--icon-size="16px" data-copied={copied || undefined} aria-hidden="true">
  <Icon name="copy" class="copy-icon-layer group-data-copied:scale-60 group-data-copied:opacity-0" />
  <svg
    class="copy-icon-layer scale-60 opacity-0 group-data-copied:scale-100 group-data-copied:opacity-100"
    viewBox="0 0 256 256"
  >
    <mask id={mask}>
      <rect x="24" y="40" width="208" height="176" rx="16" fill="#fff" />
      <polyline
        class="[stroke-dasharray:1] [stroke-dashoffset:1] transition-[stroke-dashoffset] duration-150 ease-[ease] group-data-copied:[stroke-dashoffset:0] group-data-copied:delay-120 group-data-copied:duration-300 group-data-copied:ease-ios motion-reduce:transition-none!"
        points="64 136 104 176 192 88"
        pathLength="1"
        fill="none"
        stroke="#000"
        stroke-width="16"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </mask>
    <rect x="24" y="40" width="208" height="176" rx="16" fill="currentColor" mask="url(#{mask})" />
  </svg>
</span>
