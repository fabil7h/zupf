import { LocationProvider, Route, Router } from 'preact-iso';
import { useEffect } from 'preact/hooks';
import { Header, Nav, Pager, Toc, useActiveSection } from './components/Layout';
import type { Page } from './examples';
import { Landing, pages } from './pages';
import { useDocRoute } from './router';

function PageView({ page }: { page: Page }) {
  const { anchor } = useDocRoute();
  useActiveSection(page);

  useEffect(() => {
    document.title = `${page.title} · zupf`;
  }, [page]);

  // The router scrolls to the top on navigation; anchors are ours to handle.
  // Page bodies load lazily: on client navigation the target may not exist yet, so wait for it.
  useEffect(() => {
    if (!anchor) return undefined;
    const scrollTo = (target: HTMLElement) => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    };
    const target = document.getElementById(anchor);
    if (target) {
      scrollTo(target);
      return undefined;
    }
    const observer = new MutationObserver(() => {
      const appeared = document.getElementById(anchor);
      if (!appeared) return;
      observer.disconnect();
      scrollTo(appeared);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [page, anchor]);

  return (
    <main class="grid grid-cols-[minmax(0,720px)] px-12 pt-10 pb-24 max-md:px-5 max-md:pt-7 max-md:pb-16">
      <article>
        <h1>{page.title}</h1>
        {page.intro && <p class="text-base text-muted" dangerouslySetInnerHTML={{ __html: page.intro }} />}
        <page.Component />
        <Pager page={page} />
      </article>
    </main>
  );
}

function DocsPage() {
  const { slug } = useDocRoute();
  const page = pages.find((p) => p.slug === slug);
  if (!page) return <NotFound />;

  return (
    // Everything inside the wrapper is scaled back by `scaleBackground`; sheets portal to <body>.
    <div data-zupf-wrapper class="min-h-screen bg-canvas">
      <Header page={page} />
      <div class="mx-auto grid max-w-[1280px] grid-cols-[240px_minmax(0,1fr)] max-md:grid-cols-[minmax(0,1fr)]">
        <nav
          class="sticky top-14 h-[calc(100vh-56px)] self-start overflow-y-auto border-r border-line pt-7 pr-4 pb-7 pl-6 max-md:hidden"
          aria-label="Documentation"
        >
          <Nav />
          <Toc page={page} />
        </nav>
        {/* Keyed by page so example sheets are created and destroyed per page. */}
        <PageView key={page.slug} page={page} />
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <main class="grid grid-cols-[minmax(0,720px)] px-12 pt-10 pb-24 max-md:px-5 max-md:pt-7 max-md:pb-16">
      <h1>Page not found</h1>
      <p>
        <a class="underline" href="/">
          Back to zupf
        </a>
      </p>
    </main>
  );
}

export function App() {
  return (
    <LocationProvider>
      <Router>
        <Route path="/" component={Landing} />
        <Route path="/:slug" component={DocsPage} />
        <Route default component={NotFound} />
      </Router>
    </LocationProvider>
  );
}

/** Title of the route at `path`, for the prerendered `<title>`. */
export function titleFor(slug: string): string {
  const page = pages.find((p) => p.slug === slug);
  return page ? `${page.title} · zupf` : 'zupf';
}
