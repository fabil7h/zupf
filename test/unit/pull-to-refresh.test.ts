import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { createPullToRefresh, type PullToRefresh, type PullToRefreshOptions } from '../../src';
import { pullOffset, pullProgress } from '../../src/pull-to-refresh/physics';

describe('pullOffset', () => {
  it('follows the finger at first and approaches max', () => {
    expect(pullOffset(0, 150)).toBe(0);
    expect(pullOffset(-20, 150)).toBe(0);
    expect(pullOffset(1, 150)).toBeCloseTo(1, 1);
    expect(pullOffset(150, 150)).toBe(75);
    expect(pullOffset(1e6, 150)).toBeLessThan(150);
    expect(pullOffset(200, 150)).toBeGreaterThan(pullOffset(100, 150));
  });
});

describe('pullProgress', () => {
  it('clamps to 0..1', () => {
    expect(pullProgress(32, 64)).toBe(0.5);
    expect(pullProgress(100, 64)).toBe(1);
    expect(pullProgress(-5, 64)).toBe(0);
  });
});

const pointer = (type: string, clientY: number) =>
  new PointerEvent(type, { bubbles: true, pointerId: 1, pointerType: 'touch', clientX: 50, clientY });

const pull = (el: HTMLElement, dy: number) => {
  el.dispatchEvent(pointer('pointerdown', 100));
  el.dispatchEvent(pointer('pointermove', 100 + dy / 2));
  el.dispatchEvent(pointer('pointermove', 100 + dy));
};

describe('PullToRefresh', () => {
  let ptr: PullToRefresh | undefined;
  afterEach(() => {
    ptr?.destroy();
    document.body.innerHTML = '';
  });

  function mount(opts: Partial<PullToRefreshOptions> = {}) {
    document.body.innerHTML = `<div id="wrap"><div data-zupf-ptr-indicator></div><div id="list"><p id="item">Item</p></div></div>`;
    const content = document.getElementById('list')!;
    const item = document.getElementById('item')!;
    ptr = createPullToRefresh({ content, scroller: content, ...opts });
    return { content, item, indicator: document.querySelector<HTMLElement>('[data-zupf-ptr-indicator]')! };
  }

  it('finds the indicator and sets up attributes', () => {
    const { content, indicator } = mount();
    expect(ptr!.indicator).toBe(indicator);
    expect(content.hasAttribute('data-zupf-ptr')).toBe(true);
    expect(content.getAttribute('data-state')).toBe('idle');
    expect(indicator.getAttribute('aria-hidden')).toBe('true');
  });

  it('a short pull snaps back without refreshing', () => {
    const onRefresh = vi.fn();
    const { item, content } = mount({ onRefresh });
    pull(item, 40);
    expect(ptr!.status).toBe('pulling');
    expect(content.style.transform).toContain('translate3d');
    item.dispatchEvent(pointer('pointerup', 140));
    expect(ptr!.status).toBe('idle');
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('a long pull refreshes and waits for the promise', async () => {
    let resolve!: () => void;
    const onRefresh = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const statuses: string[] = [];
    const { item, content } = mount({ onRefresh, onStatusChange: (s) => statuses.push(s) });
    pull(item, 200);
    expect(ptr!.status).toBe('ready');
    item.dispatchEvent(pointer('pointerup', 300));
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(ptr!.status).toBe('refreshing');
    expect(content.getAttribute('aria-busy')).toBe('true');
    expect(content.style.transform).toBe('translate3d(0px, 64px, 0px)');

    // No new pull while refreshing.
    pull(item, 200);
    expect(ptr!.status).toBe('refreshing');

    resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(ptr!.status).toBe('idle');
    expect(statuses).toEqual(['pulling', 'ready', 'refreshing', 'idle']);
  });

  it('ignores mostly sideways swipes', () => {
    const { item } = mount();
    item.dispatchEvent(pointer('pointerdown', 100));
    for (const [x, y] of [
      [80, 103],
      [150, 110],
      [250, 115],
    ]) {
      item.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerId: 1, pointerType: 'touch', clientX: x, clientY: y }),
      );
    }
    expect(ptr!.status).toBe('idle');
  });

  it('does not pull from [data-zupf-no-drag] areas', () => {
    const { item } = mount();
    item.setAttribute('data-zupf-no-drag', '');
    pull(item, 200);
    expect(ptr!.status).toBe('idle');
  });

  it('ignores [data-zupf-no-drag] on the content itself (meant for a surrounding drawer)', () => {
    const { item, content } = mount();
    content.setAttribute('data-zupf-no-drag', '');
    pull(item, 200);
    expect(ptr!.status).toBe('ready');
  });

  it('does not pull when scrolled away from the top', () => {
    const { item, content } = mount();
    Object.defineProperty(content, 'scrollTop', { value: 30, configurable: true });
    pull(item, 200);
    expect(ptr!.status).toBe('idle');
  });

  it('ignores mouse unless enabled, and respects disabled', () => {
    const { item } = mount();
    item.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', clientY: 100 }));
    item.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', clientY: 300 }));
    expect(ptr!.status).toBe('idle');

    ptr!.setOptions({ disabled: true });
    pull(item, 200);
    expect(ptr!.status).toBe('idle');
  });

  it('keeps the indicator look while settling, then resets it', async () => {
    vi.useFakeTimers();
    try {
      const { item, indicator } = mount({ onRefresh: () => undefined, duration: 100 });
      pull(item, 200);
      item.dispatchEvent(pointer('pointerup', 300));
      await vi.advanceTimersByTimeAsync(0);
      expect(ptr!.status).toBe('idle');
      expect(indicator.getAttribute('data-settling')).toBe('refreshed');
      expect(indicator.style.getPropertyValue('--zupf-ptr-progress')).toBe('1');
      await vi.advanceTimersByTimeAsync(100);
      expect(indicator.hasAttribute('data-settling')).toBe(false);
      expect(indicator.style.getPropertyValue('--zupf-ptr-progress')).toBe('0');

      pull(item, 30);
      item.dispatchEvent(pointer('pointerup', 130));
      expect(indicator.getAttribute('data-settling')).toBe('cancelled');
      // A new pull interrupts settling.
      pull(item, 30);
      expect(indicator.hasAttribute('data-settling')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports a failing onRefresh instead of leaving an unhandled rejection', async () => {
    const reportError = vi.fn();
    vi.stubGlobal('reportError', reportError);
    try {
      const error = new Error('offline');
      const { item } = mount({ onRefresh: () => Promise.reject(error) });
      pull(item, 200);
      item.dispatchEvent(pointer('pointerup', 300));
      await vi.waitFor(() => expect(reportError).toHaveBeenCalledWith(error));
      expect(ptr!.status).toBe('idle');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('does not refresh when the browser cancels the pointer', () => {
    const onRefresh = vi.fn();
    const { item } = mount({ onRefresh });
    pull(item, 200);
    expect(ptr!.status).toBe('ready');
    item.dispatchEvent(pointer('pointercancel', 300));
    expect(onRefresh).not.toHaveBeenCalled();
    expect(ptr!.status).toBe('idle');
  });

  it('refresh() during settling shows the indicator again', () => {
    const { item, indicator } = mount();
    pull(item, 30);
    item.dispatchEvent(pointer('pointerup', 130));
    expect(indicator.getAttribute('data-settling')).toBe('cancelled');
    void ptr!.refresh();
    expect(indicator.hasAttribute('data-settling')).toBe(false);
    expect(ptr!.status).toBe('refreshing');
  });

  it('disabling mid-pull ends the pull', () => {
    const { item, content } = mount();
    pull(item, 100);
    expect(content.hasAttribute('data-pulling')).toBe(true);
    ptr!.setOptions({ disabled: true });
    expect(content.hasAttribute('data-pulling')).toBe(false);
    expect(ptr!.status).toBe('idle');
  });

  it('destroy() removes what it added, even mid-refresh', () => {
    const { item, content, indicator } = mount({ onRefresh: () => new Promise(() => {}) });
    pull(item, 200);
    item.dispatchEvent(pointer('pointerup', 300));
    expect(content.getAttribute('aria-busy')).toBe('true');
    ptr!.destroy();
    for (const attr of ['data-zupf-ptr', 'data-state', 'data-pulling', 'aria-busy']) {
      expect(content.hasAttribute(attr)).toBe(false);
    }
    expect(indicator.hasAttribute('data-state')).toBe(false);
    expect(content.style.transform).toBe('');
  });

  it('refresh() runs programmatically', async () => {
    const onRefresh = vi.fn();
    mount({ onRefresh });
    await ptr!.refresh();
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(ptr!.status).toBe('idle');
  });

  it('refresh() during a pull ends the pull', () => {
    const onRefresh = vi.fn(() => new Promise(() => {}));
    const { item, content } = mount({ onRefresh });
    pull(item, 200);
    void ptr!.refresh();
    expect(content.hasAttribute('data-pulling')).toBe(false);
    item.dispatchEvent(pointer('pointermove', 320));
    item.dispatchEvent(pointer('pointerup', 320));
    expect(ptr!.status).toBe('refreshing');
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('concurrent refresh() calls share the running refresh', async () => {
    let done!: () => void;
    const onRefresh = vi.fn(() => new Promise<void>((r) => (done = r)));
    mount({ onRefresh });
    const first = ptr!.refresh();
    const second = ptr!.refresh();
    expect(second).toBe(first);
    done();
    await second;
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(ptr!.status).toBe('idle');
  });

  it('onPull reports the settle back to 0', () => {
    const onPull = vi.fn();
    const { item } = mount({ onPull });
    pull(item, 40);
    item.dispatchEvent(pointer('pointerup', 140));
    expect(onPull).toHaveBeenLastCalledWith(0, 0);
  });

  it('destroy() removes indicator attributes it added', () => {
    const { indicator } = mount();
    expect(indicator.getAttribute('aria-hidden')).toBe('true');
    ptr!.destroy();
    expect(indicator.hasAttribute('aria-hidden')).toBe(false);
    // Set by the markup, so it stays.
    expect(indicator.hasAttribute('data-zupf-ptr-indicator')).toBe(true);
  });
});
