import type { ChangeReason, Direction, SnapPoint } from './types';
import {
  chain,
  closedTransform,
  css,
  dampen,
  directionSign,
  DragGesture,
  getTranslate,
  isInput,
  isIOS,
  isMobileFirefox,
  isScrolledAway,
  isVertical,
  noop,
  on,
  resolveElement,
  stripUndefined,
  Timers,
  translate,
  uid,
  type Cleanup,
  type DragEnd,
} from '../core';
import { getSnapOffsets, overlayOpacityAt, resolveRelease, resolveSnapRelease, snapFadeProgress } from './physics';
import { preventScroll } from './prevent-scroll';
import { restorePositionFixed, setPositionFixed } from './position-fixed';
import { lockScroll } from './scroll-lock';
import { inertOthers } from './inert';
import { isInHigherLayer, isTopLayer, pushLayer, removeLayer } from './layers';
import { focus, getTabbables } from './focus';

type ElementRef = HTMLElement | string | null | undefined;

export interface ScaleBackgroundOptions {
  /** px removed from the viewport width to compute the scale. @default 26 */
  offset?: number;
  /** Border radius applied to the wrapper while scaled. @default 8 */
  radius?: number;
  /** px the wrapper is pushed away from the screen edge. @default 14 */
  translate?: number;
  /** Body background while scaled; `false` to leave it alone. @default 'black' */
  background?: string | false;
}

export interface SheetCallbacks {
  /** Fires whenever the sheet opens or closes, with what caused it. */
  onOpenChange?: (open: boolean, reason: ChangeReason) => void;
  /** Fires right before closing starts. */
  onClose?: () => void;
  /** Fires after the open/close transition finished. */
  onAnimationEnd?: (open: boolean) => void;
  /** Fires on every drag frame. `progress` is 0 (rest) .. 1 (closed / next snap point). */
  onDrag?: (event: PointerEvent, progress: number) => void;
  /** Fires when a drag ends. `open` tells whether the sheet stays open. */
  onRelease?: (event: PointerEvent, open: boolean) => void;
  onSnapPointChange?: (snapPoint: SnapPoint, index: number) => void;
}

export interface SheetBehavior {
  /** @default 'bottom' */
  direction: Direction;
  /** Start opened, without the enter animation. @default false */
  open: boolean;
  /** Snap points: fractions of the container (`0.5`) or px strings (`'320px'`), smallest first. */
  snapPoints: SnapPoint[] | null;
  /** Initially active snap point. @default snapPoints[0] */
  activeSnapPoint: SnapPoint | null;
  /**
   * Snap point index from which the overlay is shown. Below it the overlay is invisible.
   * Use the last index to show the overlay only when fully expanded. @default 0
   */
  fadeFromIndex: number | null;
  /** Never skip snap points on fast swipes. @default false */
  snapToSequentialPoint: boolean;
  /** When false, dragging, Esc and outside press do not close the sheet. @default true */
  dismissible: boolean;
  /** Modal: overlay, focus trap, inert page, scroll lock. @default true */
  modal: boolean;
  /** Only the handle starts a drag. @default false */
  handleOnly: boolean;
  /** Tapping the handle cycles through snap points (and closes from the last). @default true */
  handleCycle: boolean;
  /** Fraction of the sheet size that must be dragged to close. @default 0.25 */
  closeThreshold: number;
  /** px/ms; faster releases close / jump one snap point. @default 0.4 */
  velocityThreshold: number;
  /** px/ms; faster releases jump straight to the first/last snap point. @default 2 */
  flickVelocity: number;
  /** ms during which dragging is disabled after the content was scrolled. @default 100 */
  scrollLockTimeout: number;
  /** Transition duration in ms. @default 500 */
  duration: number;
  /** Transition timing function. @default 'cubic-bezier(0.32, 0.72, 0, 1)' */
  easing: string;
  /** Resistance curve when dragging past the fully-open position. */
  rubberband: (distance: number) => number;
  /** Scale the `wrapper` element behind the sheet, iOS style. @default false */
  scaleBackground: boolean | ScaleBackgroundOptions;
  /** How much a parent sheet shrinks while a nested sheet is open, in px. @default 16 */
  nestedDisplacement: number;
  /** Never touch `<body>` styles (position fixed, background). @default false */
  noBodyStyles: boolean;
  /** Lock page scroll while open (modal only). @default true */
  lockScroll: boolean;
  /** Make everything outside the sheet `inert` while open (modal only). @default true */
  inert: boolean;
  /** Trap Tab focus inside the sheet (modal only). @default true */
  trapFocus: boolean;
  /** Focus the first focusable element on open instead of the sheet itself. @default false */
  autoFocus: boolean;
  /** Return focus to the previously focused element on close. @default true */
  restoreFocus: boolean;
  /** @default true */
  closeOnEscape: boolean;
  /** Close when pressing outside the sheet (modal only). @default true */
  closeOnOutsidePress: boolean;
  /** Reposition/resize the sheet when the virtual keyboard opens. @default true */
  repositionInputs: boolean;
  /** With the keyboard open, shrink instead of moving the sheet up. @default false */
  fixed: boolean;
  /** Skip restoring scroll position after close if the URL changed. @default false */
  preventScrollRestoration: boolean;
  /** Override drag eligibility. Return a boolean to decide, or `undefined` to use the default logic. */
  shouldDrag?: (target: Element, sheet: Sheet) => boolean | undefined;
}

export interface SheetOptions extends Partial<SheetBehavior>, SheetCallbacks {
  /** The sheet panel. Element or selector. */
  content: HTMLElement | string;
  /** Backdrop. Element or selector. Only shown when `modal`. */
  overlay?: ElementRef;
  /** Drag handle. @default content.querySelector('[data-zupf-handle]') */
  handle?: ElementRef;
  /** Elements that toggle the sheet on click. */
  trigger?: ElementRef | HTMLElement[];
  /** Page wrapper scaled by `scaleBackground`. @default '[data-zupf-wrapper]' */
  wrapper?: ElementRef;
  /** Custom container to size snap points against (instead of the window). */
  container?: HTMLElement | null;
  /** Parent sheet, for nested sheets. The parent scales back while this one is open. */
  parent?: Sheet | null;
}

export interface SheetState {
  open: boolean;
  dragging: boolean;
  activeSnapPoint: SnapPoint | null;
  activeSnapPointIndex: number | null;
}

export type UpdatableOptions = Partial<SheetBehavior> & SheetCallbacks;

const DEFAULTS: SheetBehavior = {
  direction: 'bottom',
  open: false,
  snapPoints: null,
  activeSnapPoint: null,
  fadeFromIndex: null,
  snapToSequentialPoint: false,
  dismissible: true,
  modal: true,
  handleOnly: false,
  handleCycle: true,
  closeThreshold: 0.25,
  velocityThreshold: 0.4,
  flickVelocity: 2,
  scrollLockTimeout: 100,
  duration: 500,
  easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
  rubberband: dampen,
  scaleBackground: false,
  nestedDisplacement: 16,
  noBodyStyles: false,
  lockScroll: true,
  inert: true,
  trapFocus: true,
  autoFocus: false,
  restoreFocus: true,
  closeOnEscape: true,
  closeOnOutsidePress: true,
  repositionInputs: true,
  fixed: false,
  preventScrollRestoration: false,
};

const SCALE_DEFAULTS: Required<ScaleBackgroundOptions> = { offset: 26, radius: 8, translate: 14, background: 'black' };
const OPPOSITE_EDGE: Record<Direction, Direction> = { bottom: 'top', top: 'bottom', left: 'right', right: 'left' };
type SheetTimer =
  | 'animationEnd'
  | 'close'
  | 'handleCycle'
  | 'handleLongPress'
  | 'justReleased'
  | 'nested'
  | 'positionFixed'
  | 'wrapper';

const LONG_HANDLE_PRESS_TIMEOUT = 250;
const DOUBLE_TAP_TIMEOUT = 120;
/** Explicit user intents that close even when `dismissible` is false. */
const FORCED: ReadonlySet<ChangeReason> = new Set<ChangeReason>(['api', 'close-button', 'trigger']);

export class Sheet {
  readonly content: HTMLElement;
  readonly overlay: HTMLElement | null;
  readonly handle: HTMLElement | null;
  readonly wrapper: HTMLElement | null;
  readonly container: HTMLElement | null;
  readonly parent: Sheet | null;
  readonly triggers: HTMLElement[];

  #o: SheetBehavior & SheetCallbacks;
  #state: SheetState = { open: false, dragging: false, activeSnapPoint: null, activeSnapPointIndex: null };
  #listeners = new Set<(state: SheetState) => void>();
  #destroyed = false;

  // lifecycle
  #hasBeenOpened = false;
  #closing = false;
  #timers = new Timers<SheetTimer>();
  #bindings: Cleanup = noop;
  #openEffects: Cleanup = noop;
  #modalEffects: Cleanup = noop;
  #releasePreventScroll: Cleanup | null = null;
  #wrapperOriginal: string | null = null;
  /** Visible part of the wrapper (wrapper-local px), measured when the sheet opens. */
  #wrapperViewport = { top: 0, bottom: 0, height: 0 };
  #bodyBgOriginal: string | null = null;
  #returnFocus: HTMLElement | null = null;
  #lastFocusedInside: HTMLElement | null = null;
  #layer: { content: HTMLElement };

  // drag
  #gesture!: DragGesture;
  #allowedToDrag = false;
  #draggedThisPress = false;
  #justReleased = false;
  // performance.now() is small right after page load, so "never" must be -Infinity, not 0.
  #openTime = -Infinity;
  #lastTimeDragPrevented = -Infinity;
  #sheetSize = 0;

  // snap points / keyboard
  #snapOffsets: number[] = [];
  #keyboardOpen = false;
  #previousDiffFromInitial = 0;
  #initialSheetHeight = 0;
  #styledForKeyboard = false;

  // handle tap
  #cancelHandleTap = false;

  constructor(options: SheetOptions) {
    if (typeof document === 'undefined') {
      // Server render: nothing to attach to. Behave like a destroyed sheet (closed, all methods no-op).
      this.content = null as never;
      this.overlay = this.handle = this.wrapper = this.container = this.parent = null;
      this.triggers = [];
      this.#layer = { content: null as never };
      this.#o = { ...DEFAULTS, ...stripUndefined(options as Partial<SheetBehavior>) };
      this.#destroyed = true;
      return;
    }
    const content = resolveElement(options.content);
    if (!content) throw new Error('[zupf] `content` element not found');
    this.content = content;
    this.#layer = { content };
    this.overlay = resolveElement(options.overlay);
    this.handle =
      options.handle === null ? null : (resolveElement(options.handle) ?? content.querySelector('[data-zupf-handle]'));
    this.wrapper = options.wrapper === null ? null : resolveElement(options.wrapper ?? '[data-zupf-wrapper]');
    this.container = options.container ?? null;
    this.parent = options.parent ?? null;
    this.triggers = (Array.isArray(options.trigger) ? options.trigger : [resolveElement(options.trigger)]).filter(
      Boolean,
    ) as HTMLElement[];

    const {
      content: _c,
      overlay: _ov,
      handle: _h,
      trigger: _t,
      wrapper: _w,
      container: _ct,
      parent: _p,
      ...rest
    } = options;
    this.#o = { ...DEFAULTS, ...stripUndefined(rest) };

    this.#setupDom();
    this.#bindings = this.#bind();
    this.#computeSnapOffsets();
    const index = this.#initialSnapIndex();
    this.#state = {
      ...this.#state,
      activeSnapPointIndex: index,
      activeSnapPoint: index == null ? null : this.#o.snapPoints![index],
    };
    this.#syncSnapState();

    if (this.#o.open) this.#openSheet('api', false);
    else this.#hideImmediately();
  }

  // ───────────────────────────── public API ─────────────────────────────

  get isOpen(): boolean {
    return this.#state.open;
  }

  get options(): Readonly<SheetBehavior & SheetCallbacks> {
    return this.#o;
  }

  /** Stable snapshot; a new object is created only when something changes. */
  getState = (): SheetState => this.#state;

  /**
   * Subscribe to state changes. The listener is called immediately with the current state
   * (compatible with Svelte stores; use `getState` + `subscribe` for React's useSyncExternalStore).
   */
  subscribe = (listener: (state: SheetState) => void): (() => void) => {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  };

  open = (reason: ChangeReason = 'api'): void => this.#requestOpenChange(true, reason);
  close = (reason: ChangeReason = 'api'): void => this.#requestOpenChange(false, reason);
  toggle = (reason: ChangeReason = 'api'): void => this.#requestOpenChange(!this.#state.open, reason);

  /** Snap to a snap point by value (as given in `snapPoints`). */
  snapTo = (snapPoint: SnapPoint): void => {
    const index = this.#o.snapPoints?.indexOf(snapPoint) ?? -1;
    if (index !== -1) this.snapToIndex(index);
  };

  snapToIndex = (index: number): void => {
    const points = this.#o.snapPoints;
    if (this.#destroyed || !points?.length) return;
    const clamped = Math.min(Math.max(index, 0), points.length - 1);
    if (this.#state.open) this.#snapTo(clamped);
    else this.#setActiveIndex(clamped);
  };

  /** Update behavior/callback options at runtime. */
  setOptions = (next: UpdatableOptions): void => {
    if (this.#destroyed) return;
    const prev = this.#o;
    this.#o = { ...prev, ...stripUndefined(next) };
    const changed = (k: keyof SheetBehavior) => k in next && next[k] !== prev[k];

    if (changed('direction') || changed('snapPoints') || changed('duration') || changed('easing')) {
      this.#setupDom();
      this.#computeSnapOffsets();
      if (changed('snapPoints')) {
        const count = this.#o.snapPoints?.length ?? 0;
        const i = this.#state.activeSnapPointIndex;
        this.#setActiveIndex(count ? Math.min(i ?? 0, count - 1) : null);
      }
      if (this.#state.open && !this.#closing) this.#settle(true);
    }
    if (changed('activeSnapPoint') && next.activeSnapPoint != null) this.snapTo(next.activeSnapPoint);
    if (changed('modal') || changed('handleOnly') || changed('dismissible')) this.#setupDom();
    if (this.#state.open && (['modal', 'lockScroll', 'inert', 'noBodyStyles'] as const).some((k) => changed(k))) {
      this.#modalEffects();
      this.#modalEffects = this.#applyModalEffects(false);
    }
    if (changed('repositionInputs') || changed('modal')) this.#updatePreventScroll();
    if (changed('open') && next.open !== undefined) this.#requestOpenChange(next.open, 'api');
  };

  /** Remove all listeners and page side effects. The DOM is left in place. */
  destroy = (): void => {
    if (this.#destroyed) return;
    if (this.#state.open) {
      this.#openEffects();
      this.#modalEffects();
      this.#releasePreventScroll?.();
      if (!this.parent) restorePositionFixed();
    }
    this.#restoreWrapper(true);
    this.#timers.dispose();
    this.#bindings();
    this.#listeners.clear();
    this.#destroyed = true;
  };

  // ───────────────────────────── setup ─────────────────────────────

  #setupDom() {
    const { content, overlay, handle } = this;
    const o = this.#o;
    content.setAttribute('data-zupf-content', '');
    content.setAttribute('data-direction', o.direction);
    content.setAttribute('data-snap-points', String(!!o.snapPoints?.length));
    content.setAttribute('data-custom-container', String(!!this.container));
    // Styling hook: handle-only sheets keep text selection and native touch behavior.
    content.toggleAttribute('data-handle-only', o.handleOnly);
    // A non-dismissible sheet without snap points can't be dragged at all (the default CSS hides the handle).
    content.setAttribute('data-draggable', String(o.dismissible || !!o.snapPoints?.length));
    if (!content.id) content.id = uid('zupf');
    if (!content.hasAttribute('role')) content.setAttribute('role', 'dialog');
    if (!content.hasAttribute('tabindex')) content.tabIndex = -1;
    if (o.modal) content.setAttribute('aria-modal', 'true');
    else content.removeAttribute('aria-modal');
    css(content, { '--zupf-duration': `${o.duration}ms`, '--zupf-easing': o.easing });

    for (const [attr, selector] of [
      ['aria-labelledby', '[data-zupf-title]'],
      ['aria-describedby', '[data-zupf-description]'],
    ] as const) {
      const el = content.querySelector(selector);
      if (el && !content.hasAttribute(attr)) {
        if (!el.id) el.id = uid('zupf-label');
        content.setAttribute(attr, el.id);
      }
    }

    if (overlay) {
      overlay.setAttribute('data-zupf-overlay', '');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.setAttribute('data-custom-container', String(!!this.container));
      css(overlay, { '--zupf-duration': `${o.duration}ms`, '--zupf-easing': o.easing });
    }
    if (handle) {
      handle.setAttribute('data-zupf-handle', '');
      handle.setAttribute('aria-hidden', 'true');
    }
    for (const t of this.triggers) {
      t.setAttribute('aria-haspopup', 'dialog');
      t.setAttribute('aria-controls', content.id);
      t.setAttribute('aria-expanded', String(this.#state.open));
    }
  }

  #bind(): Cleanup {
    const { content, overlay, handle } = this;
    const gesture = (this.#gesture = new DragGesture(content, {
      direction: () => this.#o.direction,
      handle,
      handleOnly: () => this.#o.handleOnly,
      canStart: this.#canStartDrag,
      onStart: this.#onDragStart,
      onMove: (e, distance) => this.#drag(e, distance),
      onEnd: (e, info) => this.#release(e, info),
    }));
    return chain(
      () => gesture.destroy(),
      overlay && on(overlay, 'pointerup', (e) => gesture.release(e)),
      on(content, 'click', this.#onContentClick),
      on(content, 'focusin', (e) => {
        if (e.target instanceof HTMLElement && e.target !== content) this.#lastFocusedInside = e.target;
      }),
      handle && on(handle, 'click', this.#onHandleClick),
      handle && on(handle, 'pointercancel', this.#cancelHandleInteraction),
      handle &&
        on(handle, 'pointerdown', () => {
          this.#timers.set('handleLongPress', () => (this.#cancelHandleTap = true), LONG_HANDLE_PRESS_TIMEOUT);
        }),
      ...this.triggers.map((t) => on(t, 'click', () => this.toggle('trigger'))),
      on(window, 'resize', this.#onResize),
      () => this.#timers.clear('handleLongPress'),
    );
  }

  #emit(patch: Partial<SheetState>) {
    const next = { ...this.#state, ...patch };
    if ((Object.keys(patch) as (keyof SheetState)[]).every((k) => next[k] === this.#state[k])) return;
    this.#state = next;
    for (const l of this.#listeners) l(next);
  }

  // ───────────────────────────── open / close ─────────────────────────────

  #requestOpenChange(open: boolean, reason: ChangeReason) {
    if (this.#destroyed || open === this.#state.open) return;
    if (!open && !this.#o.dismissible && !FORCED.has(reason)) return;
    if (open) this.#openSheet(reason, true);
    else this.#closeSheet(reason);
  }

  #openSheet(reason: ChangeReason, animate: boolean) {
    const { content, overlay } = this;
    this.#timers.clear('close');
    const wasClosing = this.#closing;
    this.#closing = false;
    this.#hasBeenOpened = true;
    this.#returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    content.hidden = false;
    if (overlay) overlay.hidden = !this.#o.modal;
    this.#setDataState('open');
    this.#computeSnapOffsets();

    if (animate && !wasClosing) {
      // Start fully off-screen, then transition to the resting position.
      css(content, { transition: 'none', transform: closedTransform(this.#o.direction) });
      css(overlay, { transition: 'none', opacity: '0' });
      content.getBoundingClientRect(); // force reflow
    }

    this.#emit({ open: true });
    this.#settle(animate);

    this.#openTime = performance.now();
    this.#openEffects = this.#applyOpenEffects();
    this.#modalEffects = this.#applyModalEffects(true);
    this.#updatePreventScroll();
    if (this.parent) this.parent.#onNestedOpenChange(true);

    this.#o.onOpenChange?.(true, reason);
    this.#timers.set('animationEnd', () => this.#o.onAnimationEnd?.(true), animate ? this.#o.duration : 0);
  }

  #closeSheet(reason: ChangeReason) {
    const { content, overlay } = this;
    this.#cancelDrag();
    this.#o.onClose?.();
    this.#closing = true;

    this.#emit({ open: false });
    this.#setDataState('closed');
    css(content, { transition: this.#transition('transform'), transform: closedTransform(this.#o.direction) });
    css(overlay, { transition: this.#transition('opacity'), opacity: '0' });

    this.#modalEffects();
    this.#modalEffects = noop;
    this.#openEffects();
    this.#openEffects = noop;
    this.#updatePreventScroll();
    if (!this.parent) restorePositionFixed(this.#o.preventScrollRestoration);
    if (this.parent) this.parent.#onNestedOpenChange(false);

    this.#o.onOpenChange?.(false, reason);
    this.#timers.clear('animationEnd');
    this.#timers.set(
      'close',
      () => {
        this.#closing = false;
        this.#hideImmediately();
        this.#setActiveIndex(this.#initialSnapIndex());
        this.#o.onAnimationEnd?.(false);
      },
      this.#o.duration,
    );
  }

  #hideImmediately() {
    const { content, overlay } = this;
    content.hidden = true;
    if (overlay) overlay.hidden = true;
    this.#setDataState('closed');
    for (const prop of ['transform', 'transition']) content.style.removeProperty(prop);
    for (const prop of ['opacity', 'transition', 'pointer-events']) overlay?.style.removeProperty(prop);
    if (this.#styledForKeyboard) {
      content.style.removeProperty('height');
      content.style.removeProperty('bottom');
      this.#styledForKeyboard = false;
    }
    this.#initialSheetHeight = 0;
    this.#keyboardOpen = false;
  }

  #setDataState(state: 'open' | 'closed') {
    this.content.setAttribute('data-state', state);
    this.overlay?.setAttribute('data-state', state);
    this.handle?.setAttribute('data-state', state);
    for (const t of this.triggers) t.setAttribute('aria-expanded', String(state === 'open'));
  }

  /** Effects active whenever the sheet is open (modal or not). */
  #applyOpenEffects(): Cleanup {
    const html = document.documentElement;
    const prevScrollBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    const layer = this.#layer;
    pushLayer(layer);

    if (!this.parent && !this.#o.noBodyStyles) {
      setPositionFixed();
      if (!this.#o.modal) {
        this.#timers.set('positionFixed', () => restorePositionFixed(this.#o.preventScrollRestoration), 500);
      }
    }
    this.#applyScaleBackground();

    return chain(
      () => (html.style.scrollBehavior = prevScrollBehavior),
      () => removeLayer(layer),
      () => this.#timers.clear('positionFixed'),
      () => this.#restoreWrapper(false),
      on(document, 'keydown', (e) => {
        if (e.key === 'Escape' && this.#o.closeOnEscape && isTopLayer(layer) && !e.defaultPrevented) {
          e.preventDefault();
          this.#requestOpenChange(false, 'escape');
        }
      }),
      this.#o.repositionInputs && window.visualViewport
        ? on(window.visualViewport as unknown as HTMLElement, 'resize', this.#onVisualViewportChange)
        : noop,
    );
  }

  /** Modal-only effects: scroll lock, inert outside, focus trap, outside press. */
  #applyModalEffects(initialFocus: boolean): Cleanup {
    const o = this.#o;
    const isTop = () => isTopLayer(this.#layer);

    const cleanups: Cleanup[] = [];
    if (o.modal) {
      if (o.lockScroll) cleanups.push(lockScroll());
      if (o.inert) cleanups.push(inertOthers([this.content, this.overlay].filter(Boolean) as HTMLElement[]));
      if (o.closeOnOutsidePress) cleanups.push(on(document, 'pointerdown', this.#onDocumentPointerDown, true));
      if (o.trapFocus) {
        cleanups.push(
          on(document, 'keydown', (e) => isTop() && this.#trapTab(e)),
          on(document, 'focusin', (e) => {
            if (!(e.target instanceof Node) || !this.#state.open || this.content.contains(e.target) || !isTop()) return;
            focus(this.#lastFocusedInside?.isConnected ? this.#lastFocusedInside : this.content);
          }),
        );
      }
    }

    if (initialFocus) {
      const target = o.autoFocus ? (getTabbables(this.content)[0] ?? this.content) : this.content;
      if (o.modal || o.autoFocus) focus(target);
    }

    return () => {
      cleanups.forEach((c) => c());
      if (!initialFocus) return;
      const active = document.activeElement;
      const focusInside = !active || active === document.body || this.content.contains(active);
      if (o.restoreFocus && focusInside && this.#returnFocus?.isConnected) focus(this.#returnFocus);
    };
  }

  #trapTab(e: KeyboardEvent) {
    if (e.key !== 'Tab' || !this.#state.open) return;
    const tabbables = getTabbables(this.content);
    if (!tabbables.length) {
      e.preventDefault();
      focus(this.content);
      return;
    }
    const first = tabbables[0];
    const last = tabbables[tabbables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === this.content)) {
      e.preventDefault();
      focus(last);
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      focus(first);
    }
  }

  #onDocumentPointerDown = (e: PointerEvent) => {
    const target = e.target;
    if (!(target instanceof Node) || !this.#state.open || this.content.contains(target)) return;
    if (!isTopLayer(this.#layer) || isInHigherLayer(this.#layer, target)) return;
    this.#keyboardOpen = false;
    // On touch, wait for the click so starting a scroll outside does not dismiss.
    if (e.pointerType === 'touch') {
      on(document, 'click', () => this.#requestOpenChange(false, 'outside'), { once: true, capture: true });
    } else {
      this.#requestOpenChange(false, 'outside');
    }
  };

  #onContentClick = (e: MouseEvent) => {
    const close = e.target instanceof Element ? e.target.closest('[data-zupf-close]') : null;
    if (close && close.closest('[data-zupf-content]') === this.content) this.close('close-button');
  };

  // ───────────────────────────── positioning / snap points ─────────────────────────────

  #transition(prop: 'transform' | 'opacity') {
    return `${prop} ${this.#o.duration}ms ${this.#o.easing}`;
  }

  #containerSize() {
    if (this.container) {
      const r = this.container.getBoundingClientRect();
      return { width: r.width, height: r.height };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  }

  #computeSnapOffsets() {
    const points = this.#o.snapPoints;
    this.#snapOffsets = points?.length ? getSnapOffsets(points, this.#o.direction, this.#containerSize()) : [];
  }

  get #hasSnapPoints() {
    return !!this.#o.snapPoints?.length;
  }

  get #fadeFromIndex() {
    return this.#o.fadeFromIndex ?? 0;
  }

  /** Translate (px) at which the sheet is fully off-screen. */
  #closedOffset(): number {
    const size = this.#containerSize();
    return directionSign(this.#o.direction) * (isVertical(this.#o.direction) ? size.height : size.width);
  }

  #initialSnapIndex(): number | null {
    const points = this.#o.snapPoints;
    if (!points?.length) return null;
    const i = this.#o.activeSnapPoint != null ? points.indexOf(this.#o.activeSnapPoint) : 0;
    return i === -1 ? 0 : i;
  }

  #setActiveIndex(index: number | null) {
    const points = this.#o.snapPoints;
    const prev = this.#state.activeSnapPointIndex;
    this.#emit({ activeSnapPointIndex: index, activeSnapPoint: index == null ? null : (points?.[index] ?? null) });
    this.#syncSnapState();
    if (index != null && index !== prev && points) this.#o.onSnapPointChange?.(points[index], index);
  }

  #syncSnapState() {
    const offset =
      this.#state.activeSnapPointIndex != null ? this.#snapOffsets[this.#state.activeSnapPointIndex] : null;
    if (offset != null) this.content.style.setProperty('--snap-point-offset', `${offset}px`);
    else this.content.style.removeProperty('--snap-point-offset');
  }

  /** Move to the resting position for the current state. */
  #settle(animate: boolean) {
    if (this.#hasSnapPoints) {
      this.#snapTo(this.#state.activeSnapPointIndex ?? 0, animate);
      return;
    }
    css(this.content, {
      transition: animate ? this.#transition('transform') : 'none',
      transform: translate(this.#o.direction, 0),
    });
    this.#setOverlayOpacity(1, animate);
  }

  #setOverlayOpacity(opacity: number, animate: boolean) {
    css(this.overlay, {
      transition: animate ? this.#transition('opacity') : 'none',
      opacity: String(opacity),
      'pointer-events': opacity === 0 ? 'none' : '',
    });
  }

  #snapTo(index: number, animate = true) {
    const offset = this.#snapOffsets[index];
    if (offset === undefined) return;
    if (index === this.#snapOffsets.length - 1) this.#openTime = performance.now();
    css(this.content, {
      transition: animate ? this.#transition('transform') : 'none',
      transform: translate(this.#o.direction, offset),
    });
    this.#setOverlayOpacity(overlayOpacityAt(index, this.#fadeFromIndex, this.#snapOffsets.length), animate);
    this.#setActiveIndex(index);
  }

  #onResize = () => {
    this.#computeSnapOffsets();
    this.#syncSnapState();
    if (this.#state.open && !this.#closing && !this.#gesture.pressed && this.#hasSnapPoints) this.#settle(true);
  };

  // ───────────────────────────── pointer handling ─────────────────────────────

  #canStartDrag = (e: PointerEvent & { target: Element }): boolean => {
    const o = this.#o;
    // No-drag areas behave like regular content (text selection, native gestures).
    if (!o.handleOnly && e.target.closest('[data-zupf-no-drag]')) return false;
    if (!this.#state.open || this.#closing) return false;
    return o.dismissible || this.#hasSnapPoints;
  };

  #onDragStart = () => {
    const rect = this.content.getBoundingClientRect();
    this.#sheetSize = isVertical(this.#o.direction) ? rect.height : rect.width;
    this.#draggedThisPress = false;
    this.#updatePreventScroll();
    // iOS doesn't fire pointerup after a native scroll; reset on touchend.
    if (isIOS()) window.addEventListener('touchend', () => (this.#allowedToDrag = false), { once: true });
  };

  #shouldDrag(el: Element, towardsOpen: boolean): boolean {
    const o = this.#o;
    const custom = o.shouldDrag?.(el, this);
    if (typeof custom === 'boolean') return custom;

    const swipeAmount = getTranslate(this.content, o.direction);
    const now = performance.now();

    if (el.tagName === 'SELECT') return false;
    if (el.closest?.('[data-zupf-no-drag]')) return false;
    if (!isVertical(o.direction)) return true;
    // Allow scrolling right after opening / reaching the last snap point.
    if (now - this.#openTime < 500) return false;
    if (swipeAmount !== null && (o.direction === 'bottom' ? swipeAmount > 0 : swipeAmount < 0)) return true;
    if (window.getSelection()?.toString()) return false;
    if (now - this.#lastTimeDragPrevented < o.scrollLockTimeout && swipeAmount === 0) {
      this.#lastTimeDragPrevented = now;
      return false;
    }
    if (towardsOpen) {
      // Dragging towards open while fully open → let the content scroll instead.
      this.#lastTimeDragPrevented = now;
      return false;
    }

    // Don't drag if any scrollable ancestor (up to the sheet) is scrolled away from the top.
    if (isScrolledAway(el, this.content)) {
      this.#lastTimeDragPrevented = performance.now();
      return false;
    }
    return true;
  }

  #drag(e: PointerEvent, draggedDistance: number) {
    const o = this.#o;
    const { content, overlay, wrapper } = this;
    const sign = directionSign(o.direction);
    const towardsOpen = draggedDistance > 0;
    const snap = this.#hasSnapPoints;
    const activeIndex = this.#state.activeSnapPointIndex;

    const blockClose = snap && !o.dismissible && !towardsOpen;
    if (blockClose && activeIndex === 0) return;

    const absDragged = Math.abs(draggedDistance);
    let progress = absDragged / (this.#sheetSize || 1);
    const snapProgress =
      snap && activeIndex != null
        ? snapFadeProgress({
            offsets: this.#snapOffsets,
            activeIndex,
            fadeFromIndex: this.#fadeFromIndex,
            absDraggedDistance: absDragged,
            towardsOpen,
            closedOffset: this.#closedOffset(),
          })
        : null;
    if (snapProgress !== null) progress = snapProgress;
    if (blockClose && progress >= 1) return;

    if (!this.#allowedToDrag && !(e.target instanceof Element && this.#shouldDrag(e.target, towardsOpen))) return;
    if (!this.#allowedToDrag) {
      this.#allowedToDrag = true;
      this.#draggedThisPress = true;
      content.setAttribute('data-dragging', '');
      this.#emit({ dragging: true });
    }
    // Direct writes: this runs on every pointermove, so skip the helper's per-call allocations.
    content.style.transition = 'none';
    if (overlay) overlay.style.transition = 'none';

    if (snap) this.#dragSnapPoints(draggedDistance);

    if (towardsOpen && !snap) {
      const value = Math.min(-o.rubberband(draggedDistance), 0) * sign;
      content.style.transform = translate(o.direction, value);
      return;
    }

    o.onDrag?.(e, progress);
    const fade = !snap || activeIndex === this.#fadeFromIndex || activeIndex === this.#fadeFromIndex - 1;
    if (fade) {
      if (this.parent) this.parent.#onNestedDrag(progress);
      if (overlay) overlay.style.opacity = String(1 - progress);
    }

    if (wrapper && this.#scaleOptions && this.#wrapperOriginal !== null) {
      css(wrapper, { ...this.#wrapperStyles(Math.min(Math.max(progress, 0), 1)), transition: 'none' });
    }

    if (!snap) content.style.transform = translate(o.direction, absDragged * sign);
  }

  #dragSnapPoints(draggedDistance: number) {
    const i = this.#state.activeSnapPointIndex;
    if (i == null) return;
    const d = this.#o.direction;
    const active = this.#snapOffsets[i];
    const value = directionSign(d) === 1 ? active - draggedDistance : active + draggedDistance;
    const lastOffset = this.#snapOffsets[this.#snapOffsets.length - 1];
    // Don't drag past the largest snap point.
    if (directionSign(d) === 1 ? value < lastOffset : value > lastOffset) return;
    this.content.style.transform = translate(d, value);
  }

  #cancelDrag() {
    if (!this.#gesture.pressed) return;
    this.#gesture.cancel();
    this.#stopDragging();
  }

  #stopDragging() {
    this.content.removeAttribute('data-dragging');
    this.#allowedToDrag = false;
    this.#emit({ dragging: false });
    this.#updatePreventScroll();
  }

  #release(e: PointerEvent | null, { distance: draggedDistance, velocity }: DragEnd) {
    const o = this.#o;

    if (velocity > 0.05) {
      // Prevent focusing an input right after a flick (keeps iOS scroll prevention off briefly).
      this.#justReleased = true;
      this.#timers.set(
        'justReleased',
        () => {
          this.#justReleased = false;
          this.#updatePreventScroll();
        },
        200,
      );
    }
    this.#stopDragging();

    const swipeAmount = getTranslate(this.content, o.direction);
    if (
      !e ||
      !(e.target instanceof Element) ||
      !this.#shouldDrag(e.target, false) ||
      !swipeAmount ||
      Number.isNaN(swipeAmount)
    )
      return;

    if (this.#hasSnapPoints) {
      const result = resolveSnapRelease({
        offsets: this.#snapOffsets,
        activeIndex: this.#state.activeSnapPointIndex ?? 0,
        draggedDistance,
        velocity,
        direction: o.direction,
        dismissible: o.dismissible,
        sequential: o.snapToSequentialPoint,
        velocityThreshold: o.velocityThreshold,
        flickVelocity: o.flickVelocity,
        viewport: isVertical(o.direction) ? window.innerHeight : window.innerWidth,
      });
      if (result.type === 'close') this.#requestOpenChange(false, 'drag');
      else if (result.type === 'snap') this.#snapTo(result.index);
      o.onRelease?.(e, true);
      if (this.parent) this.parent.#onNestedRelease(true);
      return;
    }

    const rect = this.content.getBoundingClientRect();
    const result = resolveRelease({
      swipeAmount,
      draggedDistance,
      velocity,
      velocityThreshold: o.velocityThreshold,
      closeThreshold: o.closeThreshold,
      sheetSize: isVertical(o.direction)
        ? Math.min(rect.height, window.innerHeight)
        : Math.min(rect.width, window.innerWidth),
    });

    if (result.type === 'close') {
      this.#requestOpenChange(false, 'drag');
      o.onRelease?.(e, false);
      if (this.parent) this.parent.#onNestedRelease(false);
    } else {
      this.#resetPosition(swipeAmount);
      o.onRelease?.(e, true);
      if (this.parent) this.parent.#onNestedRelease(true);
    }
  }

  #resetPosition(swipeAmount: number) {
    css(this.content, { transform: translate(this.#o.direction, 0), transition: this.#transition('transform') });
    this.#setOverlayOpacity(1, true);
    // Don't re-apply the background scale if the sheet was pulled towards open.
    if (this.#scaleOptions && swipeAmount * directionSign(this.#o.direction) > 0 && this.#state.open) {
      css(this.wrapper, { ...this.#wrapperStyles(0), transition: this.#wrapperTransition() });
    }
  }

  // ───────────────────────────── handle ─────────────────────────────

  #onHandleClick = () => {
    if (!this.#o.handleCycle) return;
    if (this.#cancelHandleTap || this.#draggedThisPress) {
      this.#cancelHandleInteraction();
      return;
    }
    this.#timers.set('handleCycle', () => this.#cycleSnapPoints(), DOUBLE_TAP_TIMEOUT);
  };

  #cancelHandleInteraction = () => {
    this.#timers.clear('handleLongPress');
    this.#cancelHandleTap = false;
  };

  #cycleSnapPoints() {
    if (this.#state.dragging || this.#cancelHandleTap) {
      this.#cancelHandleInteraction();
      return;
    }
    this.#cancelHandleInteraction();
    const points = this.#o.snapPoints;
    if (!points?.length || !this.#state.open) return;
    const i = this.#state.activeSnapPointIndex ?? 0;
    if (i === points.length - 1) {
      if (this.#o.dismissible) this.#requestOpenChange(false, 'handle');
      return;
    }
    this.#snapTo(i + 1);
  }

  // ───────────────────────────── nested sheets ─────────────────────────────

  #nestedTransform(scale: number, offset: number) {
    return `scale(${scale}) ${translate(this.#o.direction, offset)}`;
  }

  #onNestedOpenChange(open: boolean) {
    const d = this.#o.nestedDisplacement;
    const scale = open ? (window.innerWidth - d) / window.innerWidth : 1;
    const offset = open ? -d : 0;
    this.#timers.clear('nested');
    css(this.content, { transition: this.#transition('transform'), transform: this.#nestedTransform(scale, offset) });
    if (!open) {
      this.#timers.set(
        'nested',
        () => {
          if (!this.#state.open) return;
          const value = getTranslate(this.content, this.#o.direction) ?? 0;
          css(this.content, { transition: 'none', transform: translate(this.#o.direction, value) });
          // Snap sheets rest at an offset; restore it.
          if (this.#hasSnapPoints) this.#settle(false);
        },
        this.#o.duration,
      );
    }
  }

  #onNestedDrag(progress: number) {
    if (progress < 0) return;
    const d = this.#o.nestedDisplacement;
    const initial = (window.innerWidth - d) / window.innerWidth;
    css(this.content, {
      transition: 'none',
      transform: this.#nestedTransform(initial + progress * (1 - initial), -d + progress * d),
    });
  }

  #onNestedRelease(open: boolean) {
    if (!open) return;
    const d = this.#o.nestedDisplacement;
    const dim = isVertical(this.#o.direction) ? window.innerHeight : window.innerWidth;
    css(this.content, {
      transition: this.#transition('transform'),
      transform: this.#nestedTransform((dim - d) / dim, -d),
    });
  }

  // ───────────────────────────── scale background ─────────────────────────────

  /** Resolved scale options, cached per `scaleBackground` value: read on every pointermove while dragging. */
  #scaleCache: { source: unknown; value: Required<ScaleBackgroundOptions> } | null = null;

  get #scaleOptions(): Required<ScaleBackgroundOptions> | null {
    const s = this.#o.scaleBackground;
    if (!s) return null;
    if (this.#scaleCache?.source !== s) {
      this.#scaleCache = { source: s, value: { ...SCALE_DEFAULTS, ...(s === true ? {} : stripUndefined(s)) } };
    }
    return this.#scaleCache.value;
  }

  #scale() {
    const offset = this.#scaleOptions?.offset ?? SCALE_DEFAULTS.offset;
    return (window.innerWidth - offset) / window.innerWidth;
  }

  /**
   * Wrapper styles for a given progress: 0 = fully scaled back (sheet open), 1 = untouched.
   * The wrapper is clipped to the part that is visible in the viewport and scaled around its top,
   * so it works for long, scrolled pages. No `overflow` is set, which keeps `position: sticky`
   * descendants (headers, sidebars) where they are.
   */
  #wrapperStyles(progress: number): Record<string, string> {
    const s = this.#scaleOptions!;
    const { top, bottom, height } = this.#wrapperViewport;
    const direction = this.#o.direction;
    const base = this.#scale();
    const scale = base + progress * (1 - base);
    const shift = (1 - progress) * s.translate;
    // The page recedes away from the sheet: it is anchored to the screen edge opposite the sheet
    // and pushed off that edge, so a strip of background shows there (like iOS).
    const sign = directionSign(direction);
    const farEdge = OPPOSITE_EDGE[direction];
    // Safe-area offset only at rest; while dragging it would jump.
    const offset = progress === 0 ? `calc(env(safe-area-inset-${farEdge}) + ${shift}px)` : `${shift}px`;
    const origin = {
      bottom: `50% ${top}px`,
      top: `50% ${top + height}px`,
      right: `0 ${top + height / 2}px`,
      left: `100% ${top + height / 2}px`,
    }[direction];
    return {
      transformOrigin: origin,
      transform: `scale(${scale}) ${translate(direction, sign === 1 ? offset : `calc(-1 * ${offset})`)}`,
      clipPath: `inset(${top}px 0 ${bottom}px 0 round ${(1 - progress) * s.radius}px)`,
    };
  }

  #wrapperTransition(): string {
    const timing = `${this.#o.duration}ms ${this.#o.easing}`;
    return `transform ${timing}, clip-path ${timing}`;
  }

  #applyScaleBackground() {
    const s = this.#scaleOptions;
    const wrapper = this.wrapper;
    if (!s || !wrapper) return;
    this.#timers.clear('wrapper');

    if (s.background && !this.#o.noBodyStyles) {
      if (this.#bodyBgOriginal === null) this.#bodyBgOriginal = document.body.style.background;
      document.body.style.background = s.background;
    }

    const reopening = this.#wrapperOriginal !== null;
    if (!reopening) {
      this.#wrapperOriginal = wrapper.style.cssText;
      const rect = wrapper.getBoundingClientRect();
      const top = Math.max(0, -rect.top);
      const visibleBottom = Math.min(rect.height, window.innerHeight - rect.top);
      this.#wrapperViewport = { top, bottom: Math.max(0, rect.height - visibleBottom), height: visibleBottom - top };
      // Start from the unscaled state so the clip-path radius can transition in.
      css(wrapper, { ...this.#wrapperStyles(1), transition: 'none' });
      wrapper.getBoundingClientRect(); // force reflow
    }
    css(wrapper, { ...this.#wrapperStyles(0), transition: this.#wrapperTransition() });
  }

  #restoreWrapper(immediate: boolean) {
    const wrapper = this.wrapper;
    const finish = () => {
      if (wrapper && this.#wrapperOriginal !== null) wrapper.style.cssText = this.#wrapperOriginal;
      this.#wrapperOriginal = null;
      if (this.#bodyBgOriginal !== null) {
        if (this.#bodyBgOriginal) document.body.style.background = this.#bodyBgOriginal;
        else document.body.style.removeProperty('background');
        this.#bodyBgOriginal = null;
      }
    };
    if (immediate || !wrapper || this.#wrapperOriginal === null) return finish();
    css(wrapper, { ...this.#wrapperStyles(1), transition: this.#wrapperTransition() });
    this.#timers.set('wrapper', finish, this.#o.duration);
  }

  // ───────────────────────────── keyboard / iOS ─────────────────────────────

  #updatePreventScroll() {
    const o = this.#o;
    const enabled =
      this.#state.open &&
      !this.#gesture.pressed &&
      o.modal &&
      !this.#justReleased &&
      this.#hasBeenOpened &&
      o.repositionInputs;
    if (enabled && !this.#releasePreventScroll) this.#releasePreventScroll = preventScroll();
    else if (!enabled && this.#releasePreventScroll) {
      this.#releasePreventScroll();
      this.#releasePreventScroll = null;
    }
  }

  /** Keep focused inputs above the virtual keyboard. */
  #onVisualViewportChange = () => {
    const content = this.content;
    const o = this.#o;
    if (!o.repositionInputs || !this.#state.open) return;
    if (!isInput(document.activeElement) && !this.#keyboardOpen) return;

    const viewportHeight = window.visualViewport?.height || 0;
    const totalHeight = window.innerHeight;
    let diffFromInitial = totalHeight - viewportHeight;
    const rect = content.getBoundingClientRect();
    const sheetHeight = rect.height || 0;
    const isTallEnough = sheetHeight > totalHeight * 0.8;
    if (!this.#initialSheetHeight) this.#initialSheetHeight = sheetHeight;
    const offsetFromTop = rect.top;

    // Small viewport changes (e.g. keyboard suggestions bar) shouldn't toggle the keyboard state.
    if (Math.abs(this.#previousDiffFromInitial - diffFromInitial) > 60) this.#keyboardOpen = !this.#keyboardOpen;

    const i = this.#state.activeSnapPointIndex;
    if (this.#hasSnapPoints && i) diffFromInitial += this.#snapOffsets[i] || 0;
    this.#previousDiffFromInitial = diffFromInitial;
    this.#styledForKeyboard = true;

    if (sheetHeight > viewportHeight || this.#keyboardOpen) {
      let newHeight = sheetHeight;
      if (sheetHeight > viewportHeight)
        newHeight = viewportHeight - (isTallEnough ? offsetFromTop : SCALE_DEFAULTS.offset);
      content.style.height = o.fixed
        ? `${sheetHeight - Math.max(diffFromInitial, 0)}px`
        : `${Math.max(newHeight, viewportHeight - offsetFromTop)}px`;
    } else if (!isMobileFirefox()) {
      content.style.height = `${this.#initialSheetHeight}px`;
    }

    content.style.bottom = this.#hasSnapPoints && !this.#keyboardOpen ? '0px' : `${Math.max(diffFromInitial, 0)}px`;
  };
}

export function createSheet(options: SheetOptions): Sheet {
  return new Sheet(options);
}
