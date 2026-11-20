import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { Timers } from '../../src/core';

describe('Timers', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires after the delay and forgets the key', () => {
    const t = new Timers<'a'>();
    const fn = vi.fn();
    t.set('a', fn, 100);
    expect(t.has('a')).toBe(true);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
    expect(t.has('a')).toBe(false);
  });

  it('replaces a timer set under the same key', () => {
    const t = new Timers<'a'>();
    const first = vi.fn();
    const second = vi.fn();
    t.set('a', first, 100);
    t.set('a', second, 100);
    vi.advanceTimersByTime(100);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it('clear cancels one key only', () => {
    const t = new Timers<'a' | 'b'>();
    const a = vi.fn();
    const b = vi.fn();
    t.set('a', a, 100);
    t.set('b', b, 100);
    t.clear('a');
    vi.advanceTimersByTime(100);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledOnce();
  });

  it('dispose cancels everything and ignores later sets', () => {
    const t = new Timers<'a' | 'b'>();
    const a = vi.fn();
    const b = vi.fn();
    t.set('a', a, 100);
    t.dispose();
    t.set('b', b, 100);
    vi.advanceTimersByTime(200);
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
    expect(t.has('b')).toBe(false);
  });
});
