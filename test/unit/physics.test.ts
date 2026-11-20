import { describe, expect, it } from 'vite-plus/test';
import {
  getSnapOffsets,
  resolveRelease,
  resolveSnapRelease,
  snapFadeProgress,
  overlayOpacityAt,
} from '../../src/drawer/physics';

const size = { width: 400, height: 1000 };

describe('getSnapOffsets', () => {
  it('bottom: offset = container - visible', () => {
    expect(getSnapOffsets([0.25, '300px', 1], 'bottom', size)).toEqual([750, 700, 0]);
  });
  it('top: negative offsets', () => {
    expect(getSnapOffsets([0.25, 1], 'top', size)).toEqual([-750, 0]);
  });
  it('left/right use width', () => {
    expect(getSnapOffsets([0.5], 'right', size)).toEqual([200]);
    expect(getSnapOffsets([0.5], 'left', size)).toEqual([-200]);
  });
});

describe('resolveSnapRelease', () => {
  const base = {
    offsets: [750, 500, 0],
    activeIndex: 1,
    draggedDistance: 0,
    velocity: 0,
    direction: 'bottom' as const,
    dismissible: true,
    sequential: false,
    velocityThreshold: 0.4,
    flickVelocity: 2,
    viewport: 1000,
  };

  it('snaps to the closest point on a slow release', () => {
    expect(resolveSnapRelease({ ...base, draggedDistance: 400 })).toEqual({ type: 'snap', index: 2 });
    expect(resolveSnapRelease({ ...base, draggedDistance: -200 })).toEqual({ type: 'snap', index: 0 });
    expect(resolveSnapRelease({ ...base, draggedDistance: 50 })).toEqual({ type: 'snap', index: 1 });
  });

  it('moves one point on a medium-speed swipe', () => {
    expect(resolveSnapRelease({ ...base, draggedDistance: 30, velocity: 1 })).toEqual({ type: 'snap', index: 2 });
    expect(resolveSnapRelease({ ...base, draggedDistance: -30, velocity: 1 })).toEqual({ type: 'snap', index: 0 });
  });

  it('flick jumps to extremes or closes', () => {
    expect(resolveSnapRelease({ ...base, activeIndex: 0, draggedDistance: 30, velocity: 3 })).toEqual({
      type: 'snap',
      index: 2,
    });
    expect(resolveSnapRelease({ ...base, draggedDistance: -30, velocity: 3 })).toEqual({ type: 'close' });
    expect(resolveSnapRelease({ ...base, draggedDistance: -30, velocity: 3, dismissible: false })).toEqual({
      type: 'snap',
      index: 0,
    });
  });

  it('sequential mode never skips', () => {
    expect(resolveSnapRelease({ ...base, activeIndex: 0, draggedDistance: 30, velocity: 3, sequential: true })).toEqual(
      { type: 'snap', index: 1 },
    );
  });

  it('swiping down on the first point closes only when dismissible', () => {
    const first = { ...base, activeIndex: 0, draggedDistance: -30, velocity: 1 };
    expect(resolveSnapRelease(first)).toEqual({ type: 'close' });
    expect(resolveSnapRelease({ ...first, dismissible: false })).toEqual({ type: 'snap', index: 0 });
  });
});

describe('resolveRelease', () => {
  const base = {
    swipeAmount: 0,
    draggedDistance: -10,
    velocity: 0,
    velocityThreshold: 0.4,
    closeThreshold: 0.25,
    sheetSize: 400,
  };
  it('resets when pulled towards open', () => {
    expect(resolveRelease({ ...base, draggedDistance: 20 })).toEqual({ type: 'reset' });
  });
  it('closes on fast swipe', () => {
    expect(resolveRelease({ ...base, velocity: 0.5, swipeAmount: 10 })).toEqual({ type: 'close' });
  });
  it('closes past threshold, resets before', () => {
    expect(resolveRelease({ ...base, swipeAmount: 100 })).toEqual({ type: 'close' });
    expect(resolveRelease({ ...base, swipeAmount: 99 })).toEqual({ type: 'reset' });
  });
});

describe('overlay fade', () => {
  it('overlay visible only from fadeFromIndex', () => {
    expect([0, 1, 2].map((i) => overlayOpacityAt(i, 1, 3))).toEqual([0, 1, 1]);
  });
  it('fade progress between overlay point and the one before', () => {
    const offsets = [750, 500, 0];
    // At index 0 (before fadeFrom=1), dragging up halfway to index 1 → overlay half visible.
    expect(
      snapFadeProgress({
        offsets,
        activeIndex: 0,
        fadeFromIndex: 1,
        absDraggedDistance: 125,
        towardsOpen: true,
        closedOffset: 1000,
      }),
    ).toBe(0.5);
    // At fadeFrom index dragging down → fading out.
    expect(
      snapFadeProgress({
        offsets,
        activeIndex: 1,
        fadeFromIndex: 1,
        absDraggedDistance: 125,
        towardsOpen: false,
        closedOffset: 1000,
      }),
    ).toBe(0.5);
    expect(
      snapFadeProgress({
        offsets,
        activeIndex: 2,
        fadeFromIndex: 1,
        absDraggedDistance: 10,
        towardsOpen: true,
        closedOffset: 1000,
      }),
    ).toBe(0);
  });
  it('fadeFromIndex 0: fades out towards closed from the first point (no NaN)', () => {
    const offsets = [750, 500, 0];
    // First point shows 250px; dragging 125px down is halfway to closed.
    expect(
      snapFadeProgress({
        offsets,
        activeIndex: 0,
        fadeFromIndex: 0,
        absDraggedDistance: 125,
        towardsOpen: false,
        closedOffset: 1000,
      }),
    ).toBe(0.5);
  });
});
