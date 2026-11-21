// Turns an example definition into the vanilla JS / HTML / CSS shown in the docs,
// so the displayed code is always exactly what the live preview runs.
import { Raw, type Example } from './examples';

function serialize(value: unknown, indent = '  '): string {
  if (value instanceof Raw) return value.code;
  if (typeof value === 'string') return `'${value.replace(/[\\']/g, '\\$&').replace(/\n/g, '\\n')}'`;
  if (Array.isArray(value)) return `[${value.map((v) => serialize(v, indent)).join(', ')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([k, v]) => `${indent}  ${k}: ${serialize(v, indent + '  ')},`);
    return `{\n${entries.join('\n')}\n${indent}}`;
  }
  return String(value);
}

const optionLines = (options: Record<string, unknown> | undefined): string[] =>
  Object.entries(options ?? {}).map(([k, v]) => `  ${k}: ${serialize(v)},`);

function sheetHtml(id: string, overlay: string, e: Example): string {
  // Top sheets have their handle on the bottom edge.
  const handleLast = e.options?.direction === 'top';
  return [
    `<div id="${overlay}"></div>`,
    `<div id="${id}" hidden>`,
    ...(e.noHandle || handleLast ? [] : ['  <div data-zupf-handle></div>']),
    ...e.markup.split('\n').map((l) => '  ' + l),
    ...(!e.noHandle && handleLast ? ['  <div data-zupf-handle></div>'] : []),
    `</div>`,
  ].join('\n');
}

export function exampleCode(ex: Example): { js: string; html: string; css?: string } {
  const trigger = ex.noTrigger ? '' : '<button id="open">Open Drawer</button>';
  const head = ex.options?.scaleBackground
    ? `<div data-zupf-wrapper>\n  <!-- your app -->\n  ${trigger}\n</div>\n`
    : trigger && `${trigger}\n`;
  const children = (ex.children ?? []).map((c) => '\n' + sheetHtml('nested-sheet', 'nested-overlay', c));
  const html = [head, sheetHtml('sheet', 'overlay', ex), ...children].filter(Boolean).join('\n');

  const nested = (ex.children ?? []).flatMap((c) =>
    ['', `const nested = createSheet({`, `  content: '#nested-sheet',`, `  overlay: '#nested-overlay',`]
      .concat(optionLines(c.options))
      .concat([`  parent: sheet,`, `});`]),
  );
  const js = [
    `import { createSheet } from 'zupf';`,
    `import 'zupf/style.css';`,
    '',
    `const sheet = createSheet({`,
    `  content: '#sheet',`,
    `  overlay: '#overlay',`,
    ...(ex.noTrigger ? [] : [`  trigger: '#open',`]),
    ...optionLines(ex.options),
    `});`,
    ...nested,
    ...(ex.extraCode ? ['', ex.extraCode] : []),
  ].join('\n');

  return { js, html, css: ex.css };
}

/** Runtime options: unwrap `raw()` values. */
export function resolveOptions(options: Record<string, unknown> = {}): Record<string, unknown> {
  return Object.fromEntries(Object.entries(options).map(([k, v]) => [k, v instanceof Raw ? v.value : v]));
}
