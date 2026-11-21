import { cdp } from 'vite-plus/test/browser';

/** Chrome `Performance.getMetrics` counters we track. Counts are deterministic; durations are seconds. */
export interface Metrics {
  LayoutCount: number;
  RecalcStyleCount: number;
  ScriptDuration: number;
  LayoutDuration: number;
  RecalcStyleDuration: number;
}

const KEYS = ['LayoutCount', 'RecalcStyleCount', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration'] as const;

let enabled = false;

async function snapshot(): Promise<Metrics> {
  const session = cdp();
  if (!enabled) {
    await session.send('Performance.enable', { timeDomain: 'threadTicks' });
    enabled = true;
  }
  const { metrics } = await session.send('Performance.getMetrics');
  const byName = new Map(metrics.map((m) => [m.name, m.value]));
  return Object.fromEntries(KEYS.map((k) => [k, byName.get(k) ?? 0])) as unknown as Metrics;
}

/** Flush pending style and layout, so the measured block starts from a clean tree. */
const flush = () => void document.documentElement.getBoundingClientRect();

/**
 * Runs `fn` synchronously and returns the main-thread work it caused.
 * No frame renders inside a synchronous block, so any layout / style recalc counted here was forced
 * by the code under test (or by the final `flush`, which adds at most one of each).
 */
export async function measure(fn: () => void): Promise<Metrics> {
  flush();
  const before = await snapshot();
  fn();
  flush();
  const after = await snapshot();
  return Object.fromEntries(KEYS.map((k) => [k, after[k] - before[k]])) as unknown as Metrics;
}

export interface PointerPath {
  target: Element;
  x: number;
  y: number;
  dx: number;
  dy: number;
  steps: number;
  pointerType?: 'touch' | 'pen' | 'mouse';
}

/** Synthetic pointer stream: down, `steps` moves, up. Returns a function so it can be passed to `measure`. */
export const pointerDrag =
  ({ target, x, y, dx, dy, steps, pointerType = 'pen' }: PointerPath) =>
  () => {
    const init = { bubbles: true, cancelable: true, composed: true, pointerId: 7, isPrimary: true, pointerType };
    const fire = (type: string, cx: number, cy: number) =>
      target.dispatchEvent(new PointerEvent(type, { ...init, clientX: cx, clientY: cy, button: 0, buttons: 1 }));
    fire('pointerdown', x, y);
    for (let i = 1; i <= steps; i++) fire('pointermove', x + (dx * i) / steps, y + (dy * i) / steps);
    fire('pointerup', x + dx, y + dy);
  };

export const fmt = (m: Metrics): string =>
  `layouts=${m.LayoutCount} styleRecalcs=${m.RecalcStyleCount} script=${(m.ScriptDuration * 1000).toFixed(2)}ms`;
