<script lang="ts">
  // Sun/moon toggle. Which icon shows comes from `data-dark` on <html> (set before first paint, see Base.astro),
  // so the server-rendered button is already right; this island only handles clicks.
  import Icon from './Icon.svelte';

  let animate = $state(false);

  function toggle() {
    animate = true;
    const root = document.documentElement;
    const theme = root.hasAttribute('data-dark') ? 'light' : 'dark';
    root.dataset.theme = theme;
    root.toggleAttribute('data-dark', theme === 'dark');
    try {
      localStorage.setItem('zupf-theme', theme);
    } catch {
      // Storage blocked: the choice lasts for this page only.
    }
  }
</script>

<button class="icon-button group" aria-label="Toggle theme" data-animate={animate || undefined} onclick={toggle}>
  <Icon
    name="sun"
    class="theme-icon scale-50 -rotate-90 opacity-0 theme-dark:scale-100 theme-dark:rotate-0 theme-dark:opacity-100"
  />
  <Icon name="moon" class="theme-icon theme-dark:scale-50 theme-dark:rotate-90 theme-dark:opacity-0" />
</button>
