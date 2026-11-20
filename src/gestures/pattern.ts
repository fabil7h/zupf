/**
 * Gesture patterns: a sequence of presses ("steps"), each a list of tokens observed during that press.
 *
 * Syntax: steps are separated by spaces (or given as an array), tokens within one press by `+`.
 * - `tap`: pressed and released without holding or moving
 * - `hold`: held still for `holdTime`
 * - `swipe-up` | `swipe-down` | `swipe-left` | `swipe-right`: moved `swipeDistance` in that direction;
 *   a change of direction within one press adds another token (`swipe-up+swipe-left`)
 * - `swipe`: any swipe direction
 *
 * Examples: `'tap tap'`, `'hold+swipe-up'`, `['tap', 'tap', 'hold+swipe']`.
 * Aliases: `double-tap`, `triple-tap`, `long-press`.
 */

export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

/** A token as observed: what one press did, in order. */
export type Token = 'tap' | 'hold' | `swipe-${SwipeDirection}`;
/** A token in a pattern: an observed token, or `swipe` for any direction. */
export type PatternToken = Token | 'swipe';
export type Step = readonly string[];
export type Pattern = readonly Step[];

/** Anything `Gestures.on` accepts: `'tap tap'`, `'double-tap'`, `['tap', 'hold+swipe-up']`. */
export type GesturePattern = string | readonly string[];

const ALIASES = new Map<string, string>([
  ['double-tap', 'tap tap'],
  ['triple-tap', 'tap tap tap'],
  ['long-press', 'hold'],
]);

const TOKENS = new Set<string>(['tap', 'hold', 'swipe', 'swipe-up', 'swipe-down', 'swipe-left', 'swipe-right']);

export function parsePattern(input: GesturePattern): Pattern {
  const words = (typeof input === 'string' ? [input] : input)
    .flatMap((part) => part.trim().split(/\s+/))
    .filter(Boolean)
    .flatMap((word) => (ALIASES.get(word) ?? word).split(' '));
  if (!words.length) throw new Error('[zupf] empty gesture pattern');
  return words.map((word) => {
    const step = word.split('+');
    for (const token of step) {
      if (!TOKENS.has(token)) throw new Error(`[zupf] unknown gesture token "${token}" in "${String(input)}"`);
    }
    if (step.includes('tap') && step.length > 1) throw new Error(`[zupf] "tap" can't be combined: "${word}"`);
    // Impossible combinations would silently never fire.
    if (step.indexOf('hold') > 0 || step.lastIndexOf('hold') > 0) {
      throw new Error(`[zupf] "hold" must come first in a press, and only once: "${word}"`);
    }
    for (let i = 1; i < step.length; i++) {
      if (step[i] !== 'swipe' && step[i] === step[i - 1]) {
        throw new Error(`[zupf] "${step[i]}" twice in a row is the same direction, so it is one swipe: "${word}"`);
      }
    }
    return step;
  });
}

export const formatPattern = (pattern: Pattern): string => pattern.map((step) => step.join('+')).join(' ');

const tokenMatches = (p: string, t: string) => p === t || (p === 'swipe' && t.startsWith('swipe-'));

function stepStartsWith(step: Step, tokens: Step) {
  return tokens.length <= step.length && tokens.every((t, i) => tokenMatches(step[i], t));
}

const stepEquals = (step: Step, tokens: Step) => step.length === tokens.length && stepStartsWith(step, tokens);

/**
 * How far `pattern` matches the input so far: finished presses `done`, plus the press in progress (`current`, or
 * `null` between presses).
 * - `none`: can't match anymore
 * - `partial`: could match with more input
 * - `complete`: matches as is (it may also be a prefix of the input to come, e.g. `tap` vs. `tap tap`)
 */
export function matchPattern(
  pattern: Pattern,
  done: readonly Step[],
  current: Step | null,
): 'none' | 'partial' | 'complete' {
  const n = done.length;
  if (n > pattern.length || !done.every((tokens, i) => stepEquals(pattern[i], tokens))) return 'none';
  if (current === null) return n === pattern.length ? 'complete' : 'partial';
  if (n === pattern.length || !stepStartsWith(pattern[n], current)) return 'none';
  return n === pattern.length - 1 && stepEquals(pattern[n], current) ? 'complete' : 'partial';
}

/** Which axes a pattern swipes along at the start of a press (so the page must not scroll there). */
export function swipeAxes(pattern: Pattern): { x: boolean; y: boolean } {
  const axes = { x: false, y: false };
  for (const step of pattern) {
    // Swipes after a hold are handled by cancelling touchmove once holding; scrolling stays native otherwise.
    const token = step[0];
    if (token === 'swipe') axes.x = axes.y = true;
    else if (token === 'swipe-up' || token === 'swipe-down') axes.y = true;
    else if (token === 'swipe-left' || token === 'swipe-right') axes.x = true;
  }
  return axes;
}
