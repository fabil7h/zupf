import { signal } from '@preact/signals';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Sheet } from '../../src';
import type { Page } from '../examples';
import { pages } from '../pages';
import { href, useDocRoute } from '../router';
import { ThemeToggle } from './AnimatedIcons';
import { Drawer } from './Drawer';
import { Icon } from './Icon';

const groups = ['Usage'] as const;

export function Nav() {
  const current = useDocRoute().slug;
  return (
    <>
      {groups.map((g) => (
        <div class="[&+&]:mt-6" key={g}>
          <div class="mb-2 text-xs font-semibold text-fg">{g}</div>
          {pages
            .filter((p) => p.group === g)
            .map((p) => (
              <a
                key={p.slug}
                class="guide-link"
                href={href(p.slug)}
                aria-current={p.slug === current ? 'page' : undefined}
              >
                {p.title}
              </a>
            ))}
        </div>
      ))}
    </>
  );
}

function Logo() {
  return (
    <a href={href('')} class="inline-flex items-center gap-2 font-semibold tracking-[-0.01em]">
      zupf
    </a>
  );
}

export function Header({ page }: { page: Page }) {
  const menu = useRef<HTMLButtonElement>(null);
  const [mobileNav, setMobileNav] = useState<Sheet | null>(null);

  // Close the mobile navigation sheet after navigating.
  const { slug, anchor } = useDocRoute();
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- only react to navigation, not to the sheet appearing
  useEffect(() => mobileNav?.close(), [slug, anchor]);

  return (
    <header class="sticky top-0 z-10 h-14 border-b border-line bg-canvas/85 touch:bg-canvas fine-pointer:backdrop-blur-sm">
      <div class="mx-auto flex h-full w-full max-w-[1280px] items-center gap-4 pr-12 pl-6 max-md:gap-2 max-md:px-3">
        <button ref={menu} class="icon-button md:hidden" aria-label="Open navigation">
          <Icon name="list" />
        </button>
        <Logo />
        <span class="text-[13px] text-muted max-md:hidden">
          Drawer, pull-to-refresh and gestures for any framework. Optimized for mobile use.
        </span>
        <div class="ml-auto flex gap-1">
          <a
            class="icon-button fine-pointer:hover:[&_svg]:motion-safe:animate-wave"
            href="https://github.com/fabil7h/zupf"
            aria-label="GitHub repository"
            title="GitHub"
          >
            <Icon name="github" />
          </a>
          <ThemeToggle />
        </div>
      </div>
      {/* Mobile navigation: a left-side zupf */}
      <Drawer
        id="mobile-nav"
        options={{ direction: 'left', shouldDrag: () => false }}
        trigger={menu}
        noHandle
        onReady={setMobileNav}
        class="overflow-y-auto px-5 py-4 [--zupf-size:280px]"
      >
        <div class="pt-1 pb-5">
          <Logo />
          <span class="mt-1 block text-[13px] text-muted">
            Drawer, pull-to-refresh and gestures for any framework. Optimized for mobile use.
          </span>
        </div>
        <Nav />
        <Toc page={page} />
      </Drawer>
    </header>
  );
}

export function Pager({ page }: { page: Page }) {
  const i = pages.indexOf(page);
  const prev = pages[i - 1];
  const next = pages[i + 1];
  return (
    <nav class="mt-16 flex justify-between gap-4">
      {prev ? (
        <a href={href(prev.slug)} class="pager-link fine-pointer:hover:-translate-x-0.5">
          <span class="text-xs font-normal text-muted">Previous</span>
          <strong class="inline-flex items-center gap-1.5 font-medium">{prev.title}</strong>
        </a>
      ) : (
        <span />
      )}
      {next && (
        <a href={href(next.slug)} class="pager-link ml-auto text-right fine-pointer:hover:translate-x-0.5">
          <span class="text-xs font-normal text-muted">Next</span>
          <strong class="inline-flex items-center justify-end gap-1.5 font-medium">{next.title}</strong>
        </a>
      )}
    </nav>
  );
}

/** Section in view, shared by every TOC on the page (sidebar, aside, mobile nav). */
const activeSection = signal<{ slug: string; id: string } | null>(null);

/** Tracks the section in view and keeps the URL hash in sync. Call once per page. */
export function useActiveSection(page: Page) {
  useEffect(() => {
    const examples = page.toc ?? [];
    let frame = 0;
    let measureFrame = 0;
    let syncTimer = 0;
    let syncEnabled = false;
    let pendingId = examples[0]?.id ?? '';
    let sectionTops: { id: string; top: number }[] = [];
    let maxScroll = 0;
    const enableSync = () => {
      syncEnabled = true;
    };
    const measure = () => {
      measureFrame = 0;
      const scrollY = window.scrollY;
      sectionTops = examples
        .map(({ id }) => {
          const section = document.getElementById(id);
          return section ? { id, top: section.getBoundingClientRect().top + scrollY } : null;
        })
        .filter((section): section is { id: string; top: number } => section !== null);
      maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      updateActive();
    };
    // Resize events come in bursts (Safari fires ~25 when the body gets fixed), and sections resize while
    // scrolling (content-visibility renders them on approach): measure at most once a frame.
    const scheduleMeasure = () => {
      if (!measureFrame) {
        measureFrame = requestAnimationFrame(() => {
          measureFrame = 0;
          measure();
        });
      }
    };
    const updateActive = (allowBottom = false) => {
      frame = 0;
      let next = examples[0]?.id ?? '';
      const threshold = window.scrollY + 96;
      for (const section of sectionTops) {
        if (section.top > threshold) break;
        next = section.id;
      }
      if (allowBottom && window.scrollY >= maxScroll - 2) next = examples.at(-1)?.id ?? next;
      pendingId = next;
      const current = activeSection.peek();
      if (current?.slug !== page.slug || current.id !== next) activeSection.value = { slug: page.slug, id: next };
    };
    const syncUrl = () => {
      if (!syncEnabled || !pendingId) return;
      const nextHash = href(page.slug, pendingId);
      if (location.pathname + location.hash !== nextHash) history.replaceState(null, '', nextHash);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(() => updateActive(true));
      window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(syncUrl, 120);
    };

    measure();
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleMeasure);
    const article = document.querySelector('main > article');
    if (article) resizeObserver?.observe(article);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('pointerdown', enableSync, { passive: true });
    window.addEventListener('wheel', enableSync, { passive: true });
    window.addEventListener('touchmove', enableSync, { passive: true });
    window.addEventListener('keydown', enableSync);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('pointerdown', enableSync);
      window.removeEventListener('wheel', enableSync);
      window.removeEventListener('touchmove', enableSync);
      window.removeEventListener('keydown', enableSync);
      resizeObserver?.disconnect();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(measureFrame);
      window.clearTimeout(syncTimer);
    };
  }, [page]);
}

export function Toc({ page }: { page: Page }) {
  const examples = page.toc ?? [];
  const active = activeSection.value;
  const activeId = active?.slug === page.slug ? active.id : (examples[0]?.id ?? '');

  if (examples.length < 2) return null;
  return (
    <aside class="mt-6 block">
      <div class="mb-2 text-xs font-semibold text-fg">On this page</div>
      {examples.map((e) => (
        <a
          key={e.id}
          class="guide-link"
          href={href(page.slug, e.id)}
          aria-current={e.id === activeId ? 'location' : undefined}
        >
          {e.title}
        </a>
      ))}
    </aside>
  );
}
