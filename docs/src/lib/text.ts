export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** A `<style>` element for authored CSS. Throws (failing the build) if the CSS could close the tag early. */
export const styleTag = (css: string): string => {
  if (/<\/style/i.test(css)) throw new Error('CSS sample must not contain "</style"');
  return `<style>${css}</style>`;
};

/** Escapes plain text and turns `backticked` parts into <code>. Safe to render as HTML. */
export const inlineCode = (text: string): string =>
  escapeHtml(text).replace(/`([^`]+)`/g, (_, code: string) => `<code>${code}</code>`);
