// Marks everything outside `keep` as `inert` (non-interactive + hidden from assistive tech).
// Ref-counted per element so stacked/nested sheets restore correctly.
import type { Cleanup } from './helpers';

const counts = new WeakMap<Element, number>();
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'LINK', 'META', 'NOSCRIPT']);

const setInert = (el: Element, value: boolean): void => {
  if (el instanceof HTMLElement) el.inert = value;
};
const isInert = (el: Element): boolean => el instanceof HTMLElement && el.inert;

export function inertOthers(keep: Element[]): Cleanup {
  // A sheet opened on top of another one may itself have been made inert by the sheet below
  // (e.g. a nested sheet portaled next to its parent). Lift that while this sheet is open.
  const lifted: Element[] = [];
  for (const target of keep) {
    for (let node: Element | null = target; node && node !== document.body; node = node.parentElement) {
      if ((counts.get(node) ?? 0) > 0 && isInert(node)) {
        setInert(node, false);
        lifted.push(node);
      }
    }
  }

  const touched: Element[] = [];
  const visited = new Set<Element>();
  for (const target of keep) {
    let node: Element | null = target;
    while (node && node !== document.body && node.parentElement) {
      const parent: Element = node.parentElement;
      if (!visited.has(parent)) {
        visited.add(parent);
        for (const sibling of Array.from(parent.children)) {
          if (keep.some((k) => sibling.contains(k))) continue;
          if (SKIP.has(sibling.tagName) || sibling.hasAttribute('aria-live')) continue;
          const c = counts.get(sibling) ?? 0;
          // Respect elements that were already inert before we touched them.
          if (c === 0 && isInert(sibling)) continue;
          counts.set(sibling, c + 1);
          setInert(sibling, true);
          touched.push(sibling);
        }
      }
      node = parent;
    }
  }

  return () => {
    for (const el of touched) {
      const c = (counts.get(el) ?? 1) - 1;
      counts.set(el, c);
      if (c <= 0) {
        counts.delete(el);
        setInert(el, false);
      }
    }
    // Hand lifted elements back to the sheets below, if they are still open.
    for (const el of lifted) if ((counts.get(el) ?? 0) > 0) setInert(el, true);
  };
}
