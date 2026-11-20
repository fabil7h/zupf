import type { Direction } from './types';

export type Cleanup = () => void;
export const noop: Cleanup = () => {};

export const isVertical = (direction: Direction): boolean => direction === 'top' || direction === 'bottom';

/** `1` for sheets anchored at bottom/right (positive translate closes), `-1` for top/left. */
export const directionSign = (direction: Direction): 1 | -1 =>
  direction === 'bottom' || direction === 'right' ? 1 : -1;

export function translate(direction: Direction, value: number | string): string {
  const v = typeof value === 'number' ? `${value}px` : value;
  return isVertical(direction) ? `translate3d(0, ${v}, 0)` : `translate3d(${v}, 0, 0)`;
}

/** Transform that places the sheet fully off-screen. */
export function closedTransform(direction: Direction): string {
  return translate(direction, directionSign(direction) === 1 ? '100%' : '-100%');
}

/** Set inline styles. Keys starting with `--` are set as custom properties. */
export function css(el: HTMLElement | null | undefined, styles: Record<string, string>): void {
  if (!el) return;
  for (const [key, value] of Object.entries(styles)) {
    if (key.startsWith('--') || key.includes('-')) el.style.setProperty(key, value);
    else (el.style as any)[key] = value;
  }
}

/** Current translate along the sheet's axis in px, read from the computed transform matrix. */
export function getTranslate(el: HTMLElement, direction: Direction): number | null {
  const transform = window.getComputedStyle(el).transform;
  if (!transform || transform === 'none') return 0;
  let mat = transform.match(/^matrix3d\((.+)\)$/);
  if (mat) return parseFloat(mat[1].split(', ')[isVertical(direction) ? 13 : 12]);
  mat = transform.match(/^matrix\((.+)\)$/);
  return mat ? parseFloat(mat[1].split(', ')[isVertical(direction) ? 5 : 4]) : null;
}

/** Rubber-band resistance used when dragging past the fully-open position. */
export function dampen(v: number): number {
  return 8 * (Math.log(v + 1) - 2);
}

export function chain(...fns: Array<Cleanup | undefined | null | false>): Cleanup {
  return () => {
    for (const fn of fns) if (typeof fn === 'function') fn();
  };
}

export function on<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  fn: (e: WindowEventMap[K]) => void,
  opts?: boolean | AddEventListenerOptions,
): Cleanup;
export function on<K extends keyof DocumentEventMap>(
  target: Document,
  type: K,
  fn: (e: DocumentEventMap[K]) => void,
  opts?: boolean | AddEventListenerOptions,
): Cleanup;
export function on<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  type: K,
  fn: (e: HTMLElementEventMap[K]) => void,
  opts?: boolean | AddEventListenerOptions,
): Cleanup;
export function on(
  target: EventTarget,
  type: string,
  fn: (e: any) => void,
  opts?: boolean | AddEventListenerOptions,
): Cleanup;
export function on(target: EventTarget, type: string, fn: (e: any) => void, opts?: boolean | AddEventListenerOptions) {
  target.addEventListener(type, fn, opts);
  return () => target.removeEventListener(type, fn, opts);
}

const nonTextInputTypes = new Set([
  'checkbox',
  'radio',
  'range',
  'color',
  'file',
  'image',
  'button',
  'submit',
  'reset',
]);

/** Whether focusing the element opens a software keyboard. */
export function isInput(target: Element | null): target is HTMLElement {
  return (
    (target instanceof HTMLInputElement && !nonTextInputTypes.has(target.type)) ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

let idCounter = 0;
export const uid = (prefix: string): string => `${prefix}-${++idCounter}`;

export function resolveElement<T extends Element = HTMLElement>(
  value: T | string | null | undefined,
  root: ParentNode = document,
): T | null {
  if (!value) return null;
  return typeof value === 'string' ? root.querySelector<T>(value) : value;
}

export function isScrollable(node: Element): boolean {
  const style = window.getComputedStyle(node);
  return /(auto|scroll)/.test(style.overflow + style.overflowX + style.overflowY);
}

/** Nearest scrollable ancestor of `node` (or `node` itself with `includeSelf`); the document scroller if none. */
export function getScrollParent(node: Element, includeSelf = false): Element {
  let current: Element | null = includeSelf ? node : node.parentElement;
  while (current && !isScrollable(current)) current = current.parentElement;
  return current || document.scrollingElement || document.documentElement;
}

export function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
