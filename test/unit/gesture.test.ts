import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { DragGesture, isScrolledAway } from '../../src/core';

const pointer = (type: string, init: PointerEventInit = {}) =>
  new PointerEvent(type, { bubbles: true, pointerId: 1, pointerType: 'mouse', ...init });

describe('DragGesture', () => {
  let gesture: DragGesture | undefined;
  afterEach(() => {
    gesture?.destroy();
    document.body.innerHTML = '';
  });

  function setup(direction: 'top' | 'bottom' | 'left' | 'right' = 'bottom', canStart?: () => boolean) {
    const el = document.createElement('div');
    const child = document.createElement('span');
    el.append(child);
    document.body.append(el);
    const onStart = vi.fn();
    const onMove = vi.fn();
    const onEnd = vi.fn();
    gesture = new DragGesture(el, { direction: () => direction, canStart, onStart, onMove, onEnd });
    return { el, child, onStart, onMove, onEnd };
  }

  it('reports signed distance away from the anchored edge', () => {
    const { child, onStart, onMove, onEnd } = setup('bottom');
    child.dispatchEvent(pointer('pointerdown', { clientX: 50, clientY: 300 }));
    expect(onStart).toHaveBeenCalledOnce();
    expect(gesture!.pressed).toBe(true);
    child.dispatchEvent(pointer('pointermove', { clientX: 50, clientY: 250 }));
    expect(onMove).toHaveBeenLastCalledWith(expect.any(PointerEvent), 50);
    child.dispatchEvent(pointer('pointerup', { clientX: 50, clientY: 200 }));
    expect(onEnd).toHaveBeenCalledWith(expect.any(PointerEvent), { distance: 100, velocity: expect.any(Number) });
    expect(gesture!.pressed).toBe(false);
  });

  it('flips the sign for top-anchored elements (pull down = positive)', () => {
    const { child, onMove } = setup('top');
    child.dispatchEvent(pointer('pointerdown', { clientX: 50, clientY: 100 }));
    child.dispatchEvent(pointer('pointermove', { clientX: 50, clientY: 160 }));
    expect(onMove).toHaveBeenLastCalledWith(expect.any(PointerEvent), 60);
  });

  it('ignores cross-axis gestures', () => {
    const { child, onMove } = setup('bottom');
    child.dispatchEvent(pointer('pointerdown', { clientX: 50, clientY: 300 }));
    child.dispatchEvent(pointer('pointermove', { clientX: 90, clientY: 301 }));
    child.dispatchEvent(pointer('pointermove', { clientX: 90, clientY: 250 }));
    expect(onMove).not.toHaveBeenCalled();
  });

  it('respects canStart and cancel()', () => {
    const blocked = setup('bottom', () => false);
    blocked.child.dispatchEvent(pointer('pointerdown', { clientY: 300 }));
    expect(blocked.onStart).not.toHaveBeenCalled();
    gesture!.destroy();

    const { child, onEnd } = setup('bottom');
    child.dispatchEvent(pointer('pointerdown', { clientY: 300 }));
    gesture!.cancel();
    child.dispatchEvent(pointer('pointerup', { clientY: 200 }));
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('ends with a null event on pointercancel', () => {
    const { child, onEnd } = setup('bottom');
    child.dispatchEvent(pointer('pointerdown', { clientY: 300 }));
    child.dispatchEvent(pointer('pointercancel'));
    expect(onEnd).toHaveBeenCalledWith(null, { distance: 0, velocity: 0 });
  });

  it('ignores other pointers during a press', () => {
    const { child, onStart, onMove, onEnd } = setup('bottom');
    child.dispatchEvent(pointer('pointerdown', { clientX: 50, clientY: 300 }));
    child.dispatchEvent(pointer('pointerdown', { pointerId: 2, clientX: 80, clientY: 100 }));
    child.dispatchEvent(pointer('pointermove', { pointerId: 2, clientX: 80, clientY: 50 }));
    child.dispatchEvent(pointer('pointerup', { pointerId: 2, clientX: 80, clientY: 50 }));
    child.dispatchEvent(pointer('pointercancel', { pointerId: 2 }));
    expect(onStart).toHaveBeenCalledOnce();
    expect(onMove).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();

    child.dispatchEvent(pointer('pointermove', { clientX: 50, clientY: 250 }));
    expect(onMove).toHaveBeenLastCalledWith(expect.any(PointerEvent), 50);
    child.dispatchEvent(pointer('pointerup', { clientX: 50, clientY: 250 }));
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('recovers from a press that lost its release', () => {
    const { child, onStart, onEnd } = setup('bottom');
    child.dispatchEvent(pointer('pointerdown', { isPrimary: true, clientX: 50, clientY: 300 }));
    // No pointerup / pointercancel arrives; the next touch starts a new press.
    child.dispatchEvent(pointer('pointerdown', { isPrimary: true, pointerId: 3, clientX: 50, clientY: 300 }));
    expect(onEnd).toHaveBeenCalledWith(null, { distance: 0, velocity: 0 });
    expect(onStart).toHaveBeenCalledTimes(2);
  });
});

describe('isScrolledAway', () => {
  it('detects a scrolled ancestor up to the boundary', () => {
    const boundary = document.createElement('div');
    const scroller = document.createElement('div');
    const leaf = document.createElement('span');
    boundary.append(scroller);
    scroller.append(leaf);
    expect(isScrolledAway(leaf, boundary)).toBe(false);
    Object.defineProperties(scroller, {
      scrollHeight: { value: 500 },
      clientHeight: { value: 100 },
      scrollTop: { value: 20 },
    });
    expect(isScrolledAway(leaf, boundary)).toBe(true);
  });
});
