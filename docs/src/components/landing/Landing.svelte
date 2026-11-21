<script lang="ts">
  import { createPullToRefresh, type PullStatus, type PullToRefresh } from '@lzth/zupf';
  import { href } from '../../lib/nav';
  import Drawer from '../Drawer.svelte';
  import ThemeToggle from '../ThemeToggle.svelte';

  const features = [
    {
      slug: 'drawer',
      anchor: 'snap',
      title: 'Drawer',
      text: 'Snap points, nested sheets, iOS-style scaled background, any edge.',
    },
    {
      slug: 'pull-to-refresh',
      anchor: 'blog',
      title: 'Pull to refresh',
      text: 'On any scroller, with an indicator you style in plain CSS.',
    },
    {
      slug: 'gestures',
      anchor: 'list',
      title: 'Gestures',
      text: 'Swipe actions, double tap, long press and your own sequences.',
    },
  ];

  const indicatorLabel: Record<PullStatus, string> = {
    idle: 'Pull to refresh',
    pulling: 'Pull to refresh',
    ready: 'Release to refresh',
    refreshing: 'Refreshing…',
  };

  let drawerTrigger = $state<HTMLButtonElement | null>(null);
  let refreshContent: HTMLElement;
  let ptr: PullToRefresh | null = null;
  let status = $state<PullStatus>('idle');
  let justRefreshed = $state(false);

  const buttonLabel = $derived.by(() => {
    if (status === 'refreshing') return 'Refreshing…';
    if (status === 'ready') return 'Release to refresh';
    return justRefreshed ? 'Refreshed' : 'Try pull-to-refresh';
  });

  // Pull-to-refresh on the hero, with a short "Refreshed" confirmation afterwards.
  $effect(() => {
    let active = true;
    let reset: number | undefined;
    const instance = createPullToRefresh({
      content: refreshContent,
      mouse: true,
      onRefresh: async () => {
        await new Promise((resolve) => setTimeout(resolve, 900));
        if (!active) return;
        justRefreshed = true;
        clearTimeout(reset);
        reset = window.setTimeout(() => (justRefreshed = false), 1800);
      },
    });
    const unsubscribe = instance.subscribe((s) => (status = s.status));
    ptr = instance;
    return () => {
      active = false;
      unsubscribe();
      instance.destroy();
      ptr = null;
      clearTimeout(reset);
    };
  });
</script>

<div data-zupf-wrapper class="relative min-h-screen overflow-hidden bg-canvas">
  <div data-zupf-ptr-indicator class="gap-2 text-xs font-medium text-muted">
    <span data-zupf-ptr-spinner class="text-fg"></span>
    <span>{indicatorLabel[status]}</span>
  </div>
  <main
    bind:this={refreshContent}
    class="relative isolate grid min-h-svh place-items-center overflow-hidden px-6 py-18 before:absolute before:inset-0 before:-z-1 before:bg-dots-hero max-md:px-5"
  >
    <div class="absolute top-5 right-6 flex gap-1 max-md:top-3.5 max-md:right-3.5" aria-label="Page actions">
      <ThemeToggle />
    </div>

    <div class="w-[min(100%,620px)] text-center">
      <h1 class="text-[clamp(64px,12vw,112px)] leading-[0.95] font-[650] tracking-[-0.035em]">zupf</h1>
      <p class="mx-auto mt-6 max-w-140 text-[clamp(17px,2.4vw,21px)] leading-normal text-balance text-muted">
        Native-feeling bottom sheets, pull-to-refresh and gestures for the web. Any framework, zero dependencies,
        13&nbsp;KB.
      </p>
      <div class="mt-8 flex items-center justify-center gap-3">
        <button class="btn btn-primary flex items-center justify-center" bind:this={drawerTrigger}>Open drawer</button>
        <button
          type="button"
          class="btn flex items-center justify-center"
          disabled={status === 'refreshing'}
          onclick={() => void ptr?.refresh()}
        >
          {buttonLabel}
        </button>
        <span class="sr-only" aria-live="polite">{justRefreshed ? 'Page refreshed' : ''}</span>
      </div>
      <ul class="mt-10 grid grid-cols-3 gap-3 text-left max-md:grid-cols-1">
        {#each features as f (f.slug)}
          <li>
            <a
              href={href(f.slug, f.anchor)}
              class="grid h-full gap-1 rounded-xl border border-line bg-canvas px-4 py-3.5 text-[13px] leading-[1.45] text-muted transition-ui hover:border-line-strong hover:bg-surface active:scale-[0.98] active:duration-80 fine-pointer:hover:-translate-y-0.5"
            >
              <strong class="text-sm font-semibold text-fg">{f.title}</strong>
              <span>{f.text}</span>
            </a>
          </li>
        {/each}
      </ul>
      <div class="mt-8 flex items-center justify-center gap-6">
        <a class="secondary-link" href={href('getting-started')}>Documentation</a>
        <a class="secondary-link" href="https://github.com/fabil7h/zupf">Star on GitHub</a>
      </div>
    </div>

    <Drawer id="landing-demo" trigger={drawerTrigger}>
      <div class="sheet-body text-center">
        <h2 class="tracking-[-0.03em]" data-zupf-title>Drag me down.</h2>
        <p data-zupf-description>
          Or flick me, press Esc, tap outside, or Tab through me. Physics, focus trap and iOS quirks are handled.
        </p>
        <a class="btn btn-primary inline-flex items-center justify-center" href={href('getting-started')}>
          Make it yours
        </a>
        <button class="btn ml-2 inline-flex items-center justify-center" data-zupf-close>Close</button>
      </div>
    </Drawer>
  </main>
</div>
