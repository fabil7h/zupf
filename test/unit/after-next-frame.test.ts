import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import { afterNextFrame } from '../../src/core/helpers';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it('runs once after the next frame', () => {
  const fn = vi.fn();
  afterNextFrame(fn);
  expect(fn).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1000);
  expect(fn).toHaveBeenCalledTimes(1);
});

it('still runs when no frame comes (hidden tab)', () => {
  vi.stubGlobal('requestAnimationFrame', () => 0);
  const fn = vi.fn();
  afterNextFrame(fn);
  vi.advanceTimersByTime(1000);
  expect(fn).toHaveBeenCalledTimes(1);
});

it('cancelled: never runs', () => {
  const fn = vi.fn();
  afterNextFrame(fn)();
  vi.advanceTimersByTime(1000);
  expect(fn).not.toHaveBeenCalled();
});
