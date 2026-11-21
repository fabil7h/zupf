import prerender, { locationStub } from 'preact-iso/prerender';
import { App, titleFor } from './app';
import { pages } from './pages';

export { routeModules } from './pages';

/** Every route to prerender. */
export const routes = ['/', ...pages.map((p) => `/${p.slug}/`)];

/** Render `route` (e.g. `/drawer/`) to an HTML string for `#app`, plus its `<title>`. */
export async function render(route: string): Promise<{ html: string; title: string }> {
  locationStub(route);
  const { html } = await prerender(<App />);
  return { html, title: titleFor(route.split('/').find(Boolean) ?? '') };
}
