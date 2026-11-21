// Shiki with only the grammars the docs use and the JavaScript regex engine (no WASM), so it runs synchronously.
// Only prerendering uses it; browsers never load it (see highlight.ts).
import { createCssVariablesTheme, createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import css from 'shiki/langs/css.mjs';
import html from 'shiki/langs/html.mjs';
import javascript from 'shiki/langs/javascript.mjs';
import shellscript from 'shiki/langs/shellscript.mjs';
import type { Lang } from './highlight';
import { escapeHtml } from './text';

// Tokens come out as `var(--shiki-token-*)` colors, which map to the site's own syntax classes (docs.css).
const theme = createCssVariablesTheme({ name: 'zupf' });
const shiki = createHighlighterCoreSync({
  engine: createJavaScriptRegexEngine(),
  langs: [javascript, html, css, shellscript],
  themes: [theme],
});

const grammar: Record<Lang, string> = { js: 'javascript', html: 'html', css: 'css', sh: 'shellscript' };
const tokenPrefix = 'var(--shiki-token-';

/** Escaped HTML: one `<span class="tok-*">` per colored token, plain text for the rest. */
export function highlight(code: string, lang: Lang): string {
  const { tokens } = shiki.codeToTokens(code, { lang: grammar[lang], theme: 'zupf' });
  return tokens
    .map((line) =>
      line
        .map(({ content, color }) => {
          const text = escapeHtml(content);
          if (!color?.startsWith(tokenPrefix)) return text;
          return `<span class="tok-${color.slice(tokenPrefix.length, -1)}">${text}</span>`;
        })
        .join(''),
    )
    .join('\n');
}
