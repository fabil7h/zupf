// Demo data for the pull-to-refresh docs: each kind of content has an initial state and a refresh that changes it.
// Initial states are deterministic, so the prerendered HTML matches what the island hydrates with.

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pick = <T>(list: readonly T[], i: number) => list[i % list.length];

let uid = 0;
const id = () => ++uid;

// ───────────────────────────── inbox ─────────────────────────────

const senders = ['Mira', 'Jonas', 'Priya', 'Leo', 'Ana'];
const subjects = ['Quarterly planning notes', 'Re: Design review', 'Your order has shipped', 'Lunch tomorrow?'];
const previews = [
  'I went through the draft and left a few comments…',
  'Can we move it to 3pm so everyone can join?',
  'Track your package anytime from your account page.',
];

export interface Mail {
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
  subject: pick(subjects, i),
  preview: pick(previews, i),
  time,
  unread,
});

export const inboxData = {
  initial: (): Mail[] => Array.from({ length: 12 }, (_, i) => mail(i, `${i + 1}h`)),
  refresh: (list: Mail[]): Mail[] => [mail(list.length, 'now', true), ...list],
};

// ───────────────────────────── notifications ─────────────────────────────

const events = [
  ['✅', 'Build #482 passed'],
  ['💬', 'Ana commented on your pull request'],
  ['📦', 'Package published: v0.2.0'],
  ['👀', 'Theo requested your review'],
] as const;

export interface Note {
  id: number;
  icon: string;
  text: string;
  time: string;
}

const note = (i: number, time: string): Note => {
  const [icon, text] = pick(events, i);
  return { id: id(), icon, text, time };
};

export const notificationsData = {
  initial: (): Note[] => Array.from({ length: 12 }, (_, i) => note(i, `${i + 1}h ago`)),
  refresh: (list: Note[]): Note[] => [note(list.length, 'now'), ...list],
};

// ───────────────────────────── blog ─────────────────────────────

const posts = [
  ['Designing for the thumb', 'Why the bottom of the screen is prime real estate.', 'Design'],
  ['Gestures people already know', 'Borrowing muscle memory instead of inventing new moves.', 'UX'],
  ['Shipping without a framework', 'What we learned rewriting a widget in plain DOM APIs.', 'Engineering'],
  ['Writing docs people finish', 'Short pages, real examples and one idea per section.', 'Writing'],
] as const;
const authors = ['Mira Lenz', 'Jonas Berg', 'Priya Nair'];
export const blogTopics = ['All', 'Design', 'UX', 'Engineering', 'Writing'];

export interface Post {
  id: number;
  title: string;
  excerpt: string;
  topic: string;
  author: string;
  minutes: number;
  hue: number;
  fresh: boolean;
}
export type Blog = { next: number; posts: Post[] };

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

/** Blog posts: a featured post on top, older posts below. Refreshing publishes a new featured post. */
export const blogData = {
  initial: (): Blog => ({ next: 4, posts: Array.from({ length: 4 }, (_, i) => post(i)) }),
  refresh: (s: Blog): Blog => ({
    next: s.next + 1,
    posts: [post(s.next, true), ...s.posts.map((p) => ({ ...p, fresh: false }))],
  }),
};
