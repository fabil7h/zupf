import { untrack } from 'svelte';
import { createGestures, type GestureEvent, type Gestures, type GesturesOptions, type GesturesState } from '@lzth/zupf';

/**
 * Creates the instance on mount and destroys it on teardown. Options are applied once; demos recreate the
 * instance via `{#key}`. Call during component init.
 */
export function useGestures(target: () => HTMLElement | undefined, options: Omit<GesturesOptions, 'target'>) {
  let gestures = $state.raw<Gestures | null>(null);
  let state = $state.raw<GesturesState>({ pressed: false, steps: [] });
  $effect(() => {
    const element = target();
    if (!element) return undefined;
    const instance = untrack(() => createGestures({ ...options, target: element }));
    const unsubscribe = instance.subscribe((s) => (state = s));
    gestures = instance;
    return () => {
      unsubscribe();
      instance.destroy();
      gestures = null;
    };
  });
  return {
    get gestures() {
      return gestures;
    },
    get state() {
      return state;
    },
  };
}

export const formatSteps = (steps: readonly (readonly string[])[]) => steps.map((s) => s.join('+')).join('  ');

/** The last fired gesture (`n` changes on every fire, to replay its pop animation) and a log of recent ones. */
export function useLastGesture(format: (e: GestureEvent) => string = (e) => e.gesture) {
  let last = $state.raw<{ label: string; n: number } | null>(null);
  let log = $state.raw<string[]>([]);
  return {
    get last() {
      return last;
    },
    get log() {
      return log;
    },
    fire: (e: GestureEvent) => {
      const label = format(e);
      last = { label, n: (last?.n ?? 0) + 1 };
      log = [`${label}   ← ${formatSteps(e.steps)}`, ...log].slice(0, 6);
    },
  };
}
