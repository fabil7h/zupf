import {
  chain,
  css,
  DragGesture,
  getScrollParent,
  isScrolledAway,
  noop,
  on,
  resolveElement,
  stripUndefined,
  Timers,
  type Cleanup,
} from '../core';
import { pullOffset, pullProgress } from './physics';

/**
 * - `idle`: at rest.
 * - `pulling`: being pulled, releasing now snaps back.
 * - `ready`: pulled past `threshold`, releasing now refreshes.
 * - `refreshing`: `onRefresh` is running.
 */
export type PullStatus = 'idle' | 'pulling' | 'ready' | 'refreshing';

export interface PullToRefreshState {
  status: PullStatus;
}

export interface PullToRefreshCallbacks {
  /**
   * Called on release past the threshold (or `refresh()`). Return a promise to keep the indicator until it settles.
   * Errors reject `refresh()`; after a pull they are passed to `reportError`.
   */
  onRefresh?: () => unknown;
  /**
   * Fires on every pull frame with the visible offset in px and `progress` 0..1 towards the threshold,
   * and with the target offset when the content animates (to the refreshing offset, back to 0).
   */
  onPull?: (offset: number, progress: number) => void;
  onStatusChange?: (status: PullStatus) => void;
}

export interface PullToRefreshBehavior {
  /** Visible offset in px that must be reached to refresh on release. @default 64 */
  threshold: number;
  /** Upper bound the pull approaches (rubber band). @default 150 */
  max: number;
  /** Offset the content rests at while refreshing. @default threshold */
  refreshingOffset: number | null;
  /** Ignore pulls. @default false */
  disabled: boolean;
  /** Allow pulling with a mouse (touch and pen always work). @default false */
  mouse: boolean;
  /** Settle transition duration in ms. @default 300 */
  duration: number;
  /** @default 'cubic-bezier(0.32, 0.72, 0, 1)' */
  easing: string;
}

type ElementRef = HTMLElement | string | null | undefined;

export interface PullToRefreshOptions extends Partial<PullToRefreshBehavior>, PullToRefreshCallbacks {
  /** The element that is pulled down (and moved). Element or selector. */
  content: HTMLElement | string;
  /**
   * Indicator revealed above the content. Moved along with the content.
   * @default '[data-zupf-ptr-indicator]' next to / inside the content
   */
  indicator?: ElementRef;
  /**
   * Element whose scroll position gates the pull (it must be scrolled to the top). Element or selector.
   * @default the content if it scrolls, else its nearest scrollable ancestor or the page
   */
  scroller?: HTMLElement | string | null;
}

export type PullToRefreshUpdatableOptions = Partial<PullToRefreshBehavior> & PullToRefreshCallbacks;

const DEFAULTS: PullToRefreshBehavior = {
  threshold: 64,
  max: 150,
  refreshingOffset: null,
  disabled: false,
  mouse: false,
  duration: 300,
  easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
};

/** `reportError` where available (missing before Safari 15.4); else rethrow async like a listener error. */
function report(error: unknown) {
  if (typeof reportError === 'function') reportError(error);
  else
    setTimeout(() => {
      throw error;
    });
}

export class PullToRefresh {
  readonly content: HTMLElement;
  readonly indicator: HTMLElement | null;
  readonly scroller: Element;

  #o: PullToRefreshBehavior & PullToRefreshCallbacks;
  #state: PullToRefreshState = { status: 'idle' };
  #listeners = new Set<(state: PullToRefreshState) => void>();
  #cleanup: Cleanup = noop;
  #destroyed = false;
  #gesture!: DragGesture;

  /** The current press turned into a pull (started at the top, moving down). */
  #pulling = false;
  #pressStart = { x: 0, y: 0 };
  #offset = 0;
  #touchStart: { x: number; y: number } | null = null;
  #suppressClick = false;
  #timers = new Timers<'settle' | 'suppressClick'>();
  #inFlight: Promise<void> | null = null;
  /** Indicator attributes set by zupf (not by the markup), removed on destroy. */
  #addedAttrs: string[] = [];

  constructor(options: PullToRefreshOptions) {
    if (typeof document === 'undefined') {
      // Server render: nothing to attach to. Behave like a destroyed instance (idle, all methods no-op).
      this.content = null as never;
      this.indicator = this.scroller = null as never;
      this.#o = { ...DEFAULTS, ...stripUndefined(options as Partial<PullToRefreshBehavior>) };
      this.#destroyed = true;
      return;
    }
    const content = resolveElement(options.content);
    if (!content) throw new Error('[zupf] `content` element not found');
    this.content = content;
    this.indicator =
      options.indicator === null
        ? null
        : (resolveElement(options.indicator) ??
          content.parentElement?.querySelector<HTMLElement>('[data-zupf-ptr-indicator]') ??
          null);
    this.scroller = resolveElement(options.scroller) ?? getScrollParent(content, true);

    const { content: _c, indicator: _i, scroller: _s, ...rest } = options;
    this.#o = { ...DEFAULTS, ...stripUndefined(rest) };

    content.setAttribute('data-zupf-ptr', '');
    for (const [attr, value] of [
      ['data-zupf-ptr-indicator', ''],
      ['aria-hidden', 'true'],
    ] as const) {
      if (!this.indicator || this.indicator.hasAttribute(attr)) continue;
      this.indicator.setAttribute(attr, value);
      this.#addedAttrs.push(attr);
    }
    this.#setDataState('idle');
    this.#render(0, false);

    this.#gesture = new DragGesture(content, {
      direction: () => 'top',
      canStart: (e) =>
        !this.#o.disabled &&
        this.#state.status !== 'refreshing' &&
        this.#allowsPointer(e) &&
        !this.#inNoDragArea(e.target),
      onStart: (e) => {
        this.#pulling = false;
        this.#pressStart = { x: e.clientX, y: e.clientY };
      },
      onMove: (e, distance) => this.#move(e, distance),
      // `e` is null when the browser cancelled the pointer: snap back instead of refreshing.
      onEnd: (e) => this.#release(e !== null),
    });

    this.#cleanup = chain(
      () => this.#gesture.destroy(),
      on(content, 'touchstart', this.#onTouchStart, { passive: true }),
      on(content, 'touchmove', this.#onTouchMove, { passive: false }),
      on(content, 'click', this.#onClick, true),
      () => this.#timers.dispose(),
    );
  }

  // ───────────────────────────── public API ─────────────────────────────

  get status(): PullStatus {
    return this.#state.status;
  }

  get options(): Readonly<PullToRefreshBehavior & PullToRefreshCallbacks> {
    return this.#o;
  }

  getState = (): PullToRefreshState => this.#state;

  /** Subscribe to state changes. The listener is called immediately with the current state. */
  subscribe = (listener: (state: PullToRefreshState) => void): (() => void) => {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  };

  /**
   * Show the refreshing state and call `onRefresh`, as if the user pulled. Resolves when it is done.
   * Interrupts a pull in progress; while a refresh is running, returns that refresh's promise.
   */
  refresh = (): Promise<void> => {
    if (this.#destroyed) return Promise.resolve();
    if (this.#inFlight) return this.#inFlight;
    if (this.#pulling) {
      this.#gesture.cancel();
      this.#endPull();
    }
    this.#stopSettling();
    this.#setStatus('refreshing');
    this.#render(this.#o.refreshingOffset ?? this.#o.threshold, true);
    return (this.#inFlight = (async () => {
      try {
        await this.#o.onRefresh?.();
      } finally {
        this.#inFlight = null;
        this.#finish();
      }
    })());
  };

  setOptions = (next: PullToRefreshUpdatableOptions): void => {
    if (this.#destroyed) return;
    this.#o = { ...this.#o, ...stripUndefined(next) };
    if (this.#o.disabled && this.#gesture.pressed && this.#pulling) {
      this.#gesture.cancel();
      this.#endPull();
      this.#settleToRest();
    }
  };

  /** Remove listeners, and the attributes and inline styles zupf added. The elements stay in place. */
  destroy = (): void => {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#cleanup();
    this.#listeners.clear();
    for (const el of [this.content, this.indicator]) {
      if (!el) continue;
      for (const attr of ['data-zupf-ptr', 'data-state', 'data-pulling', 'data-settling', 'aria-busy']) {
        el.removeAttribute(attr);
      }
      for (const prop of ['transform', 'transition', '--zupf-ptr-offset', '--zupf-ptr-progress']) {
        el.style.removeProperty(prop);
      }
    }
    for (const attr of this.#addedAttrs) this.indicator?.removeAttribute(attr);
  };

  // ───────────────────────────── internals ─────────────────────────────

  /**
   * Same opt-out as the drawer (sliders, maps, drawing areas…), for areas inside the content only:
   * `data-zupf-no-drag` on the content itself (e.g. to keep a surrounding drawer from dragging) doesn't apply.
   */
  #inNoDragArea(target: Element) {
    const area = target.closest('[data-zupf-no-drag]');
    return !!area && area !== this.content && this.content.contains(area);
  }

  #allowsPointer(e: PointerEvent) {
    return e.pointerType !== 'mouse' || this.#o.mouse;
  }

  /** Scroller at the top, and nothing scrolled between the touched element and the content. */
  #isAtTop(target: Element) {
    const scroller = this.scroller;
    const top =
      scroller === document.scrollingElement || scroller === document.documentElement || scroller === document.body
        ? window.scrollY
        : scroller.scrollTop;
    return top <= 0 && !isScrolledAway(target, this.content);
  }

  #move(e: PointerEvent, distance: number) {
    if (!this.#pulling) {
      if (distance <= 0 || !(e.target instanceof Element) || !this.#isAtTop(e.target)) return;
      // Mostly sideways (e.g. a carousel swipe drifting down): not a pull.
      if (Math.abs(e.clientX - this.#pressStart.x) >= Math.abs(e.clientY - this.#pressStart.y)) return;
      this.#pulling = true;
      this.#stopSettling();
      window.getSelection()?.removeAllRanges();
      this.content.setAttribute('data-pulling', '');
    }
    const offset = pullOffset(distance, this.#o.max);
    this.#setStatus(offset >= this.#o.threshold ? 'ready' : 'pulling');
    this.#render(offset, false);
  }

  #release(canRefresh: boolean) {
    if (!this.#pulling) return;
    this.#endPull();
    // A mouse pull ends with a click on whatever was pressed; swallow it.
    if (this.#offset > 0) {
      this.#suppressClick = true;
      this.#timers.set('suppressClick', () => (this.#suppressClick = false), 0);
    }
    // `refresh()` rejects with `onRefresh`'s error; nobody awaits it here, so report it like an event listener error.
    if (canRefresh && this.#state.status === 'ready') this.refresh().catch(report);
    else this.#settleToRest();
  }

  #endPull() {
    this.#pulling = false;
    this.content.removeAttribute('data-pulling');
  }

  /** A new pull or refresh interrupts sliding back to rest. */
  #stopSettling() {
    this.#timers.clear('settle');
    this.indicator?.removeAttribute('data-settling');
  }

  #finish() {
    if (this.#destroyed) return;
    this.#settleToRest();
  }

  /**
   * Slide back to rest. The indicator keeps its look (progress, spinning) while it slides away and fades out
   * (`data-settling`), so nothing visibly resets mid-animation; the progress is reset once it is out of view.
   */
  #settleToRest() {
    const refreshed = this.#state.status === 'refreshing';
    this.indicator?.setAttribute('data-settling', refreshed ? 'refreshed' : 'cancelled');
    this.#render(0, true, false);
    this.#timers.set(
      'settle',
      () => {
        this.indicator?.removeAttribute('data-settling');
        this.#setVars(0, 0);
        css(this.content, { transition: '', transform: '' });
      },
      this.#o.duration,
    );
    this.#setStatus('idle');
  }

  #render(offset: number, animate: boolean, updateProgress = true) {
    this.#offset = offset;
    const progress = pullProgress(offset, this.#o.threshold);
    const timing = `${this.#o.duration}ms ${this.#o.easing}`;
    const transition = animate ? `transform ${timing}, opacity ${timing}` : 'none';
    if (updateProgress) this.#setVars(offset, progress);
    css(this.content, { transition, transform: offset ? `translate3d(0, ${offset}px, 0)` : '' });
    css(this.indicator, { transition, transform: `translate3d(0, calc(${offset}px - 100%), 0)` });
    this.#o.onPull?.(offset, progress);
  }

  #setVars(offset: number, progress: number) {
    const vars = { '--zupf-ptr-offset': `${offset}px`, '--zupf-ptr-progress': String(progress) };
    css(this.content, vars);
    css(this.indicator, vars);
  }

  #setStatus(status: PullStatus) {
    if (status === this.#state.status) return;
    this.#state = { status };
    this.#setDataState(status);
    for (const l of this.#listeners) l(this.#state);
    this.#o.onStatusChange?.(status);
  }

  #setDataState(status: PullStatus) {
    this.content.setAttribute('data-state', status);
    this.indicator?.setAttribute('data-state', status);
    if (status === 'refreshing') this.content.setAttribute('aria-busy', 'true');
    else this.content.removeAttribute('aria-busy');
  }

  // Touch: once pulling (or about to), cancel the native scroll / overscroll so pointer events keep flowing.
  #onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    this.#touchStart = t && e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
  };

  #onTouchMove = (e: TouchEvent) => {
    if (!e.cancelable) return;
    if (this.#pulling) {
      e.preventDefault();
      return;
    }
    const start = this.#touchStart;
    const t = e.touches[0];
    if (!start || !t || e.touches.length > 1 || this.#o.disabled || this.#state.status === 'refreshing') return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const target = e.target instanceof Element ? e.target : null;
    if (!target || this.#inNoDragArea(target)) return;
    if (dy > 0 && dy > Math.abs(dx) && this.#isAtTop(target)) e.preventDefault();
  };

  #onClick = (e: MouseEvent) => {
    if (!this.#suppressClick) return;
    e.preventDefault();
    e.stopPropagation();
  };
}

export function createPullToRefresh(options: PullToRefreshOptions): PullToRefresh {
  return new PullToRefresh(options);
}
