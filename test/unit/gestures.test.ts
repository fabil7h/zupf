import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { createGestures, parsePattern, type Gestures, type GesturesOptions } from '../../src';
import { matchPattern } from '../../src/gestures/pattern';

describe('parsePattern', () => {
  it('parses steps, combos and aliases', () => {
    expect(parsePattern('tap')).toEqual([['tap']]);
    expect(parsePattern('double-tap')).toEqual([['tap'], ['tap']]);
    expect(parsePattern('triple-tap')).toEqual([['tap'], ['tap'], ['tap']]);
    expect(parsePattern('long-press')).toEqual([['hold']]);
    expect(parsePattern('  tap   hold+swipe-up ')).toEqual([['tap'], ['hold', 'swipe-up']]);
    expect(parsePattern(['double-tap', 'hold+swipe'])).toEqual([['tap'], ['tap'], ['hold', 'swipe']]);
  });

  it('rejects invalid patterns', () => {
    expect(() => parsePattern('')).toThrow(/empty/);
    expect(() => parsePattern('tap tapp')).toThrow(/unknown gesture token "tapp"/);
    expect(() => parsePattern('swipe-north')).toThrow(/unknown/);
    expect(() => parsePattern('tap+hold')).toThrow(/can't be combined/);
  });

  it('treats names from Object.prototype as unknown tokens', () => {
    for (const word of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      expect(() => parsePattern(word)).toThrow(/unknown gesture token/);
    }
  });

  it('rejects patterns that can never match', () => {
    expect(() => parsePattern('swipe-up+hold')).toThrow(/"hold" must come first/);
    expect(() => parsePattern('swipe+hold')).toThrow(/"hold" must come first/);
    expect(() => parsePattern('hold+hold')).toThrow(/"hold" (must come first|twice)/);
    expect(() => parsePattern('swipe-up+swipe-up')).toThrow(/same direction/);
    expect(() => parsePattern('hold+swipe-left+swipe-left')).toThrow(/same direction/);
  });

  it('accepts turns, reversals and generic swipes', () => {
    expect(parsePattern('swipe-up+swipe-left')).toEqual([['swipe-up', 'swipe-left']]);
    expect(parsePattern('swipe-up+swipe-down')).toEqual([['swipe-up', 'swipe-down']]);
    expect(parsePattern('swipe+swipe')).toEqual([['swipe', 'swipe']]);
    expect(parsePattern('swipe-up+swipe')).toEqual([['swipe-up', 'swipe']]);
  });
});

describe('matchPattern', () => {
  const p = parsePattern;
  it('matches between presses', () => {
    expect(matchPattern(p('tap tap'), [['tap']], null)).toBe('partial');
    expect(matchPattern(p('tap tap'), [['tap'], ['tap']], null)).toBe('complete');
    expect(matchPattern(p('tap'), [['tap'], ['tap']], null)).toBe('none');
    expect(matchPattern(p('tap'), [['hold']], null)).toBe('none');
  });

  it('matches during a press', () => {
    expect(matchPattern(p('hold+swipe-up'), [], [])).toBe('partial');
    expect(matchPattern(p('hold+swipe-up'), [], ['hold'])).toBe('partial');
    expect(matchPattern(p('hold+swipe-up'), [], ['hold', 'swipe-up'])).toBe('complete');
    expect(matchPattern(p('hold+swipe-up'), [], ['swipe-up'])).toBe('none');
    expect(matchPattern(p('tap hold'), [['tap']], ['hold'])).toBe('complete');
  });

  it('`swipe` matches any direction', () => {
    expect(matchPattern(p('hold+swipe'), [], ['hold', 'swipe-left'])).toBe('complete');
    expect(matchPattern(p('swipe'), [], ['hold'])).toBe('none');
  });
});

const pointer = (type: string, x = 50, y = 50, init: PointerEventInit = {}) =>
  new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType: 'touch',
    isPrimary: true,
    clientX: x,
    clientY: y,
    ...init,
  });

const child = () => document.getElementById('child')!;
const down = (x = 50, y = 50) => child().dispatchEvent(pointer('pointerdown', x, y));
const move = (x: number, y: number) => child().dispatchEvent(pointer('pointermove', x, y));
const up = (x = 50, y = 50) => child().dispatchEvent(pointer('pointerup', x, y));
const tap = () => {
  down();
  vi.advanceTimersByTime(50);
  up();
};
const menu = () => {
  const ev = new Event('contextmenu', { bubbles: true, cancelable: true });
  child().dispatchEvent(ev);
  return ev.defaultPrevented;
};
const hold = () => {
  down();
  vi.advanceTimersByTime(500);
};

describe('Gestures', () => {
  let g: Gestures | undefined;
  let el: HTMLElement;

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    g?.destroy();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  function mount(opts: Partial<GesturesOptions> = {}) {
    document.body.innerHTML = `<div id="area"><span id="child">x</span></div>`;
    el = document.getElementById('area')!;
    g = createGestures({ target: el, swipeDistance: 30, ...opts });
    return g;
  }

  it('fires a tap immediately when nothing longer is bound', () => {
    const fn = vi.fn();
    mount().on('tap', fn);
    tap();
    expect(fn).toHaveBeenCalledOnce();
    expect(fn.mock.calls[0][0]).toMatchObject({ gesture: 'tap', steps: [['tap']], direction: null });
    expect(fn.mock.calls[0][0].target).toBe(child());
  });

  it('tells tap, double and triple tap apart', () => {
    const tap1 = vi.fn();
    const tap2 = vi.fn();
    const tap3 = vi.fn();
    mount({ gestures: { tap: tap1, 'double-tap': tap2, 'triple-tap': tap3 } });

    tap();
    expect(tap1).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(tap1).toHaveBeenCalledOnce();

    tap();
    vi.advanceTimersByTime(100);
    tap();
    vi.advanceTimersByTime(300);
    expect(tap2).toHaveBeenCalledOnce();
    expect(tap2.mock.calls[0][0].gesture).toBe('tap tap');

    tap();
    tap();
    tap();
    // Nothing longer than a triple tap is bound: fires on release.
    expect(tap3).toHaveBeenCalledOnce();
    expect(tap1).toHaveBeenCalledOnce();
    expect(tap2).toHaveBeenCalledOnce();
  });

  it('presses too far apart start a new sequence', () => {
    const tap1 = vi.fn();
    const tap2 = vi.fn();
    mount({ gestures: { tap: tap1, 'tap tap': tap2 } });
    tap();
    vi.advanceTimersByTime(400);
    tap();
    vi.advanceTimersByTime(400);
    expect(tap1).toHaveBeenCalledTimes(2);
    expect(tap2).not.toHaveBeenCalled();
  });

  it('fires a long press while still held', () => {
    const fn = vi.fn();
    mount().on('long-press', fn);
    hold();
    expect(fn).toHaveBeenCalledOnce();
    expect(el.hasAttribute('data-holding')).toBe(true);
    up();
    expect(el.hasAttribute('data-holding')).toBe(false);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('moving cancels the hold', () => {
    const fn = vi.fn();
    mount().on('hold', fn);
    down();
    move(50, 70);
    vi.advanceTimersByTime(600);
    expect(fn).not.toHaveBeenCalled();
  });

  it('recognizes swipes in four directions', () => {
    const fn = vi.fn();
    mount().on('swipe', fn);
    for (const [dx, dy, dir] of [
      [0, -40, 'up'],
      [0, 40, 'down'],
      [-40, 5, 'left'],
      [40, -5, 'right'],
    ] as const) {
      down();
      move(50 + dx / 2, 50 + dy / 2);
      move(50 + dx, 50 + dy);
      up(50 + dx, 50 + dy);
      expect(fn).toHaveBeenLastCalledWith(expect.objectContaining({ direction: dir, steps: [[`swipe-${dir}`]] }));
    }
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('hold then swipe, and plain hold, on the same element', () => {
    const holdFn = vi.fn();
    const upFn = vi.fn();
    const any = vi.fn();
    mount({ gestures: { hold: holdFn, 'hold+swipe-up': upFn, 'hold+swipe': any } });

    hold();
    expect(holdFn).not.toHaveBeenCalled(); // a swipe may still follow
    move(50, 10);
    expect(upFn).toHaveBeenCalledOnce();
    expect(any).toHaveBeenCalledOnce();
    expect(any.mock.calls[0][0].direction).toBe('up');
    up(50, 10);
    expect(holdFn).not.toHaveBeenCalled();

    hold();
    up();
    expect(holdFn).toHaveBeenCalledOnce();
  });

  it('without a hold binding, a long press is no hold: still a tap, or a swipe', () => {
    const tapFn = vi.fn();
    const swipeFn = vi.fn();
    mount({ gestures: { tap: tapFn, 'swipe-left': swipeFn } });
    hold();
    expect(el.hasAttribute('data-holding')).toBe(false);
    up();
    expect(tapFn).toHaveBeenCalledOnce();
    hold();
    move(10, 50);
    expect(swipeFn).toHaveBeenCalledOnce();
    expect(swipeFn.mock.calls[0][0].steps).toEqual([['swipe-left']]);
  });

  it('uses swipeDistance 50 by default', () => {
    const fn = vi.fn();
    g = createGestures({
      target: ((document.body.innerHTML = '<div id="area"></div>'), '#area'),
      gestures: { swipe: fn },
    });
    const area = document.getElementById('area')!;
    area.dispatchEvent(pointer('pointerdown', 100, 50));
    area.dispatchEvent(pointer('pointermove', 60, 50));
    expect(fn).not.toHaveBeenCalled();
    area.dispatchEvent(pointer('pointermove', 50, 50));
    expect(fn).toHaveBeenCalledOnce();
  });

  it('a short drag (past slop, below swipe distance) matches nothing', () => {
    const fn = vi.fn();
    mount({ gestures: { tap: fn, swipe: fn } });
    down();
    move(50, 65);
    up(50, 65);
    vi.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();
  });

  it('records direction changes within a press', () => {
    const fn = vi.fn();
    mount().on('swipe-down+swipe-right', fn);
    down();
    move(50, 90);
    move(50, 120); // further down: same token
    move(90, 122);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn.mock.calls[0][0].steps).toEqual([['swipe-down', 'swipe-right']]);
  });

  it('runs a custom flow and reports progress', () => {
    const fn = vi.fn();
    const states: string[] = [];
    mount().on('tap tap hold+swipe-left', fn);
    g!.subscribe((s) => states.push(`${s.pressed ? 'P' : '-'} ${s.steps.map((x) => x.join('+')).join(' ')}`));
    tap();
    tap();
    hold();
    move(10, 50);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn.mock.calls[0][0].steps).toEqual([['tap'], ['tap'], ['hold', 'swipe-left']]);
    expect(states).toEqual([
      '- ',
      'P ',
      '- tap',
      'P tap ',
      '- tap tap',
      'P tap tap ',
      'P tap tap hold',
      'P ', // fired: sequence reset, press continues until release
    ]);
    up(10, 50);
    expect(states.at(-1)).toBe('- ');
  });

  it('a wrong step resets the flow, and the latest press can start it again', () => {
    const fn = vi.fn();
    mount().on('tap hold', fn);
    tap();
    tap(); // 'tap tap' can't match: restart from the second tap
    hold();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('fires what was complete when the next press goes elsewhere', () => {
    const tapFn = vi.fn();
    const holdFn = vi.fn();
    mount({ gestures: { tap: tapFn, 'tap tap': vi.fn(), hold: holdFn } });
    tap();
    hold();
    expect(tapFn).toHaveBeenCalledOnce();
    expect(holdFn).toHaveBeenCalledOnce();
  });

  it('fires the shorter pattern when a longer one stops partway', () => {
    const tap1 = vi.fn();
    const tap3 = vi.fn();
    mount({ gestures: { tap: tap1, 'triple-tap': tap3 } });
    tap();
    vi.advanceTimersByTime(100);
    tap();
    vi.advanceTimersByTime(300);
    expect(tap1).toHaveBeenCalledOnce();
    expect(tap3).not.toHaveBeenCalled();
  });

  it('reset() in a handler fired by a dead end ends the sequence', () => {
    const holdFn = vi.fn();
    const gestures = mount({ gestures: { 'tap tap': vi.fn(), 'tap hold': vi.fn(), hold: holdFn } });
    gestures.on('tap', () => gestures.reset());
    tap();
    down();
    move(50, 120); // swipe: dead end, flushes 'tap', whose handler resets
    up(50, 120);
    expect(gestures.getState().steps).toEqual([]);
    hold();
    expect(holdFn).toHaveBeenCalledOnce();
  });

  it('off(), reset(), disabled and pointercancel', () => {
    const fn = vi.fn();
    const off = mount().on('tap', fn);
    off();
    tap();
    expect(fn).not.toHaveBeenCalled();

    const fn2 = vi.fn();
    g!.on('tap tap', fn2);
    tap();
    g!.reset();
    tap();
    vi.advanceTimersByTime(500);
    expect(fn2).not.toHaveBeenCalled();

    g!.setOptions({ disabled: true });
    tap();
    tap();
    expect(fn2).not.toHaveBeenCalled();
    g!.setOptions({ disabled: false });

    const holdFn = vi.fn();
    g!.on('hold', holdFn);
    down();
    child().dispatchEvent(pointer('pointercancel'));
    vi.advanceTimersByTime(600);
    expect(holdFn).not.toHaveBeenCalled();
    expect(g!.getState()).toEqual({ pressed: false, steps: [] });
  });

  it('ignores a second finger and non-primary mouse buttons', () => {
    const fn = vi.fn();
    mount().on('tap', fn);
    down();
    child().dispatchEvent(pointer('pointerdown', 80, 80, { pointerId: 2, isPrimary: false }));
    up();
    expect(fn).not.toHaveBeenCalled();
    child().dispatchEvent(pointer('pointerdown', 50, 50, { pointerType: 'mouse', button: 2 }));
    child().dispatchEvent(pointer('pointerup', 50, 50, { pointerType: 'mouse', button: 2 }));
    expect(fn).not.toHaveBeenCalled();
  });

  it('swallows the click after a mouse hold', () => {
    const clicked = vi.fn();
    mount().on('hold', vi.fn());
    child().addEventListener('click', clicked);
    child().dispatchEvent(pointer('pointerdown', 50, 50, { pointerType: 'mouse' }));
    vi.advanceTimersByTime(500);
    child().dispatchEvent(pointer('pointerup', 50, 50, { pointerType: 'mouse' }));
    child().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(clicked).not.toHaveBeenCalled();
  });

  it('swallows the click after a mouse swipe that fired mid-press', () => {
    const clicked = vi.fn();
    const swiped = vi.fn();
    mount().on('swipe-left', swiped);
    child().addEventListener('click', clicked);
    const mouse = { pointerType: 'mouse' };
    child().dispatchEvent(pointer('pointerdown', 100, 50, mouse));
    child().dispatchEvent(pointer('pointermove', 50, 50, mouse));
    expect(swiped).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(200); // released later than one tick after firing
    child().dispatchEvent(pointer('pointerup', 50, 50, mouse));
    child().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(clicked).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10);
    child().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(clicked).toHaveBeenCalledOnce();
  });

  it('swallows the click after a mouse swipe that a longer pattern may extend', () => {
    const clicked = vi.fn();
    const swiped = vi.fn();
    mount({ gestures: { 'swipe-left': swiped, 'swipe-left swipe-left': vi.fn() } });
    child().addEventListener('click', clicked);
    const mouse = { pointerType: 'mouse' };
    child().dispatchEvent(pointer('pointerdown', 100, 50, mouse));
    child().dispatchEvent(pointer('pointermove', 50, 50, mouse));
    child().dispatchEvent(pointer('pointerup', 50, 50, mouse));
    child().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(clicked).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(swiped).toHaveBeenCalledOnce();
  });

  it('blocks the touch context menu after a long press fired, only when hold is bound', () => {
    const gestures = mount();
    const off = gestures.on('long-press', vi.fn());
    hold();
    vi.advanceTimersByTime(100);
    expect(menu()).toBe(true);
    up();
    off();
    gestures.on('tap', vi.fn());
    hold();
    expect(menu()).toBe(false);
    up();
  });

  describe('mouse released or moved outside the element', () => {
    const mouse = { pointerType: 'mouse' };
    const outside = (type: string, x: number, y: number) => document.body.dispatchEvent(pointer(type, x, y, mouse));

    it('releasing outside ends the press: no stuck state, no late hold', () => {
      const holdFn = vi.fn();
      mount().on('hold', holdFn);
      child().dispatchEvent(pointer('pointerdown', 50, 50, mouse));
      expect(el.hasAttribute('data-pressed')).toBe(true);
      outside('pointerup', 50, 50);
      expect(el.hasAttribute('data-pressed')).toBe(false);
      vi.advanceTimersByTime(600);
      expect(holdFn).not.toHaveBeenCalled();
      expect(g!.getState()).toEqual({ pressed: false, steps: [] });
    });

    it('a swipe that leaves the element before the first move is delivered still counts', () => {
      const fn = vi.fn();
      mount().on('swipe-right', fn);
      child().dispatchEvent(pointer('pointerdown', 50, 50, mouse));
      outside('pointermove', 200, 50);
      expect(fn).toHaveBeenCalledOnce();
      outside('pointerup', 200, 50);
      expect(g!.getState().pressed).toBe(false);
    });

    it('cancelling outside aborts the press', () => {
      mount().on('hold', vi.fn());
      child().dispatchEvent(pointer('pointerdown', 50, 50, mouse));
      outside('pointercancel', 50, 50);
      expect(g!.getState().pressed).toBe(false);
      expect(el.hasAttribute('data-pressed')).toBe(false);
    });

    it('stops listening outside once destroyed', () => {
      const fn = vi.fn();
      mount().on('swipe-right', fn);
      child().dispatchEvent(pointer('pointerdown', 50, 50, mouse));
      g!.destroy();
      outside('pointermove', 200, 50);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('throwing handlers and listeners', () => {
    let reported: ReturnType<typeof vi.fn>;
    beforeEach(() => {
      reported = vi.fn();
      vi.stubGlobal('reportError', reported);
    });
    afterEach(() => vi.unstubAllGlobals());

    it('a throwing handler leaves the sequence consistent and the other handlers run', () => {
      const boom = new Error('boom');
      const after = vi.fn();
      mount().on('tap', () => {
        throw boom;
      });
      g!.on('tap', after);
      g!.on('tap tap', vi.fn());
      tap();
      expect(() => vi.advanceTimersByTime(300)).not.toThrow();
      expect(reported).toHaveBeenCalledWith(boom);
      expect(after).toHaveBeenCalledOnce();
      expect(g!.getState()).toEqual({ pressed: false, steps: [] });
    });

    it('a throwing handler fired on release does not break the next press', () => {
      const fn = vi.fn();
      mount().on('tap', () => {
        throw new Error('boom');
      });
      g!.on('swipe-left', fn);
      expect(() => tap()).not.toThrow();
      expect(reported).toHaveBeenCalledOnce();
      down(100, 50);
      move(50, 50);
      expect(fn).toHaveBeenCalledOnce();
    });

    it('a throwing subscriber does not stop the others', () => {
      const boom = new Error('boom');
      const seen = vi.fn();
      mount().on('tap tap', vi.fn());
      g!.subscribe((s) => {
        if (s.pressed) throw boom;
      });
      g!.subscribe(seen);
      seen.mockClear();
      expect(() => down()).not.toThrow();
      expect(reported).toHaveBeenCalledWith(boom);
      expect(seen).toHaveBeenCalledWith(expect.objectContaining({ pressed: true }));
    });
  });

  it('an invalid pattern in the options leaves the element untouched', () => {
    document.body.innerHTML = `<div id="area"></div>`;
    el = document.getElementById('area')!;
    expect(() => createGestures({ target: el, gestures: { 'double-tap': vi.fn(), 'tap tapp': vi.fn() } })).toThrow(
      /unknown gesture token/,
    );
    expect(el.hasAttribute('data-zupf-gestures')).toBe(false);
    expect(el.getAttribute('style') ?? '').toBe('');
  });

  it('reset() and disabled mid-press stop the hold from happening', () => {
    const holdFn = vi.fn();
    mount().on('long-press', holdFn);
    down();
    g!.reset();
    vi.advanceTimersByTime(600);
    expect(holdFn).not.toHaveBeenCalled();
    expect(el.hasAttribute('data-holding')).toBe(false);
    up();

    down();
    g!.setOptions({ disabled: true });
    vi.advanceTimersByTime(600);
    expect(el.hasAttribute('data-holding')).toBe(false);
    up();
    expect(el.hasAttribute('data-pressed')).toBe(false);
  });

  it('a swipe shorter than slop still cancels the hold', () => {
    mount({ slop: 10, swipeDistance: 5 }).on('hold', vi.fn());
    g!.on('swipe-right+swipe-down', vi.fn());
    down();
    move(56, 50);
    vi.advanceTimersByTime(600);
    expect(el.hasAttribute('data-holding')).toBe(false);
    expect(g!.getState().steps).toEqual([['swipe-right']]);
  });

  it('a hold does not clear the selection of a dead press', () => {
    mount().on('hold', vi.fn());
    const spy = vi.spyOn(window, 'getSelection');
    down();
    g!.reset();
    vi.advanceTimersByTime(600);
    expect(spy).not.toHaveBeenCalled();
  });

  it('sets touch defaults from the bindings and restores them', () => {
    mount();
    el.style.setProperty('touch-action', 'pan-y');
    el.style.setProperty('user-select', 'text', 'important');
    const off = g!.on('swipe-left', vi.fn());
    expect(el.style.getPropertyValue('touch-action')).toBe('pan-y pinch-zoom');
    g!.on('hold+swipe-up', vi.fn()); // after a hold: doesn't block scrolling
    expect(el.style.getPropertyValue('touch-action')).toBe('pan-y pinch-zoom');
    expect(el.style.getPropertyValue('user-select')).toBe('none');
    g!.on('swipe-down', vi.fn());
    expect(el.style.getPropertyValue('touch-action')).toBe('none');
    off();
    expect(el.style.getPropertyValue('touch-action')).toBe('pan-x pinch-zoom');
    g!.destroy();
    expect(el.style.getPropertyValue('touch-action')).toBe('pan-y');
    expect(el.style.getPropertyValue('user-select')).toBe('text');
    expect(el.style.getPropertyPriority('user-select')).toBe('important');
    expect(el.hasAttribute('data-zupf-gestures')).toBe(false);
  });
});
