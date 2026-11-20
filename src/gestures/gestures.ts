import { chain, noop, on, resolveElement, stripUndefined, type Cleanup } from '../core';
import {
  formatPattern,
  matchPattern,
  parsePattern,
  swipeAxes,
  type GesturePattern,
  type Pattern,
  type Step,
  type SwipeDirection,
  type Token,
} from './pattern';

export interface GestureEvent {
  /** The matched pattern, normalized (`'double-tap'` → `'tap tap'`). */
  gesture: string;
  /** What was performed, one entry per press: `[['tap'], ['hold', 'swipe-up']]`. */
  steps: readonly Step[];
  /** Direction of the last swipe, if any. */
  direction: SwipeDirection | null;
  /** Element the last press started on. */
  target: Element;
  /** Last pointer event of the gesture. */
  event: PointerEvent;
}

export type GestureHandler = (e: GestureEvent) => void;

export interface GesturesState {
  /** A press is in progress. */
  pressed: boolean;
  /** Presses of the sequence so far (including the one in progress), for progress feedback. */
  steps: readonly Step[];
}

export interface GesturesBehavior {
  /** ms a press must be held still to count as `hold`. @default 500 */
  holdTime: number;
  /** Max ms between releasing and pressing again within a sequence (`tap tap`). @default 300 */
  interval: number;
  /** px a press must move in one direction to count as a swipe. @default 50 */
  swipeDistance: number;
  /** px a press may move and still be a `tap` / `hold`. @default 10 */
  slop: number;
  /** Recognize mouse presses (touch and pen always work). @default true */
  mouse: boolean;
  /** Ignore input. @default false */
  disabled: boolean;
}

export interface GesturesOptions extends Partial<GesturesBehavior> {
  /** Element that receives the presses. Element or selector. */
  target: HTMLElement | string;
  /** Initial bindings, keyed by pattern: `{ 'double-tap': fn, 'hold+swipe-up': fn }`. */
  gestures?: Record<string, GestureHandler>;
}

interface Binding {
  pattern: Pattern;
  gesture: string;
  handler: GestureHandler;
}

interface Pending {
  bindings: Binding[];
  event: GestureEvent;
}

const DEFAULTS: GesturesBehavior = {
  holdTime: 500,
  interval: 300,
  swipeDistance: 50,
  slop: 10,
  mouse: true,
  disabled: false,
};

const IDLE: GesturesState = { pressed: false, steps: [] };

/**
 * Recognizes taps, holds, swipes and sequences of them on one element, e.g. `tap tap`, `hold+swipe-up`
 * or a custom flow like `tap tap hold+swipe-left`. When patterns share a prefix (`tap` and `tap tap`), the
 * shorter one fires once the longer one can no longer match (after `interval`, or when the next press differs).
 */
export class Gestures {
  readonly el: HTMLElement;

  #o: GesturesBehavior;
  #bindings = new Set<Binding>();
  #state: GesturesState = IDLE;
  #listeners = new Set<(state: GesturesState) => void>();
  #cleanup: Cleanup = noop;
  /** Removes the `window` listeners that follow a press. */
  #untrack: Cleanup = noop;
  #destroyed = false;
  /** Inline styles zupf overrides, as they were before: value and priority (`important`). */
  #savedStyles: Record<string, [string, string]> = {};
  /** Some binding uses `hold`. Otherwise a long press isn't a token: pressing slowly before a swipe still swipes. */
  #usesHold = false;

  // Sequence
  #done: Token[][] = [];
  #pending: Pending | null = null;
  #intervalTimer: ReturnType<typeof setTimeout> | undefined;

  // Press in progress
  #current: Token[] | null = null;
  /** The press can't contribute anymore (gesture fired mid-press, or nothing matches): ignore it until release. */
  #dead = false;
  #pointerId = 0;
  #pointerType = '';
  #target: Element | null = null;
  #last: PointerEvent | null = null;
  #start = { x: 0, y: 0 };
  #anchor = { x: 0, y: 0 };
  #moved = false;
  #holdTimer: ReturnType<typeof setTimeout> | undefined;
  #suppressClick = false;
  /** A gesture fired mid-press with a mouse: swallow the click that follows the release. */
  #suppressAfterPress = false;

  constructor(options: GesturesOptions) {
    const { target, gestures, ...rest } = options;
    this.#o = { ...DEFAULTS, ...stripUndefined(rest) };
    if (typeof document === 'undefined') {
      // Server render: nothing to attach to. Behave like a destroyed instance.
      this.el = null as never;
      this.#destroyed = true;
      return;
    }
    const el = resolveElement(target);
    if (!el) throw new Error('[zupf] `target` element not found');
    // Validate everything before touching the element: a throw must not leave attributes or styles behind.
    const initial = Object.entries(gestures ?? {});
    for (const [pattern] of initial) parsePattern(pattern);
    this.el = el;
    el.setAttribute('data-zupf-gestures', '');
    for (const [pattern, handler] of initial) this.on(pattern, handler);

    this.#cleanup = chain(
      on(el, 'pointerdown', this.#onDown),
      on(el, 'touchmove', this.#onTouchMove, { passive: false }),
      on(el, 'contextmenu', this.#onContextMenu),
      on(el, 'click', this.#onClick, true),
      () => this.#untrack(),
      () => {
        clearTimeout(this.#holdTimer);
        clearTimeout(this.#intervalTimer);
      },
    );
  }

  // ───────────────────────────── public API ─────────────────────────────

  get options(): Readonly<GesturesBehavior> {
    return this.#o;
  }

  getState = (): GesturesState => this.#state;

  /** Subscribe to state changes. The listener is called immediately with the current state. */
  subscribe = (listener: (state: GesturesState) => void): (() => void) => {
    this.#listeners.add(listener);
    this.#call(() => listener(this.#state));
    return () => this.#listeners.delete(listener);
  };

  /**
   * Call `handler` when `pattern` is performed. Returns a function that removes the binding.
   * Throws on an invalid pattern.
   */
  on = (pattern: GesturePattern, handler: GestureHandler): (() => void) => {
    const parsed = parsePattern(pattern);
    const binding: Binding = { pattern: parsed, gesture: formatPattern(parsed), handler };
    if (this.#destroyed) return noop;
    this.#bindings.add(binding);
    this.#applyStyles();
    return () => {
      if (!this.#bindings.delete(binding) || this.#destroyed) return;
      this.#applyStyles();
    };
  };

  /** Forget the sequence in progress without firing anything. */
  reset = (): void => {
    if (this.#destroyed) return;
    this.#pending = null;
    this.#resetSequence();
    clearTimeout(this.#holdTimer);
    if (this.#current) this.#dead = true;
    this.#emit();
  };

  setOptions = (next: Partial<GesturesBehavior>): void => {
    if (this.#destroyed) return;
    this.#o = { ...this.#o, ...stripUndefined(next) };
    if (this.#o.disabled) this.reset();
  };

  /** Remove listeners, and the attributes and inline styles zupf added. */
  destroy = (): void => {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#cleanup();
    this.#listeners.clear();
    this.#bindings.clear();
    for (const attr of ['data-zupf-gestures', 'data-pressed', 'data-holding']) this.el.removeAttribute(attr);
    for (const [prop, [value, priority]] of Object.entries(this.#savedStyles)) {
      this.el.style.setProperty(prop, value, priority);
    }
  };

  // ───────────────────────────── pointer input ─────────────────────────────

  #onDown = (e: PointerEvent) => {
    if (this.#o.disabled || !(e.target instanceof Element)) return;
    if (this.#current) {
      // A second finger (pinch, two-finger tap) isn't part of any gesture. A new primary pointer means the
      // previous press lost its pointerup (e.g. an iOS system gesture): drop it and start over.
      this.#abort();
      if (!e.isPrimary) return;
    }
    if (!e.isPrimary || (e.pointerType === 'mouse' && (!this.#o.mouse || e.button !== 0))) return;

    clearTimeout(this.#intervalTimer);
    this.#current = [];
    this.#dead = false;
    this.#moved = false;
    this.#pointerId = e.pointerId;
    this.#pointerType = e.pointerType;
    this.#target = e.target;
    this.#last = e;
    this.#start = this.#anchor = { x: e.clientX, y: e.clientY };
    this.el.setAttribute('data-pressed', '');
    this.#track();
    clearTimeout(this.#holdTimer);
    if (this.#usesHold) this.#holdTimer = setTimeout(this.#onHold, this.#o.holdTime);
    this.#evaluate();
  };

  #onHold = () => {
    if (!this.#current || this.#moved || this.#dead) return;
    this.#current.push('hold');
    this.el.setAttribute('data-holding', '');
    window.getSelection()?.removeAllRanges();
    this.#evaluate();
  };

  #onMove = (e: PointerEvent) => {
    const current = this.#current;
    if (!current || e.pointerId !== this.#pointerId) return;
    this.#last = e;
    const { x, y } = { x: e.clientX, y: e.clientY };
    if (Math.hypot(x - this.#start.x, y - this.#start.y) > this.#o.slop) this.#startMoving();
    const dx = x - this.#anchor.x;
    const dy = y - this.#anchor.y;
    const dir: SwipeDirection = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    const lastToken = current.at(-1);
    if (lastToken === `swipe-${dir}`) {
      // Still going the same way: follow along, so a turn is measured from where it happens.
      this.#anchor = { x, y };
    } else if (Math.max(Math.abs(dx), Math.abs(dy)) >= this.#o.swipeDistance) {
      current.push(`swipe-${dir}`);
      this.#startMoving(); // swipeDistance may be below slop
      this.#anchor = { x, y };
      if (!this.#dead) this.#evaluate();
    }
  };

  #onUp = (e: PointerEvent) => {
    const current = this.#current;
    if (!current || e.pointerId !== this.#pointerId) return;
    this.#last = e;
    this.#endPress();
    if (this.#suppressAfterPress) {
      this.#suppressAfterPress = false;
      this.#suppressNextClick();
    }
    if (this.#dead) {
      this.#emit();
      return;
    }
    // Moved, but not far enough to swipe: an empty press, which matches nothing.
    if (!current.length && !this.#moved) current.push('tap');
    this.#done.push(current);
    this.#evaluate();
    // A mouse hold or swipe that a longer pattern may still extend fires later (or never): the click comes now.
    if (this.#pointerType === 'mouse' && current.length && current[0] !== 'tap' && this.#done.length)
      this.#suppressNextClick();
  };

  /**
   * Follow the press on `window`, so moves and the release still arrive after the pointer leaves the element
   * (a fast mouse drag, or a release outside). Capturing the pointer instead would retarget the click of a plain
   * tap (e.g. on a button inside) to the captor.
   */
  #track() {
    this.#untrack();
    this.#untrack = chain(
      on(window, 'pointermove', this.#onMove, true),
      on(window, 'pointerup', this.#onUp, true),
      on(window, 'pointercancel', this.#onCancel, true),
    );
  }

  /** The press moved: it can't be a hold anymore. */
  #startMoving() {
    if (this.#moved) return;
    this.#moved = true;
    clearTimeout(this.#holdTimer);
  }

  #endPress() {
    clearTimeout(this.#holdTimer);
    this.#untrack();
    this.#untrack = noop;
    this.#current = null;
    this.el.removeAttribute('data-pressed');
    this.el.removeAttribute('data-holding');
  }

  #onCancel = (e: PointerEvent) => {
    if (this.#current && e.pointerId === this.#pointerId) this.#abort();
  };

  /** The browser took over the pointer (scroll, system gesture) or a second finger came down. */
  #abort() {
    this.#suppressAfterPress = false;
    this.#endPress();
    this.#flush();
    this.#resetSequence();
    this.#emit();
  }

  // ───────────────────────────── matching ─────────────────────────────

  #evaluate(): void {
    if (this.#destroyed) return;
    const done = this.#done;
    const current = this.#current;
    const complete: Binding[] = [];
    let partial = false;
    for (const b of this.#bindings) {
      const result = matchPattern(b.pattern, done, current);
      if (result === 'complete') complete.push(b);
      else if (result === 'partial') partial = true;
    }

    if (!complete.length && !partial) {
      // Dead end. What completed before this press still counts; then try the latest press on its own.
      this.#flush();
      // A handler called reset() or destroy(): the sequence is gone.
      if (this.#destroyed || this.#done !== done) return this.#emit();
      if (done.length + (current ? 1 : 0) > 1) {
        this.#done = current ? [] : done.slice(-1);
        return this.#evaluate();
      }
      this.#resetSequence();
      if (current) this.#dead = true;
    } else if (!partial) {
      // Nothing longer can follow: fire now (even mid-press, e.g. a long press while still held).
      const event = this.#event();
      this.#pending = null;
      this.#resetSequence();
      if (current) this.#dead = true;
      this.#emit();
      this.#fire(complete, event);
      return;
    } else {
      // A longer pattern may still match. Remember what's complete so far in case it doesn't.
      // Otherwise keep what completed earlier: it fires if the sequence goes no further.
      if (complete.length) this.#pending = { bindings: complete, event: this.#event() };
      if (!current) {
        clearTimeout(this.#intervalTimer);
        this.#intervalTimer = setTimeout(() => {
          this.#flush();
          this.#resetSequence();
          this.#emit();
        }, this.#o.interval);
      }
    }
    this.#emit();
  }

  /** Fire what was complete before a longer pattern turned out not to match. */
  #flush() {
    const pending = this.#pending;
    this.#pending = null;
    if (pending) this.#fire(pending.bindings, pending.event);
  }

  #fire(bindings: Binding[], event: GestureEvent) {
    // Don't let a hold or swipe also click whatever was pressed.
    if (this.#pointerType === 'mouse' && event.steps.at(-1)?.[0] !== 'tap') {
      if (this.#current) this.#suppressAfterPress = true;
      else this.#suppressNextClick();
    }
    for (const b of bindings) {
      if (this.#bindings.has(b)) this.#call(() => b.handler({ ...event, gesture: b.gesture }));
    }
  }

  /** Run user code so that an exception can't skip the bookkeeping after it. It is reported, like a DOM listener's. */
  #call(fn: () => void) {
    try {
      fn();
    } catch (error) {
      if (typeof reportError === 'function') reportError(error);
      else
        queueMicrotask(() => {
          throw error;
        });
    }
  }

  #resetSequence() {
    clearTimeout(this.#intervalTimer);
    this.#done = [];
  }

  #event(): GestureEvent {
    const steps = this.#steps();
    let direction: SwipeDirection | null = null;
    for (const t of steps.flat()) if (t.startsWith('swipe-')) direction = t.slice(6) as SwipeDirection;
    return { gesture: '', steps, direction, target: this.#target!, event: this.#last! };
  }

  #steps(): Step[] {
    const steps = this.#done.map((s) => [...s]);
    if (this.#current && !this.#dead) steps.push([...this.#current]);
    return steps;
  }

  #emit() {
    const pressed = !!this.#current;
    const steps = this.#steps();
    const prev = this.#state;
    if (prev.pressed === pressed && formatSteps(prev.steps) === formatSteps(steps)) return;
    this.#state = { pressed, steps };
    for (const l of this.#listeners) this.#call(() => l(this.#state));
  }

  // ───────────────────────────── browser defaults ─────────────────────────────

  /**
   * `touch-action` so the page doesn't scroll / zoom where a swipe or multi-tap is expected, and no iOS callout
   * or text selection on long press. Swipes after a hold keep native scrolling (see `#onTouchMove`).
   */
  #applyStyles() {
    const patterns = [...this.#bindings].map((b) => b.pattern);
    let x = false;
    let y = false;
    for (const p of patterns) {
      const axes = swipeAxes(p);
      x ||= axes.x;
      y ||= axes.y;
    }
    const multi = patterns.some((p) => p.length > 1);
    const hold = patterns.some((p) => p.some((step) => step.includes('hold')));
    this.#usesHold = hold;
    const styles: Record<string, string> = {
      'touch-action': x && y ? 'none' : y ? 'pan-x pinch-zoom' : x ? 'pan-y pinch-zoom' : multi ? 'manipulation' : '',
      '-webkit-touch-callout': hold ? 'none' : '',
      '-webkit-user-select': hold ? 'none' : '',
      'user-select': hold ? 'none' : '',
    };
    for (const [prop, value] of Object.entries(styles)) {
      const style = this.el.style;
      this.#savedStyles[prop] ??= [style.getPropertyValue(prop), style.getPropertyPriority(prop)];
      if (value) style.setProperty(prop, value);
      else style.setProperty(prop, ...this.#savedStyles[prop]);
    }
  }

  /** Once a press holds or swipes, keep the page from scrolling under it. */
  #onTouchMove = (e: TouchEvent) => {
    if (e.cancelable && this.#current?.length && !this.#dead) e.preventDefault();
  };

  /** Android opens the context menu on long press (also after a `hold` has fired and the press is done with). */
  #onContextMenu = (e: Event) => {
    if (this.#current && this.#pointerType !== 'mouse' && this.#usesHold) e.preventDefault();
  };

  #suppressNextClick() {
    this.#suppressClick = true;
    setTimeout(() => (this.#suppressClick = false), 0);
  }

  #onClick = (e: MouseEvent) => {
    if (!this.#suppressClick) return;
    e.preventDefault();
    e.stopPropagation();
  };
}

const formatSteps = (steps: readonly Step[]) => steps.map((s) => s.join('+')).join(' ');

export function createGestures(options: GesturesOptions): Gestures {
  return new Gestures(options);
}
