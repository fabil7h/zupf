import type { Direction } from './types';
import { chain, directionSign, isVertical, on, type Cleanup } from './helpers';

export interface DragEnd {
  /** Signed distance in px; positive = away from the anchored edge (see `DragGestureOptions.direction`). */
  distance: number;
  /** Average speed over the whole press, px/ms. */
  velocity: number;
}

export interface DragGestureOptions {
  /**
   * Edge the dragged thing is anchored to. Sets the axis and the sign of `distance`:
   * positive = moving away from that edge (up for `'bottom'`, down for `'top'`). Read on every press.
   */
  direction: () => Direction;
  /**
   * Optional drag handle inside the element. While `handleOnly()` is true, only the handle starts a press
   * and moves on it are tracked without axis locking.
   */
  handle?: HTMLElement | null;
  handleOnly?: () => boolean;
  /** Veto a press. The target is already known to be an element inside the gesture element. */
  canStart?: (e: PointerEvent & { target: Element }) => boolean;
  onStart?: (e: PointerEvent) => void;
  /** Called for every move along the axis while pressed. */
  onMove?: (e: PointerEvent, distance: number) => void;
  /** Called once per press. `e` is `null` when the pointer was cancelled by the browser. */
  onEnd?: (e: PointerEvent | null, info: DragEnd) => void;
}

/** px a touch / mouse may move before a cross-axis gesture is ruled out. */
const AXIS_THRESHOLD = { touch: 10, other: 2 };

/**
 * Pointer press/drag/release tracking along one axis, with pointer capture,
 * axis locking (cross-axis gestures stay native, e.g. horizontal carousels) and release velocity.
 * Rendering and decisions are left to the callbacks.
 */
export class DragGesture {
  readonly el: HTMLElement;
  #o: DragGestureOptions;
  #cleanup: Cleanup;

  #pressed = false;
  #start = 0;
  #startTime = 0;
  #startXY: { x: number; y: number } | null = null;
  #axisLocked = false;
  #last: PointerEvent | null = null;
  #captureEl: Element | null = null;
  #pointerId = 0;

  constructor(el: HTMLElement, options: DragGestureOptions) {
    this.el = el;
    this.#o = options;
    const handle = options.handle;
    this.#cleanup = chain(
      on(el, 'pointerdown', this.#onDown),
      on(el, 'pointermove', this.#onMove),
      on(el, 'pointerup', (e) => this.release(e)),
      on(el, 'pointerout', this.#onOut),
      on(el, 'contextmenu', () => this.#last && this.#end(this.#last)),
      on(el, 'pointercancel', (e) => this.#isOther(e) || this.#end(null)),
      handle && on(handle, 'pointerdown', (e) => this.#handleOnly && this.#press(e)),
      handle && on(handle, 'pointermove', (e) => this.#handleOnly && this.#move(e)),
    );
  }

  /** Whether a press is being tracked (from pointerdown until release or `cancel`). */
  get pressed(): boolean {
    return this.#pressed;
  }

  /** End the current press as if the pointer was released with `e` (e.g. a pointerup seen elsewhere). */
  release(e: PointerEvent | null): void {
    if (!e || !this.#isOther(e)) this.#end(e);
  }

  /** Stop tracking the current press without calling `onEnd`. */
  cancel(): void {
    this.#pressed = false;
  }

  destroy(): void {
    this.#pressed = false;
    this.#cleanup();
  }

  get #handleOnly() {
    return !!this.#o.handleOnly?.();
  }

  #axisPos(e: PointerEvent) {
    return isVertical(this.#o.direction()) ? e.pageY : e.pageX;
  }

  /** Events of other pointers (e.g. a second finger) don't affect the current press. */
  #isOther(e: PointerEvent) {
    return this.#pressed && e.pointerId !== this.#pointerId;
  }

  /**
   * Whether `e` may start a new press. A second finger can't, but a new primary pointer while still pressed
   * means the old press lost its pointerup / pointercancel (e.g. an iOS system gesture): cancel it and restart.
   */
  #canClaim(e: PointerEvent) {
    if (!this.#pressed) return true;
    if (!e.isPrimary) return false;
    this.#end(null);
    return true;
  }

  #onDown = (e: PointerEvent) => {
    if (this.#handleOnly || !this.#canClaim(e)) return;
    this.#startXY = { x: e.pageX, y: e.pageY };
    this.#press(e);
  };

  #onMove = (e: PointerEvent) => {
    if (this.#isOther(e)) return;
    this.#last = e;
    if (this.#handleOnly || !this.#startXY) return;
    const delta = { x: e.pageX - this.#startXY.x, y: e.pageY - this.#startXY.y };
    const threshold = e.pointerType === 'touch' ? AXIS_THRESHOLD.touch : AXIS_THRESHOLD.other;
    if (this.#isAlongAxis(delta, threshold)) this.#move(e);
    else if (Math.abs(delta.x) > threshold || Math.abs(delta.y) > threshold) this.#startXY = null;
  };

  /** Treat the pointer leaving the element (without capture) as a release. */
  #onOut = (e: PointerEvent) => {
    if (this.#isOther(e) || this.#captureEl?.hasPointerCapture?.(e.pointerId)) return;
    if (e.relatedTarget instanceof Node && this.el.contains(e.relatedTarget)) return;
    this.#end(this.#last);
  };

  /** Only start tracking when the gesture goes along the axis. */
  #isAlongAxis(delta: { x: number; y: number }, threshold: number) {
    if (this.#axisLocked) return true;
    const direction = this.#o.direction();
    const dx = Math.abs(delta.x);
    const dy = Math.abs(delta.y);
    const isDeltaX = dx > dy;
    const sign = directionSign(direction);
    if (isVertical(direction)) {
      if (!(delta.y * sign < 0) && dy <= threshold) return !isDeltaX;
    } else if (!(delta.x * sign < 0) && dx <= threshold) {
      return isDeltaX;
    }
    this.#axisLocked = true;
    return true;
  }

  #press(e: PointerEvent) {
    const target = e.target;
    if (!this.#canClaim(e) || !(target instanceof Element) || !this.el.contains(target)) return;
    if (this.#o.canStart && !this.#o.canStart(e as PointerEvent & { target: Element })) return;
    this.#pressed = true;
    this.#pointerId = e.pointerId;
    this.#startTime = Date.now();
    try {
      this.#captureEl = target;
      target.setPointerCapture(e.pointerId);
    } catch {
      /* element may not support capture */
    }
    this.#start = this.#axisPos(e);
    this.#o.onStart?.(e);
  }

  #move(e: PointerEvent) {
    if (!this.#pressed || this.#isOther(e)) return;
    this.#o.onMove?.(e, (this.#start - this.#axisPos(e)) * directionSign(this.#o.direction()));
  }

  #end(e: PointerEvent | null) {
    this.#startXY = null;
    this.#axisLocked = false;
    if (!this.#pressed) return;
    this.#pressed = false;
    const moved = e ? this.#start - this.#axisPos(e) : 0;
    const velocity = Math.abs(moved) / Math.max(Date.now() - this.#startTime, 1);
    this.#o.onEnd?.(e, { distance: moved * directionSign(this.#o.direction()), velocity });
  }
}

/** Whether `el` or a scrollable ancestor up to `boundary` is scrolled away from its start. */
export function isScrolledAway(el: Element, boundary: Element): boolean {
  let node: Element | null = el;
  while (node) {
    if (node.scrollHeight > node.clientHeight && node.scrollTop !== 0) return true;
    if (node === boundary) break;
    node = node.parentElement;
  }
  return false;
}
