import type { JSX, RefObject } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import {
  createPullToRefresh,
  type PullStatus,
  type PullToRefresh,
  type PullToRefreshBehavior,
  type PullToRefreshOptions,
} from '../../src';
import { Drawer } from '../components/Drawer';
import {
  BlogHeader,
  blog,
  dashboard,
  inbox,
  notifications,
  quoteOfTheDay,
  stocks,
  useContent,
  type ContentKind,
} from '../components/PtrContent';
import { Section } from '../components/Section';
import { Table } from '../components/Text';

// ───────────────────────────── demo helpers ─────────────────────────────

/** Creates the instance on mount (with `mouse: true` so the demos work on desktop). */
function usePullToRefresh(
  content: RefObject<HTMLElement | null>,
  options: Omit<PullToRefreshOptions, 'content'>,
): { ptr: PullToRefresh | null; status: PullStatus } {
  const [ptr, setPtr] = useState<PullToRefresh | null>(null);
  const [status, setStatus] = useState<PullStatus>('idle');
  useLayoutEffect(() => {
    const instance = createPullToRefresh({ mouse: true, ...options, content: content.current! });
    const unsubscribe = instance.subscribe((s) => setStatus(s.status));
    setPtr(instance);
    return () => {
      unsubscribe();
      instance.destroy();
    };
    // Options are applied once; demos recreate the instance (via `key`) or call setOptions().
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- create once on mount; options are inline objects
  }, []);
  return { ptr, status };
}

const Status = ({ status, extra }: { status: PullStatus; extra?: string }) => (
  <pre class="preview-log">
    status: {status}
    {extra && `  ·  ${extra}`}
  </pre>
);

const listHtml = (id = 'list') => `<ul id="${id}">
    <li>…</li>
  </ul>`;

// ───────────────────────────── basic ─────────────────────────────

/** Layout every example needs: a clipping wrapper and a content element that scrolls itself. */
function baseCss(content = '#list', wrapper = '.ptr-wrapper') {
  return `${wrapper} {
  position: relative; /* the indicator is absolutely positioned */
  overflow: hidden;   /* hides the indicator above the content */
  height: 420px;
}

${content} {
  height: 100%;
  overflow: auto;     /* the content is its own scroller */
}`;
}

const basicCode = {
  js: `import { createPullToRefresh } from 'zupf';
import 'zupf/pull-to-refresh.css';

const ptr = createPullToRefresh({
  content: '#list',
  onRefresh: async () => {
    await loadNewItems(); // the indicator stays until this settles
  },
});`,
  html: `<div class="ptr-wrapper">
  <div data-zupf-ptr-indicator>
    <span data-zupf-ptr-spinner></span>
  </div>
  ${listHtml()}
</div>`,
  css: baseCss(),
};

function Basic() {
  const list = useRef<HTMLDivElement>(null);
  const { view, load } = useContent(inbox);
  const { status } = usePullToRefresh(list, { onRefresh: load });
  return (
    <Section
      id="basic"
      title="Basic"
      description="Pull the list down and let go. Return a promise from `onRefresh` and the spinner stays until it settles."
      code={basicCode}
    >
      <div class="ptr-demo">
        <div data-zupf-ptr-indicator>
          <span data-zupf-ptr-spinner />
        </div>
        <div ref={list} class={`ptr-demo-list ${inbox.class}`}>
          {view}
        </div>
      </div>
      <Status status={status} />
    </Section>
  );
}

// ───────────────────────────── indicator styles ─────────────────────────────

const arrowCss = `.arrow-indicator {
  gap: 8px;
  font-size: 13px;
  color: #71717a;
}

.arrow-indicator .arrow {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: rotate 200ms;
}

/* data-state: idle | pulling | ready | refreshing */
.arrow-indicator[data-state='ready'] .arrow {
  rotate: 180deg;
}

.arrow-indicator [data-zupf-ptr-spinner] {
  display: none;
  width: 16px;
  height: 16px;
  border-width: 2px;
}

/* data-settling='refreshed' keeps the refreshing look while it slides away. */
.arrow-indicator:is([data-state='refreshing'], [data-settling='refreshed']) .arrow {
  display: none;
}
.arrow-indicator:is([data-state='refreshing'], [data-settling='refreshed']) [data-zupf-ptr-spinner] {
  display: block;
}

.arrow-indicator .label::after { content: 'Pull to refresh'; }
.arrow-indicator[data-state='ready'] .label::after { content: 'Release to refresh'; }
.arrow-indicator[data-state='refreshing'] .label::after { content: 'Refreshing…'; }
.arrow-indicator[data-settling='refreshed'] .label::after { content: 'Updated just now'; }`;

const arrowPath = 'M12 5v14M5 12l7 7 7-7';

const themedCss = `.themed {
  --zupf-ptr-indicator-size: 72px;
  --zupf-ptr-spinner-color: #7c3aed;
  --zupf-ptr-spinner-track: rgb(124 58 237 / 0.15);
}

.themed [data-zupf-ptr-indicator] {
  background: linear-gradient(#ede9fe, transparent);
}

.themed [data-zupf-ptr-spinner] {
  width: 28px;
  height: 28px;
  border-width: 3px;
}`;

const ringCss = `/* --zupf-ptr-progress (0..1) drives the ring fill. */
.ring {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: conic-gradient(
    #0ea5e9 calc(var(--zupf-ptr-progress) * 360deg),
    rgb(14 165 233 / 0.15) 0
  );
  mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
  scale: calc(0.6 + var(--zupf-ptr-progress) * 0.4);
}

[data-zupf-ptr-indicator]:is([data-state='refreshing'], [data-settling='refreshed']) .ring {
  background: conic-gradient(#0ea5e9 90deg, rgb(14 165 233 / 0.15) 0);
  animation: ring-spin 0.8s linear infinite;
}

@keyframes ring-spin {
  to { transform: rotate(360deg); }
}`;

const revealCss = `/* No indicator: the list uncovers a panel behind it. */
.reveal-panel {
  position: absolute;
  inset: 0 0 auto;
  height: 160px; /* covers the whole pull (max: 150) */
  display: grid;
  place-items: start center;
  padding-top: 22px;
  box-sizing: border-box;
  font-size: 13px;
  color: #fff;
  background: linear-gradient(135deg, #f43f5e, #f97316);
}

.reveal-panel::after { content: '↓  Keep pulling'; }
.reveal:has([data-state='ready']) .reveal-panel::after { content: '↑  Let go'; }
.reveal:has([data-state='refreshing']) .reveal-panel::after { content: 'Loading…'; }

.reveal [data-zupf-ptr] {
  position: relative; /* above the panel */
  background: var(--list-bg, #fff);
  transition: border-radius 200ms;
}

.reveal [data-zupf-ptr]:not([data-state='idle']) {
  border-radius: 16px 16px 0 0;
}`;

interface IndicatorStyle {
  label: string;
  /** Class on the area around the indicator and content. */
  area?: string;
  css?: string;
  /** Indicator markup for the HTML tab. */
  html: string;
  /** Live indicator; `null` = no indicator element (`indicator: null`). */
  Indicator: (() => JSX.Element) | null;
  Behind?: () => JSX.Element;
}

const indicatorStyles: IndicatorStyle[] = [
  {
    label: 'Spinner',
    html: `<div data-zupf-ptr-indicator>
  <span data-zupf-ptr-spinner></span>
</div>`,
    Indicator: () => (
      <div data-zupf-ptr-indicator>
        <span data-zupf-ptr-spinner />
      </div>
    ),
  },
  {
    label: 'Themed',
    area: 'themed',
    css: themedCss,
    html: `<div data-zupf-ptr-indicator>
  <span data-zupf-ptr-spinner></span>
</div>`,
    Indicator: () => (
      <div data-zupf-ptr-indicator>
        <span data-zupf-ptr-spinner />
      </div>
    ),
  },
  {
    label: 'Progress ring',
    css: ringCss,
    html: `<div data-zupf-ptr-indicator>
  <span class="ring"></span>
</div>`,
    Indicator: () => (
      <div data-zupf-ptr-indicator>
        <span class="ring" />
      </div>
    ),
  },
  {
    label: 'Arrow + label',
    css: arrowCss,
    html: `<div data-zupf-ptr-indicator class="arrow-indicator">
  <svg class="arrow" viewBox="0 0 24 24"><path d="${arrowPath}" /></svg>
  <span data-zupf-ptr-spinner></span>
  <span class="label"></span>
</div>`,
    Indicator: () => (
      <div data-zupf-ptr-indicator class="arrow-indicator">
        <svg class="arrow" viewBox="0 0 24 24">
          <path d={arrowPath} />
        </svg>
        <span data-zupf-ptr-spinner />
        <span class="label" />
      </div>
    ),
  },
  {
    label: 'Reveal',
    area: 'reveal',
    css: revealCss,
    html: `<div class="reveal-panel"></div>`,
    Indicator: null,
    Behind: () => <div class="reveal-panel" />,
  },
];

const indent = (text: string, spaces: number) =>
  text
    .split('\n')
    .map((line) => ' '.repeat(spaces) + line)
    .join('\n');

// ───────────────────────────── blog ─────────────────────────────

const blogCss = `.blog {
  height: 100%;
  overflow: auto; /* the scroller */
  overscroll-behavior-y: contain;
}

.blog > header {
  position: sticky;
  top: 0;
  z-index: 1;           /* above the indicator and the pulled posts */
  background: #fff;     /* opaque: the indicator hides behind it */
}

.posts-area {
  position: relative;   /* the indicator starts right below the header */
}`;

function BlogDemo({ style }: { style: IndicatorStyle }) {
  const content = useRef<HTMLDivElement>(null);
  const { view, load } = useContent(blog, 1100);
  const { status } = usePullToRefresh(content, {
    onRefresh: load,
    ...(style.Indicator ? {} : { indicator: null }),
  });
  const { Indicator, Behind } = style;
  return (
    <>
      <div class="ptr-demo ptr-demo-tall">
        <div class="c-blog-scroller">
          <header class="c-blog-sticky">
            <BlogHeader />
          </header>
          <div class={`c-blog-posts-area ${style.area ?? ''}`}>
            {Behind && <Behind />}
            {Indicator && <Indicator />}
            <div ref={content} class={blog.class}>
              {view}
            </div>
          </div>
        </div>
      </div>
      <Status status={status} />
    </>
  );
}

function Blog() {
  const [variant, setVariant] = useState(0);
  const style = indicatorStyles[variant];
  const area = style.area ? `posts-area ${style.area}` : 'posts-area';
  return (
    <Section
      id="blog"
      title="Indicator styles"
      description="The indicator is your own markup, styled in plain CSS: zupf sets `data-state` and `--zupf-ptr-progress` on it. Switch styles above, from a themed spinner to a progress ring or a panel revealed behind the posts (`indicator: null`). The sticky header stays put; only the posts move."
      code={{
        js: `const ptr = createPullToRefresh({
  content: '#posts',
  // scroller: '.blog' is found automatically (nearest scrollable ancestor);
  // pass it explicitly when the scroller is further away or not scrollable yet${
    style.Indicator ? '' : '\n  indicator: null, // the panel behind the posts is the indicator'
  }
  onRefresh: async () => {
    const posts = await fetch('/api/posts?since=' + lastSeen).then((r) => r.json());
    if (posts.length) renderPosts(posts);
  },
});`,
        html: `<main class="blog">
  <header>
    <h1>The Field Notes</h1>
    <nav class="topics">…</nav>
  </header>
  <div class="${area}">
${indent(style.html, 4)}
    <div id="posts">
      <article class="featured">…</article>
      <article>…</article>
    </div>
  </div>
</main>`,
        css: style.css ? `${blogCss}\n\n${style.css}` : blogCss,
      }}
      variants={indicatorStyles.map((v) => v.label)}
      variant={variant}
      onVariant={setVariant}
    >
      {/* Keyed: switching recreates the instance (the indicator element changes). */}
      <BlogDemo key={style.label} style={style} />
    </Section>
  );
}

// ───────────────────────────── dashboard ─────────────────────────────

function Dashboard() {
  const content = useRef<HTMLDivElement>(null);
  const { view, load } = useContent(dashboard, 1000);
  const { status } = usePullToRefresh(content, { onRefresh: load });
  return (
    <Section
      id="dashboard"
      title="Dashboard"
      description="Anything scrollable can be pulled, not only lists. Here a refresh replaces the whole dashboard."
      code={{
        js: `const ptr = createPullToRefresh({
  content: '#metrics',
  onRefresh: async () => {
    const metrics = await fetch('/api/metrics').then((r) => r.json());
    renderDashboard(metrics);
  },
});`,
        html: `<div class="ptr-wrapper">
  <div data-zupf-ptr-indicator>
    <span data-zupf-ptr-spinner></span>
  </div>
  <main id="metrics">
    <section class="kpis">…</section>
    <section class="chart">…</section>
    <table class="orders">…</table>
  </main>
</div>`,
        css: baseCss('#metrics'),
      }}
    >
      <div class="ptr-demo ptr-demo-tall">
        <div data-zupf-ptr-indicator>
          <span data-zupf-ptr-spinner />
        </div>
        <div ref={content} class={`ptr-demo-list ${dashboard.class}`}>
          {view}
        </div>
      </div>
      <Status status={status} />
    </Section>
  );
}

// ───────────────────────────── widgets ─────────────────────────────

const widgetCss = `.widget {
  position: relative;
  overflow: hidden;
  height: 220px;
  --zupf-ptr-indicator-size: 44px; /* smaller container, smaller indicator */
}

.widget [data-zupf-ptr-spinner] {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

.widget-body {
  height: 100%;
  overflow: auto; /* its own scroller, even when the content fits */
}`;

function Widget<S>({ kind, title }: { kind: ContentKind<S>; title: string }) {
  const content = useRef<HTMLDivElement>(null);
  const { view, load } = useContent(kind, 900);
  const { status } = usePullToRefresh(content, { onRefresh: load, threshold: 44, max: 96 });
  return (
    <div class="ptr-widget-wrap">
      <div class="widget ptr-widget" aria-label={title}>
        <div data-zupf-ptr-indicator>
          <span data-zupf-ptr-spinner />
        </div>
        <div ref={content} class={`widget-body ${kind.class}`}>
          {view}
        </div>
      </div>
      <small>{status}</small>
    </div>
  );
}

function Widgets() {
  return (
    <Section
      id="widgets"
      title="Small containers"
      description="One instance per widget. Scale `threshold`, `max` and the indicator size down with the container, and give the content `overflow: auto` so it is its own scroller."
      code={{
        js: `for (const body of document.querySelectorAll('.widget-body')) {
  createPullToRefresh({
    content: body,
    threshold: 44,
    max: 96,
    onRefresh: () => reloadWidget(body),
  });
}`,
        html: `<div class="widget">
  <div data-zupf-ptr-indicator>
    <span data-zupf-ptr-spinner></span>
  </div>
  <div class="widget-body">…</div>
</div>`,
        css: widgetCss,
      }}
    >
      <div class="ptr-widgets">
        <Widget kind={quoteOfTheDay} title="Phrase of the day" />
        <Widget kind={stocks} title="Watchlist" />
      </div>
    </Section>
  );
}

// ───────────────────────────── tuning ─────────────────────────────

type Tuning = Partial<Pick<PullToRefreshBehavior, 'threshold' | 'max' | 'refreshingOffset' | 'duration' | 'easing'>>;

const tuningVariants: { label: string; options: Tuning }[] = [
  { label: 'Default', options: {} },
  { label: 'Short pull', options: { threshold: 40, max: 90 } },
  { label: 'Long pull', options: { threshold: 110, max: 240 } },
  { label: 'Tight rest', options: { refreshingOffset: 44 } },
  { label: 'Bouncy', options: { duration: 650, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' } },
];

const formatOptions = (options: Tuning) =>
  Object.entries(options)
    .map(([k, v]) => `  ${k}: ${typeof v === 'string' ? `'${v}'` : v},\n`)
    .join('');

const thresholdCss = `/* Optional while tuning: a guide at the threshold.
   The content's top edge must pass it before releasing refreshes. */
.threshold-line {
  position: absolute;
  top: var(--threshold, 64px);
  left: 0;
  right: 0;
  z-index: 2;
  padding: 2px 6px;
  border-top: 1px dashed #ef4444;
  color: #ef4444;
  font-size: 10px;
  text-align: right;
  pointer-events: none;
}`;

function TuningDemo({ options }: { options: Tuning }) {
  const list = useRef<HTMLDivElement>(null);
  const { view, load } = useContent(inbox);
  const [pull, setPull] = useState({ offset: 0, progress: 0 });
  const { status } = usePullToRefresh(list, {
    ...options,
    onRefresh: load,
    onPull: (offset, progress) => setPull({ offset, progress }),
  });
  return (
    <>
      <div class="ptr-demo">
        <div class="threshold-line" style={{ '--threshold': `${options.threshold ?? 64}px` }}>
          threshold
        </div>
        <div data-zupf-ptr-indicator>
          <span data-zupf-ptr-spinner />
        </div>
        <div ref={list} class={`ptr-demo-list ${inbox.class}`}>
          {view}
        </div>
      </div>
      <Status
        status={status}
        extra={`offset: ${Math.round(pull.offset)}px  ·  progress: ${pull.progress.toFixed(2)}`}
      />
    </>
  );
}

function Tuning() {
  const [variant, setVariant] = useState(0);
  const { label, options } = tuningVariants[variant];
  return (
    <Section
      id="tuning"
      title="Threshold and feel"
      description="`threshold`: how far to pull before release refreshes. `max`: where resistance tops out. `refreshingOffset`: where the content rests while loading. `duration` / `easing`: the settle animation. `onPull` reports every frame."
      code={{
        js: `const ptr = createPullToRefresh({
  content: '#list',
${formatOptions(options)}  onPull: (offset, progress) => console.log(offset, progress),
  onRefresh: loadNewItems,
});`,
        html: `<div class="ptr-wrapper">
  <div class="threshold-line" style="--threshold: ${options.threshold ?? 64}px">threshold</div>
  <div data-zupf-ptr-indicator>
    <span data-zupf-ptr-spinner></span>
  </div>
  ${listHtml()}
</div>`,
        css: `${baseCss()}

${thresholdCss}`,
      }}
      variants={tuningVariants.map((v) => v.label)}
      variant={variant}
      onVariant={setVariant}
    >
      <TuningDemo key={label} options={options} />
    </Section>
  );
}

// ───────────────────────────── API ─────────────────────────────

function Api() {
  const list = useRef<HTMLDivElement>(null);
  const { view, load } = useContent(notifications);
  const [log, setLog] = useState<string[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [mouse, setMouse] = useState(false);
  const { ptr, status } = usePullToRefresh(list, { onRefresh: load, mouse: false });

  useEffect(
    () =>
      ptr?.subscribe((s) => setLog((prev) => [...prev.slice(-4), `${new Date().toLocaleTimeString()}  ${s.status}`])),
    [ptr],
  );

  return (
    <Section
      id="api"
      title="Controlling it"
      description="`refresh()` runs one from code. `setOptions()` changes options at runtime, e.g. `disabled`. Mouse pulls are off by default: toggle them here. `subscribe()` reports every status change."
      code={{
        js: `const ptr = createPullToRefresh({
  content: '#list',
  onRefresh: loadNewItems,
});

refreshButton.onclick = () => ptr.refresh();
ptr.setOptions({ disabled: true });
ptr.setOptions({ mouse: true });

ptr.subscribe(({ status }) => console.log(status));
ptr.status; // 'idle' | 'pulling' | 'ready' | 'refreshing'`,
        html: basicCode.html,
        css: basicCode.css,
      }}
    >
      <div class="preview-actions">
        <button class="btn btn-primary" onClick={() => void ptr?.refresh()}>
          refresh()
        </button>
        <button
          class="btn"
          aria-pressed={disabled}
          onClick={() => {
            ptr?.setOptions({ disabled: !disabled });
            setDisabled(!disabled);
          }}
        >
          disabled: {String(disabled)}
        </button>
        <button
          class="btn"
          aria-pressed={mouse}
          onClick={() => {
            ptr?.setOptions({ mouse: !mouse });
            setMouse(!mouse);
          }}
        >
          mouse: {String(mouse)}
        </button>
      </div>
      <div class="ptr-demo">
        <div data-zupf-ptr-indicator>
          <span data-zupf-ptr-spinner />
        </div>
        <div ref={list} class={`ptr-demo-list ${notifications.class}`}>
          {view}
        </div>
      </div>
      <pre class="preview-log">{log.join('\n') || `status: ${status}`}</pre>
    </Section>
  );
}

// ───────────────────────────── nested content ─────────────────────────────

const nestedCss = `.carousel {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
}

.carousel > * {
  flex: 0 0 70%;
  scroll-snap-align: start;
}

.inner-scroller {
  max-height: 140px;
  overflow: auto;
}`;

function Nested() {
  const list = useRef<HTMLDivElement>(null);
  const { view, load } = useContent(inbox);
  const { status } = usePullToRefresh(list, { onRefresh: load });
  return (
    <Section
      id="nested"
      title="Nested content"
      description="Carousels keep their sideways swipes, inner scrollers scroll to their own top first, and `[data-zupf-no-drag]` opts an area out completely."
      code={{
        js: basicCode.js,
        html: `<div class="ptr-wrapper">
  <div data-zupf-ptr-indicator>
    <span data-zupf-ptr-spinner></span>
  </div>
  <div id="list">
    <div class="carousel">…</div>
    <div class="inner-scroller">…</div>
    <canvas data-zupf-no-drag></canvas>
    …
  </div>
</div>`,
        css: `${baseCss()}

${nestedCss}`,
      }}
    >
      <div class="ptr-demo">
        <div data-zupf-ptr-indicator>
          <span data-zupf-ptr-spinner />
        </div>
        <div ref={list} class="ptr-demo-list ptr-nested">
          <div class="carousel">
            {['Swipe', 'me', 'sideways', '→'].map((t) => (
              <div key={t} class="ptr-card">
                {t}
              </div>
            ))}
          </div>
          <div class="inner-scroller ptr-inner">
            <strong>Inner scroller</strong>
            {Array.from({ length: 10 }, (_, i) => (
              <p key={i}>Scroll me first. Line {i + 1}</p>
            ))}
          </div>
          <div class="ptr-no-drag" data-zupf-no-drag>
            data-zupf-no-drag
            <br />
            pulls never start here
          </div>
          <div class={inbox.class}>{view}</div>
        </div>
      </div>
      <Status status={status} />
    </Section>
  );
}

// ───────────────────────────── in a drawer ─────────────────────────────

const drawerCss = `#sheet {
  height: 75dvh;
}

.sheet-list {
  position: relative;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

.sheet-list #sheet-list {
  height: 100%;
  overflow: auto;
}`;

function DrawerList() {
  const list = useRef<HTMLDivElement>(null);
  const { view, load } = useContent(notifications);
  const { status } = usePullToRefresh(list, { onRefresh: load });
  return (
    <>
      <div class="ptr-sheet-header">
        <h2 data-zupf-title>Notifications</h2>
        <span class="ptr-sheet-status">{status}</span>
      </div>
      <div class="sheet-list">
        <div data-zupf-ptr-indicator>
          <span data-zupf-ptr-spinner />
        </div>
        <div ref={list} class={`ptr-demo-list ${notifications.class}`} data-zupf-no-drag>
          {view}
        </div>
      </div>
    </>
  );
}

function InDrawer() {
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <Section
      id="drawer"
      title="In a drawer"
      description="Put `[data-zupf-no-drag]` on the list: pulling it refreshes, while the handle and header still drag the sheet."
      code={{
        js: `import { createSheet, createPullToRefresh } from 'zupf';
import 'zupf/style.css';
import 'zupf/pull-to-refresh.css';

createSheet({ content: '#sheet', overlay: '#overlay', trigger: '#open' });
createPullToRefresh({ content: '#sheet-list', onRefresh: loadNotifications });`,
        html: `<button id="open">Notifications</button>

<div id="overlay"></div>
<div id="sheet" hidden>
  <div data-zupf-handle></div>
  <h2 data-zupf-title>Notifications</h2>
  <div class="sheet-list">
    <div data-zupf-ptr-indicator>
      <span data-zupf-ptr-spinner></span>
    </div>
    <div id="sheet-list" data-zupf-no-drag>…</div>
  </div>
</div>`,
        css: drawerCss,
      }}
    >
      <div class="preview-actions">
        <button ref={trigger} class="btn btn-primary">
          Open Drawer
        </button>
      </div>
      <Drawer id="ptr-drawer" trigger={trigger}>
        <style>{drawerCss.replace('#sheet', '#ptr-drawer-sheet')}</style>
        <DrawerList />
      </Drawer>
    </Section>
  );
}

// ───────────────────────────── page ─────────────────────────────

export const pullToRefreshToc = [
  { id: 'basic', title: 'Basic' },
  { id: 'blog', title: 'Indicator styles' },
  { id: 'drawer', title: 'In a drawer' },
  { id: 'dashboard', title: 'Dashboard' },
  { id: 'widgets', title: 'Small containers' },
  { id: 'nested', title: 'Nested content' },
  { id: 'tuning', title: 'Threshold and feel' },
  { id: 'api', title: 'Controlling it' },
  { id: 'options', title: 'Options' },
];

export function PullToRefreshPage() {
  return (
    <>
      <p class="lead">
        Pull down at the top of any scroller to refresh. It follows the finger, ignores sideways swipes and leaves
        native scrolling alone. Demos here enable mouse pulls so you can try them on desktop.
      </p>
      <Basic />
      <Blog />
      <InDrawer />
      <Dashboard />
      <Widgets />
      <Nested />
      <Tuning />
      <Api />
      <section id="options">
        <h2>Options</h2>
        <Table
          head={['Option', 'Default', 'Description']}
          rows={[
            ['content', '', 'The element that is pulled down. Element or selector.'],
            [
              'indicator',
              '[data-zupf-ptr-indicator]',
              'Revealed above the content, found next to it by default. `null` for none.',
            ],
            [
              'scroller',
              'auto',
              'Element or selector that must be scrolled to the top. Defaults to `content` if it scrolls, else its nearest scrollable ancestor or the page.',
            ],
            [
              'onRefresh',
              '',
              'Called on release past the threshold. Return a promise to keep the refreshing state until it settles.',
            ],
            ['threshold', '64', 'Visible offset in px needed to refresh.'],
            ['max', '150', 'Offset the pull approaches, with growing resistance.'],
            ['refreshingOffset', 'threshold', 'Where the content rests while refreshing.'],
            ['mouse', 'false', 'Also allow pulling with a mouse. Touch and pen always work.'],
            ['disabled', 'false', 'Ignore pulls.'],
            ['duration', '300', 'Settle transition in ms.'],
            ['easing', 'cubic-bezier(0.32, 0.72, 0, 1)', 'Settle transition timing function.'],
            ['onPull', '', '`(offset, progress)` on every pull frame.'],
            ['onStatusChange', '', '`idle`, `pulling`, `ready` or `refreshing`.'],
          ]}
        />
        <h3>Instance</h3>
        <p>
          <code>refresh()</code>, <code>setOptions(partial)</code>, <code>getState()</code>, <code>subscribe(fn)</code>,{' '}
          <code>destroy()</code>, <code>status</code>.
        </p>
        <h3>Styling hooks</h3>
        <Table
          head={['Hook', 'On', 'Description']}
          rows={[
            ['data-state', 'content, indicator', '`idle`, `pulling`, `ready` or `refreshing`.'],
            ['data-settling', 'indicator', '`refreshed` or `cancelled` while sliding back to rest.'],
            ['data-pulling', 'content', 'Set while a finger is pulling.'],
            ['--zupf-ptr-offset', 'content, indicator', 'Current pull offset in px.'],
            ['--zupf-ptr-progress', 'content, indicator', '0..1 towards the threshold.'],
            ['--zupf-ptr-indicator-size', 'theme', 'Indicator height. Default `64px`.'],
            ['--zupf-ptr-spinner-color', 'theme', 'Spinner color. Default `currentColor`.'],
            ['--zupf-ptr-spinner-track', 'theme', 'Spinner track color.'],
          ]}
        />
      </section>
    </>
  );
}
