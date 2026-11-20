// Tiny dependency-free syntax highlighter for the docs (js/ts, html, css, sh).
export type Lang = 'js' | 'html' | 'css' | 'sh';

/** Token type → classes. */
const tokenClass = {
  k: 'text-syntax-keyword',
  s: 'text-syntax-string',
  n: 'text-syntax-number',
  c: 'text-subtle italic',
  f: 'text-syntax-function',
  p: 'text-syntax-property',
} as const;
type Token = keyof typeof tokenClass;

const span = (token: Token, html: string) => `<span class="${tokenClass[token]}">${html}</span>`;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const rules: Record<Lang, [RegExp, Token][]> = {
  js: [
    [/\/\/[^\n]*/y, 'c'],
    [/'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"/y, 's'],
    [/\b(?:import|from|export|const|let|new|return|function|if|else|await|async|of|for)\b/y, 'k'],
    [/\b(?:true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b/y, 'n'],
    [/[A-Za-z_$][\w$]*(?=\s*\()/y, 'f'],
    [/[A-Za-z_$][\w$]*(?=\s*:)/y, 'p'],
  ],
  html: [], // handled by highlightHtml
  css: [
    [/\/\*[\s\S]*?\*\//y, 'c'],
    [/--[\w-]+/y, 'p'],
    [/[\w-]+(?=\s*:)/y, 'p'],
    [/#[\da-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|%|rem|em|ms|s)?\b/y, 'n'],
    [/[:.][\w-]+|\[[^\]]+\]/y, 'k'],
  ],
  sh: [
    [/#[^\n]*/y, 'c'],
    [/^(?:npm|pnpm|yarn|bun)\b/my, 'k'],
  ],
};

function highlightHtml(code: string): string {
  return code.replace(/<!--[\s\S]*?-->|<\/?[\w-]+[^>]*>|[^<]+/g, (part) => {
    if (part.startsWith('<!--')) return span('c', esc(part));
    if (!part.startsWith('<')) return esc(part);
    const [, open, name, attrs, close] = part.match(/^(<\/?)([\w-]+)([^>]*?)(\/?>)$/)!;
    const a = esc(attrs).replace(
      /([\w:@-]+)(=)?("[^"]*")?/g,
      (_, n, eq, v) => `${span('p', n)}${eq ?? ''}${v ? span('s', v) : ''}`,
    );
    return `${span('k', esc(open + name))}${a}${span('k', esc(close))}`;
  });
}

export function highlight(code: string, lang: Lang): string {
  if (lang === 'html') return highlightHtml(code);
  let out = '';
  let plain = '';
  let i = 0;
  outer: while (i < code.length) {
    for (const [re, cls] of rules[lang]) {
      re.lastIndex = i;
      const m = re.exec(code);
      if (m && m[0].length) {
        out += esc(plain) + span(cls, esc(m[0]));
        plain = '';
        i += m[0].length;
        continue outer;
      }
    }
    plain += code[i++];
  }
  return out + esc(plain);
}
