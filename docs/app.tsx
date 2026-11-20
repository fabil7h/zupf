import { LocationProvider, Route, Router } from 'preact-iso';
import { useEffect } from 'preact/hooks';
import { Example } from './components/Example';
import { Landing } from './components/Landing';
import { Header, Nav, Pager, Toc } from './components/Layout';
import type { Page } from './examples';
import { pages } from './pages';
import { useDocRoute } from './router';
import './docs.css';

function PageView({ page }: { page: Page }) {
  const { anchor } = useDocRoute();

  useEffect(() => {
    document.title = `${page.title} · zupf`;
  }, [page]);

  // The router scrolls to the top on navigation; anchors are ours to handle.
  useEffect(() => {
    if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' });
  }, [page, anchor]);

  return (
    <main class="content">
      <article>
        <h1>{page.title}</h1>
        {page.intro && <p class="lead" dangerouslySetInnerHTML={{ __html: page.intro }} />}
        {page.Component ? <page.Component /> : page.examples?.map((ex) => <Example key={ex.id} ex={ex} />)}
        <Pager page={page} />
      </article>
      <Toc page={page} />
    </main>
  );
}

function DocsPage() {
  const { slug } = useDocRoute();
  const page = pages.find((p) => p.slug === slug);
  if (!page) return <NotFound />;

  return (
    // Everything inside the wrapper is scaled back by `scaleBackground`; sheets portal to <body>.
    <div data-zupf-wrapper class="app">
      <Header />
      <div class="layout">
        <nav class="sidebar" aria-label="Documentation">
          <Nav />
        </nav>
        {/* Keyed by page so example sheets are created and destroyed per page. */}
        <PageView key={page.slug} page={page} />
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <main class="content">
      <h1>Page not found</h1>
      <p>
        <a href="/">Back to zupf</a>
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
