import { useEffect, useRef, useState } from 'preact/hooks';
import { createPullToRefresh, type PullStatus, type PullToRefresh } from '../../src';
import { href } from '../router';
import { ThemeToggle } from './AnimatedIcons';
import { Drawer } from './Drawer';

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

export function Landing() {
  const drawerTrigger = useRef<HTMLButtonElement>(null);
  const refreshContent = useRef<HTMLElement>(null);
  const pullToRefresh = useRef<PullToRefresh | null>(null);
  const resetRefreshMessage = useRef<number | undefined>(undefined);
  const [pullStatus, setPullStatus] = useState<PullStatus>('idle');
  const [justRefreshed, setJustRefreshed] = useState(false);

  useEffect(() => {
    document.title = 'zupf';
  }, []);

  useEffect(() => {
    if (!refreshContent.current) return;

    let active = true;
    const instance = createPullToRefresh({
      content: refreshContent.current,
      mouse: true,
      onRefresh: async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 900));
        if (!active) return;
        setJustRefreshed(true);
        window.clearTimeout(resetRefreshMessage.current);
        resetRefreshMessage.current = window.setTimeout(() => setJustRefreshed(false), 1800);
      },
    });
    const unsubscribe = instance.subscribe((state) => setPullStatus(state.status));
    pullToRefresh.current = instance;

    return () => {
      active = false;
      unsubscribe();
      instance.destroy();
      pullToRefresh.current = null;
      window.clearTimeout(resetRefreshMessage.current);
    };
  }, []);

  const refreshLabel =
    pullStatus === 'refreshing'
      ? 'Refreshing…'
      : pullStatus === 'ready'
        ? 'Release to refresh'
        : justRefreshed
          ? 'Refreshed'
          : 'Try pull-to-refresh';

  return (
    <div data-zupf-wrapper class="relative min-h-screen overflow-hidden bg-canvas">
      <div data-zupf-ptr-indicator class="gap-2 text-xs font-medium text-muted">
        <span data-zupf-ptr-spinner class="text-fg" />
        <span>
          {pullStatus === 'ready'
            ? 'Release to refresh'
            : pullStatus === 'refreshing'
              ? 'Refreshing…'
              : 'Pull to refresh'}
        </span>
      </div>
      <main
        ref={refreshContent}
        class="relative isolate grid min-h-svh place-items-center overflow-hidden px-6 py-[72px] before:absolute before:inset-0 before:-z-1 before:bg-dots-hero max-md:px-5"
      >
        <div class="absolute top-5 right-6 flex gap-1 max-md:top-3.5 max-md:right-3.5" aria-label="Page actions">
          <ThemeToggle />
        </div>

        <div class="w-[min(100%,620px)] text-center">
          <h1 class="text-[clamp(64px,12vw,112px)] leading-[0.95] font-[650] tracking-[-0.035em]">zupf</h1>
          <p class="mx-auto mt-6 max-w-[560px] text-[clamp(17px,2.4vw,21px)] leading-normal text-balance text-muted">
            Native-feeling bottom sheets, pull-to-refresh and gestures for the web. Any framework, zero dependencies,
            13&nbsp;KB.
          </p>
          <div class="mt-8 flex items-center justify-center gap-3">
            <button class="btn btn-primary flex items-center justify-center" ref={drawerTrigger}>
              Open drawer
            </button>
            <button
              type="button"
              class="btn flex items-center justify-center"
              disabled={pullStatus === 'refreshing'}
              onClick={() => void pullToRefresh.current?.refresh()}
            >
              {refreshLabel}
            </button>
            <span class="sr-only" aria-live="polite">
              {justRefreshed ? 'Page refreshed' : ''}
            </span>
          </div>
          <ul class="mt-10 grid grid-cols-3 gap-3 text-left max-md:grid-cols-1">
            {features.map((f) => (
              <li key={f.slug}>
                <a
                  href={href(f.slug, f.anchor)}
                  class="grid h-full gap-1 rounded-xl border border-line bg-canvas px-4 py-3.5 text-[13px] leading-[1.45] text-muted transition-ui hover:border-line-strong hover:bg-surface active:scale-[0.98] active:duration-[80ms] fine-pointer:hover:-translate-y-0.5"
                >
                  <strong class="text-sm font-semibold text-fg">{f.title}</strong>
                  <span>{f.text}</span>
                </a>
              </li>
            ))}
          </ul>
          <div class="mt-8 flex items-center justify-center gap-6">
            <a class="secondary-link" href={href('getting-started')}>
              Documentation
            </a>
            <a class="secondary-link" href="https://github.com/fabil7h/zupf">
              Star on GitHub
            </a>
          </div>
        </div>

        <Drawer id="landing-demo" trigger={drawerTrigger}>
          <div class="sheet-body text-center">
            <h2 class="tracking-[-0.03em]" data-zupf-title>
              Drag me down.
            </h2>
            <p data-zupf-description>
              Or flick me, press Esc, tap outside, or Tab through me. Physics, focus trap and iOS quirks are handled.
            </p>
            <a class="btn btn-primary inline-flex items-center justify-center" href={href('getting-started')}>
              Make it yours
            </a>
            <button class="btn ml-2 inline-flex items-center justify-center" data-zupf-close>
              Close
            </button>
          </div>
        </Drawer>
      </main>
    </div>
  );
}
