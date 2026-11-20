import { useLocation } from 'preact-iso';

export interface DocRoute {
  slug: string;
  anchor?: string;
}

/** The current docs page (`''` on the landing page) and `#anchor`, from preact-iso's location. */
export function useDocRoute(): DocRoute {
  const { path, url } = useLocation();
  const slug = path.split('/').find(Boolean) ?? '';
  return { slug, anchor: url.split('#')[1] };
}

/** Real paths with a trailing slash (`/drawer/#snap-seq`), so each page is a prerendered `drawer/index.html`. */
export const href = (slug: string, anchor?: string): string =>
  `/${slug ? `${slug}/` : ''}${anchor ? `#${anchor}` : ''}`;
