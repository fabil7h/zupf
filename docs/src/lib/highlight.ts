// Syntax highlighting happens only while prerendering, with Shiki (lib/shiki.ts). Browsers never load a highlighter:
// code blocks keep their prerendered HTML, so every sample a page can show is rendered up front (one CodeBlock per
// variant, toggled with `hidden`), and a CodeBlock's code never changes after hydration.
import { escapeHtml } from './text';

export type Lang = 'js' | 'html' | 'css' | 'sh';

// Statically false in client builds, so Shiki is not bundled for the browser.
const shiki = import.meta.env.SSR ? await import('./shiki') : undefined;

/**
 * Highlighted HTML on the server. In the browser, plain escaped text, which hydration discards for the server HTML.
 * Never empty there: Svelte's {@html} adopts the server nodes only for a non-empty value, and the browser may get no
 * code at all (drawer examples generate theirs while prerendering only).
 */
export const highlight = (code: string, lang: Lang): string =>
  shiki ? shiki.highlight(code, lang) : escapeHtml(code) || ' ';
