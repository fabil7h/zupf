// Every page, from the sidebar list in lib/nav.ts.
import type { APIRoute } from 'astro';
import { href, pages } from '../lib/nav';

export const GET: APIRoute = ({ site }) => {
  const urls = ['', ...pages.map((p) => p.slug)].map((slug) => new URL(href(slug), site).href);
  const body = urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
};
