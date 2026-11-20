// Tiny dependency-free syntax highlighter for the docs (js/ts, html, css, sh).
export type Lang = 'js' | 'html' | 'css' | 'sh';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const rules: Record<Lang, [RegExp, string][]> = {
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
    if (part.startsWith('<!--')) return `<span class="t-c">${esc(part)}</span>`;
    if (!part.startsWith('<')) return esc(part);
    const [, open, name, attrs, close] = part.match(/^(<\/?)([\w-]+)([^>]*?)(\/?>)$/)!;
    const a = esc(attrs).replace(
      /([\w:@-]+)(=)?("[^"]*")?/g,
      (_, n, eq, v) => `<span class="t-p">${n}</span>${eq ?? ''}${v ? `<span class="t-s">${v}</span>` : ''}`,
    );
    return `<span class="t-k">${esc(open + name)}</span>${a}<span class="t-k">${esc(close)}</span>`;
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
        out += esc(plain) + `<span class="t-${cls}">${esc(m[0])}</span>`;
        plain = '';
        i += m[0].length;
        continue outer;
      }
    }
    plain += code[i++];
  }
  return out + esc(plain);
}
