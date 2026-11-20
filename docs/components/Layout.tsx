import { useEffect, useRef, useState } from 'preact/hooks';
import type { Sheet } from '../../src';
import type { Page } from '../examples';
import { pages } from '../pages';
import { href, route } from '../router';
import { isDark, theme } from '../theme';
import { Drawer } from './Drawer';
import { Icon } from './Icon';

const groups = ['Basics', 'Examples'] as const;

export function Nav() {
  const current = route.value.slug;
  return (
    <>
      {groups.map((g) => (
        <div class="nav-group" key={g}>
          <div class="nav-title">{g}</div>
          {pages
            .filter((p) => p.group === g)
            .map((p) => (
              <a key={p.slug} href={href(p.slug)} aria-current={p.slug === current ? 'page' : undefined}>
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
    <a href={href('getting-started')} class="logo">
      tugsheet
    </a>
  );
}

export function Header() {
  const menu = useRef<HTMLButtonElement>(null);
  const [mobileNav, setMobileNav] = useState<Sheet | null>(null);

  // Close the mobile navigation sheet after navigating.
  useEffect(() => mobileNav?.close(), [route.value.slug]);

  return (
    <header class="topbar">
      <div class="topbar-inner">
        <button ref={menu} class="icon-btn menu" aria-label="Open navigation">
          <Icon name="list" />
        </button>
        <Logo />
        <span class="tagline">A drawer that works with any framework. Optimized for mobile use.</span>
        <div class="topbar-actions">
          <a
            class="icon-btn"
            href="https://github.com/emilkowalski/vaul"
            aria-label="Original vaul repository"
            title="vaul"
          >
            <Icon name="github" />
          </a>
          <button
            class="icon-btn"
            aria-label="Toggle theme"
            onClick={() => (theme.value = isDark() ? 'light' : 'dark')}
          >
            <Icon name={isDark() ? 'sun' : 'moon'} />
          </button>
        </div>
      </div>
      {/* Mobile navigation: a left-side tugsheet */}
      <Drawer
        id="mobile-nav"
        options={{ direction: 'left', shouldDrag: () => false }}
        trigger={menu}
        noHandle
        onReady={setMobileNav}
      >
        <div class="mobile-nav-head">
          <Logo />
          <span class="mobile-nav-tagline">A drawer that works with any framework. Optimized for mobile use.</span>
        </div>
        <Nav />
      </Drawer>
    </header>
  );
}

export function Pager({ page }: { page: Page }) {
  const i = pages.indexOf(page);
  const prev = pages[i - 1];
  const next = pages[i + 1];
  return (
    <nav class="pager">
      {prev ? (
        <a href={href(prev.slug)} class="pager-prev">
          <span>Previous</span>
          <strong>{prev.title}</strong>
        </a>
      ) : (
        <span />
      )}
      {next && (
        <a href={href(next.slug)} class="pager-next">
          <span>Next</span>
          <strong>{next.title}</strong>
        </a>
      )}
    </nav>
  );
}

export function Toc({ page }: { page: Page }) {
  const examples = page.examples ?? [];
  const [activeId, setActiveId] = useState(route.value.anchor ?? examples[0]?.id ?? '');

  useEffect(() => {
    let frame = 0;
    let syncTimer = 0;
    let syncEnabled = false;
    let pendingId = examples[0]?.id ?? '';
    const enableSync = () => {
      syncEnabled = true;
    };
    const updateActive = (allowBottom = false) => {
      frame = 0;
      let next = examples[0]?.id ?? '';
      for (const example of examples) {
        const section = document.getElementById(example.id);
        if (section && section.getBoundingClientRect().top <= 96) next = example.id;
      }
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      if (allowBottom && atBottom) next = examples.at(-1)?.id ?? next;
      pendingId = next;
      setActiveId(next);
    };
    const syncUrl = () => {
      if (!syncEnabled || !pendingId) return;
      const nextHash = href(page.slug, pendingId);
      if (location.hash !== nextHash) history.replaceState(null, '', nextHash);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(() => updateActive(true));
      window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(syncUrl, 120);
    };

    updateActive();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointerdown', enableSync, { passive: true });
    window.addEventListener('wheel', enableSync, { passive: true });
    window.addEventListener('touchmove', enableSync, { passive: true });
    window.addEventListener('keydown', enableSync);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointerdown', enableSync);
      window.removeEventListener('wheel', enableSync);
      window.removeEventListener('touchmove', enableSync);
      window.removeEventListener('keydown', enableSync);
      cancelAnimationFrame(frame);
      window.clearTimeout(syncTimer);
    };
  }, [page.slug]);

  if (examples.length < 2) return null;
  return (
    <aside class="toc">
      <div class="nav-title">On this page</div>
      {examples.map((e) => (
        <a key={e.id} href={href(page.slug, e.id)} aria-current={e.id === activeId ? 'location' : undefined}>
          {e.title}
        </a>
      ))}
    </aside>
  );
}
