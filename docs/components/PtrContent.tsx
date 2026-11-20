// Demo content for the pull-to-refresh docs: different kinds of containers and content,
// each with a `refresh` that changes what is shown.
import type { JSX } from 'preact';
import { useMemo, useState } from 'preact/hooks';

export interface ContentKind<S> {
  initial: () => S;
  refresh: (state: S) => S;
  View: (props: { state: S }) => JSX.Element;
  /** Classes for the pulled content element. */
  class?: string;
}

/** Meta text inside the demo lists. */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pick = <T,>(list: readonly T[], i: number) => list[((i % list.length) + list.length) % list.length];
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clock = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** State + a slow `load` that refreshes it, for `onRefresh`. */
export function useContent<S>(kind: ContentKind<S>, delay = 1200) {
  const [state, setState] = useState(kind.initial);
  const load = async () => {
    await wait(delay);
    setState((s) => kind.refresh(s));
  };
  // Same element while the state is unchanged, so status re-renders (pulling, ready…) skip the list.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- kind is a module constant
  const view = useMemo(() => <kind.View state={state} />, [state]);
  return { view, load };
}

let uid = 0;
const id = () => ++uid;

// ───────────────────────────── inbox ─────────────────────────────

const senders = ['Mira', 'Jonas', 'Priya', 'Leo', 'Ana', 'Theo', 'Sam', 'Noor'];
const subjects = [
  'Quarterly planning notes',
  'Re: Design review on Friday',
  'Your order has shipped',
  'Lunch tomorrow?',
  'Updated invoice attached',
  'Welcome to the team!',
  'Weekend hiking trip',
  'Release checklist v2.4',
];
const previews = [
  'I went through the draft and left a few comments on the second section…',
  'Sounds good to me. Can we move it to 3pm so everyone can join?',
  'Track your package anytime from your account page.',
  'There is a new place around the corner that I wanted to try.',
  'Please find the corrected numbers in the attached PDF.',
  'We are so happy to have you. Here are a few things to get started.',
];

interface Mail {
  id: number;
  from: string;
  subject: string;
  preview: string;
  time: string;
  unread: boolean;
}

const mail = (i: number, time: string, unread = false): Mail => ({
  id: id(),
  from: pick(senders, i),
  subject: pick(subjects, i * 3),
  preview: pick(previews, i * 5),
  time,
  unread,
});

export const inbox: ContentKind<Mail[]> = {
  initial: () => Array.from({ length: 14 }, (_, i) => mail(i, `${i + 1}h`)),
  refresh: (list) => [mail(list.length, 'now', true), mail(list.length + 1, 'now', true), ...list],
  View: ({ state }) => (
    <ul>
      {state.map((m) => (
        <li
          key={m.id}
          class="group flex gap-3 border-b border-line px-4 py-3 text-fg"
          data-unread={m.unread || undefined}
        >
          <span class="grid size-9 flex-none place-items-center rounded-full border border-line bg-surface text-sm font-semibold corner-round group-data-unread:border-info group-data-unread:bg-info group-data-unread:text-white">
            {m.from[0]}
          </span>
          <span class="grid min-w-0 gap-0.5 text-sm">
            <span class="flex justify-between gap-2">
              <strong>{m.from}</strong>
              <small class="text-xs text-muted">{m.time}</small>
            </span>
            <span class="truncate group-data-unread:font-semibold">{m.subject}</span>
            <span class="truncate text-[13px] text-muted">{m.preview}</span>
          </span>
        </li>
      ))}
    </ul>
  ),
};

// ───────────────────────────── phrases ─────────────────────────────

const phrases = [
  ['Small steps still move you forward.', 'focus'],
  ['Done is a feature.', 'shipping'],
  ['Make it work, make it right, then make it fast.', 'craft'],
  ['The best interface is the one you stop noticing.', 'design'],
  ['Write it down before you forget why it mattered.', 'notes'],
  ['A good default beats a hundred settings.', 'design'],
  ['Rest is part of the work.', 'balance'],
  ['Ask the question you think is obvious.', 'teams'],
  ['Delete code with confidence, not with fear.', 'craft'],
  ['Every pull deserves a fresh thought.', 'refresh'],
  ['Slow is smooth, smooth is fast.', 'focus'],
  ['Leave the campsite cleaner than you found it.', 'craft'],
] as const;

interface Phrase {
  id: number;
  text: string;
  tag: string;
}

const phrase = (i: number): Phrase => {
  const [text, tag] = pick(phrases, i);
  return { id: id(), text, tag };
};

/** A single phrase that is replaced on refresh (for a small widget). */
export const quoteOfTheDay: ContentKind<{ index: number; phrase: Phrase }> = {
  initial: () => ({ index: 3, phrase: phrase(3) }),
  refresh: (s) => ({ index: s.index + 1, phrase: phrase(s.index + 1) }),
  View: ({ state }) => (
    <div class="flex h-full flex-col justify-between p-4">
      <small>Phrase of the day</small>
      <p class="m-0 text-[19px] leading-[1.3] font-semibold text-fg">{state.phrase.text}</p>
      <small>#{state.phrase.tag}</small>
    </div>
  ),
};

// ───────────────────────────── dashboard ─────────────────────────────

interface Dashboard {
  updated: string;
  kpis: { label: string; value: string; delta: number }[];
  bars: number[];
  orders: { id: number; customer: string; total: string; status: string }[];
}

const customers = ['Northwind', 'Blue Harbor', 'Kestrel & Co', 'Lumen Labs', 'Oakline', 'Fernway'];
const orderStatus = ['Paid', 'Pending', 'Shipped'];

const dashboardState = (): Dashboard => ({
  updated: clock(),
  kpis: [
    { label: 'Revenue', value: `$${rand(38, 52).toFixed(1)}k`, delta: rand(-6, 12) },
    { label: 'Active users', value: Math.round(rand(1200, 1900)).toLocaleString(), delta: rand(-4, 9) },
    { label: 'Conversion', value: `${rand(2.1, 4.4).toFixed(2)}%`, delta: rand(-3, 3) },
    { label: 'p95 latency', value: `${Math.round(rand(120, 260))} ms`, delta: rand(-15, 10) },
  ],
  bars: Array.from({ length: 12 }, () => rand(0.2, 1)),
  orders: Array.from({ length: 6 }, (_, i) => ({
    id: Math.round(rand(10000, 99999)),
    customer: pick(customers, Math.round(rand(0, 6)) + i),
    total: `$${rand(40, 900).toFixed(2)}`,
    status: pick(orderStatus, Math.round(rand(0, 3))),
  })),
});

export const dashboard: ContentKind<Dashboard> = {
  initial: dashboardState,
  refresh: dashboardState,
  View: ({ state }) => (
    <div class="grid min-h-full gap-3 bg-surface p-3.5">
      <div class="flex items-baseline justify-between text-fg">
        <strong>Overview</strong>
        <small class="text-xs text-muted">Updated {state.updated}</small>
      </div>
      <div class="grid grid-cols-2 gap-2">
        {state.kpis.map((k) => (
          <div key={k.label} class="kpi-card">
            <small class="text-xs text-muted">{k.label}</small>
            <strong class="text-xl text-fg tabular-nums">{k.value}</strong>
            <span class={`text-xs ${k.delta >= 0 ? 'text-success' : 'text-danger'}`}>
              {k.delta >= 0 ? '▲' : '▼'} {Math.abs(k.delta).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
      <div class="kpi-card">
        <small class="text-xs text-muted">Sessions, last 12 hours</small>
        <div class="mt-1.5 flex h-20 items-end gap-1">
          {state.bars.map((v, i) => (
            <span
              key={i}
              class="h-full flex-1 origin-bottom rounded-t-[3px] bg-linear-to-b from-[#6366f1] to-[#a5b4fc] transition-[scale] duration-400 ease-[ease] motion-reduce:transition-none"
              style={{ scale: `1 ${v}` }}
            />
          ))}
        </div>
      </div>
      <div class="kpi-card">
        <small class="text-xs text-muted">Recent orders</small>
        <table class="w-full border-collapse text-xs text-fg tabular-nums">
          <tbody>
            {state.orders.map((o) => (
              <tr key={o.id}>
                <td class="order-cell whitespace-nowrap">#{o.id}</td>
                <td class="order-cell">{o.customer}</td>
                <td class="order-cell">{o.total}</td>
                <td class="order-cell text-right">
                  <span
                    class="rounded-full bg-surface px-2 py-0.5 text-[11px] data-[status=Paid]:bg-success/12 data-[status=Paid]:text-success data-[status=Pending]:bg-[rgb(234_179_8/0.15)] data-[status=Pending]:text-[#a16207]"
                    data-status={o.status}
                  >
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ),
};

// ───────────────────────────── notifications ─────────────────────────────

const events = [
  ['✅', 'Build #482 passed'],
  ['💬', 'Ana commented on your pull request'],
  ['📦', 'Package published: v0.2.0'],
  ['⚠️', 'Disk usage above 80% on staging'],
  ['🎉', 'You reached 1,000 downloads'],
  ['🔁', 'Nightly sync finished'],
  ['👀', 'Theo requested your review'],
] as const;

interface Note {
  id: number;
  icon: string;
  text: string;
  time: string;
}

const note = (i: number, time: string): Note => {
  const [icon, text] = pick(events, i);
  return { id: id(), icon, text, time };
};

export const notifications: ContentKind<Note[]> = {
  initial: () => Array.from({ length: 12 }, (_, i) => note(i, `${i + 1}h ago`)),
  refresh: (list) => [note(list.length, 'now'), ...list],
  View: ({ state }) => (
    <ul>
      {state.map((n) => (
        <li
          key={n.id}
          class="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-line px-4 py-3.5 text-sm text-fg"
        >
          <span class="text-lg">{n.icon}</span>
          <span>{n.text}</span>
          <small class="text-xs text-muted">{n.time}</small>
        </li>
      ))}
    </ul>
  ),
};

// ───────────────────────────── stocks ─────────────────────────────

interface Ticker {
  symbol: string;
  price: number;
  change: number;
}

const stocksState = (prev?: Ticker[]): Ticker[] =>
  (prev ?? ['ACME', 'GLBX', 'INIT', 'UMBR', 'WAYN'].map((symbol) => ({ symbol, price: rand(20, 400), change: 0 }))).map(
    (t) => {
      const change = rand(-3, 3);
      return { symbol: t.symbol, price: t.price * (1 + change / 100), change };
    },
  );

export const stocks: ContentKind<{ updated: string; tickers: Ticker[] }> = {
  initial: () => ({ updated: clock(), tickers: stocksState() }),
  refresh: (s) => ({ updated: clock(), tickers: stocksState(s.tickers) }),
  View: ({ state }) => (
    <div>
      <small class="block px-3.5 pt-3 pb-1.5">Watchlist · {state.updated}</small>
      <ul>
        {state.tickers.map((t) => (
          <li
            key={t.symbol}
            class="grid grid-cols-[1fr_auto_auto] gap-2 px-3.5 py-[7px] text-[13px] text-fg tabular-nums"
          >
            <strong>{t.symbol}</strong>
            <span>{t.price.toFixed(2)}</span>
            <span class={`w-[52px] text-right ${t.change >= 0 ? 'text-success' : 'text-danger'}`}>
              {t.change >= 0 ? '+' : ''}
              {t.change.toFixed(2)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  ),
};

// ───────────────────────────── blog ─────────────────────────────

const posts = [
  ['Designing for the thumb', 'Why the bottom of the screen is prime real estate, and how to use it well.', 'Design'],
  ['A slower web is a kinder web', 'Notes on building pages that respect battery, data plans and attention.', 'Essay'],
  ['Gestures people already know', 'Pull, swipe, flick: borrowing muscle memory instead of inventing new moves.', 'UX'],
  ['Shipping without a framework', 'What we learned rewriting a widget in plain DOM APIs.', 'Engineering'],
  ['The case for boring defaults', 'Great defaults make most settings unnecessary.', 'Design'],
  ['Motion that explains itself', 'Animations should answer “where did that come from?” and nothing more.', 'UX'],
  ['Writing docs people finish', 'Short pages, real examples and one idea per section.', 'Writing'],
  ['Testing on real phones', 'Emulators lie a little. Here is our cheap device lab.', 'Engineering'],
] as const;
const authors = ['Mira Lenz', 'Jonas Berg', 'Priya Nair', 'Ana Costa'];
export const blogTopics = ['All', 'Design', 'UX', 'Engineering', 'Essay', 'Writing'];

interface Post {
  id: number;
  title: string;
  excerpt: string;
  topic: string;
  author: string;
  minutes: number;
  hue: number;
  fresh: boolean;
}

const post = (i: number, fresh = false): Post => {
  const [title, excerpt, topic] = pick(posts, i);
  return {
    id: id(),
    title,
    excerpt,
    topic,
    author: pick(authors, i),
    minutes: 3 + ((i * 7) % 9),
    hue: (i * 47 + 200) % 360,
    fresh,
  };
};

const cover = (hue: number) => ({
  background: `linear-gradient(135deg, hsl(${hue} 75% 65%), hsl(${(hue + 50) % 360} 70% 45%))`,
});

/** Blog title and topic chips; rendered above the pulled posts (sticky). */
export function BlogHeader() {
  return (
    <>
      <div class="grid gap-0.5">
        <strong class="font-serif text-2xl tracking-[-0.01em]">The Field Notes</strong>
        <small>Essays on building for small screens</small>
      </div>
      <nav class="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]" aria-label="Topics">
        {blogTopics.map((t, i) => (
          <span
            key={t}
            class="flex-none rounded-full border border-line-strong px-3 py-[5px] text-[13px] text-muted corner-round data-active:border-fg data-active:bg-fg data-active:text-canvas"
            data-active={i === 0 || undefined}
          >
            {t}
          </span>
        ))}
      </nav>
    </>
  );
}

/** Blog posts: a featured post on top, older posts below. Refreshing publishes a new featured post. */
export const blog: ContentKind<{ next: number; posts: Post[] }> = {
  class: 'bg-canvas',
  initial: () => ({ next: 6, posts: Array.from({ length: 6 }, (_, i) => post(i)) }),
  refresh: (s) => ({ next: s.next + 1, posts: [post(s.next, true), ...s.posts.map((p) => ({ ...p, fresh: false }))] }),
  View: ({ state }) => {
    const [featured, ...rest] = state.posts;
    return (
      <div class="grid gap-3.5 px-4 pt-4 pb-6 text-fg">
        <article class="group grid gap-1.5" data-fresh={featured.fresh || undefined}>
          <div
            class="relative mb-1 aspect-video rounded-3xl group-data-fresh:animate-pop motion-reduce:animate-none!"
            style={cover(featured.hue)}
          >
            {featured.fresh && (
              <span class="absolute top-2.5 left-2.5 rounded-full bg-white px-[9px] py-[3px] text-[11px] font-semibold text-[#111] corner-round">
                New
              </span>
            )}
          </div>
          <small>
            {featured.topic} · {featured.minutes} min read
          </small>
          <h3 class="m-0 font-serif text-[22px] leading-[1.2] font-bold">{featured.title}</h3>
          <p class="m-0 text-sm leading-normal text-muted">{featured.excerpt}</p>
          <small>by {featured.author}</small>
        </article>
        {rest.map((p) => (
          <article key={p.id} class="grid grid-cols-[72px_1fr] items-center gap-3 border-t border-line pt-3.5">
            <div class="aspect-square rounded-xl" style={cover(p.hue)} />
            <div>
              <small>
                {p.topic} · {p.minutes} min
              </small>
              <h4 class="my-0.5 text-[15px] leading-[1.3] font-bold">{p.title}</h4>
              <small>{p.author}</small>
            </div>
          </article>
        ))}
      </div>
    );
  },
};
