import { render } from 'preact';
import { useEffect } from 'preact/hooks';
import { Example } from './components/Example';
import { Header, Nav, Pager, Toc } from './components/Layout';
import { pages } from './pages';
import { route } from './router';
import './docs.css';

if (import.meta.env.DEV) await import('preact/debug');

function PageView() {
  const { slug, anchor } = route.value;
  const page = pages.find((p) => p.slug === slug) ?? pages[0];

  useEffect(() => {
    document.title = `${page.title} · zupf`;
  }, [page]);

  useEffect(() => {
    if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo(0, 0);
  }, [slug, anchor]);

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

function App() {
  return (
    // Everything inside the wrapper is scaled back by `scaleBackground`; sheets portal to <body>.
    <div data-zupf-wrapper class="app">
      <Header />
      <div class="layout">
        <nav class="sidebar" aria-label="Documentation">
          <Nav />
        </nav>
        {/* Keyed by page so example sheets are created and destroyed per page. */}
        <PageView key={route.value.slug} />
      </div>
    </div>
  );
}

render(<App />, document.getElementById('app')!);
