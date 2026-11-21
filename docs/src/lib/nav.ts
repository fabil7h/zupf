import { examplePages } from './examples';

export interface TocEntry {
  id: string;
  title: string;
}

export interface DocPage {
  slug: string;
  title: string;
  /** "On this page" entries. */
  toc: TocEntry[];
}

export const tagline = 'Drawer, pull-to-refresh and gestures for any framework. Optimized for mobile use.';

/** Sidebar order; also drives the previous / next pager. */
export const pages: DocPage[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started',
    toc: [],
  },
  {
    slug: 'drawer',
    title: 'Drawer',
    toc: examplePages.flatMap((section) => section.examples ?? []).map(({ id, title }) => ({ id, title })),
  },
  {
    slug: 'pull-to-refresh',
    title: 'Pull to Refresh',
    toc: [
      { id: 'basic', title: 'Basic' },
      { id: 'blog', title: 'Indicator styles' },
      { id: 'drawer', title: 'In a drawer' },
      { id: 'nested', title: 'Nested content' },
      { id: 'tuning', title: 'Threshold and feel' },
      { id: 'api', title: 'Controlling it' },
      { id: 'options', title: 'Options' },
    ],
  },
  {
    slug: 'gestures',
    title: 'Gestures',
    toc: [
      { id: 'taps', title: 'Taps and long press' },
      { id: 'list', title: 'Swipe actions in a list' },
      { id: 'custom', title: 'Custom flows' },
      { id: 'swipes', title: 'Swipes' },
      { id: 'patterns', title: 'Patterns' },
      { id: 'options', title: 'Options' },
    ],
  },
];

export const pageBySlug = (slug: string): DocPage => {
  const page = pages.find((p) => p.slug === slug);
  if (!page) throw new Error(`Unknown docs page: ${slug}`);
  return page;
};

/** Real paths with a trailing slash (`/drawer/#snap`), so each page is a prerendered `drawer/index.html`. */
export const href = (slug: string, anchor?: string): string =>
  `/${slug ? `${slug}/` : ''}${anchor ? `#${anchor}` : ''}`;
