import { signal } from '@preact/signals';

export interface Route {
  slug: string;
  anchor?: string;
}

function parse(): Route {
  const [, slug = 'getting-started', anchor] = location.hash.match(/^#\/([\w-]+)(?:#([\w-]+))?/) ?? [];
  return { slug, anchor };
}

/** Hash route, e.g. `#/snap-points#snap-seq`. */
export const route = signal<Route>(parse());

window.addEventListener('hashchange', () => {
  const next = parse();
  if (next.slug !== route.value.slug || next.anchor !== route.value.anchor) route.value = next;
});

export const href = (slug: string, anchor?: string): string => `#/${slug}${anchor ? `#${anchor}` : ''}`;
