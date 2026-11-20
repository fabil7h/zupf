// @vitest-environment node
import { describe, expect, it, vi } from 'vite-plus/test';
import { createPullToRefresh, createSheet } from '../../src';

describe('server (no DOM)', () => {
  it('has no document', () => {
    expect(typeof document).toBe('undefined');
  });

  it('createSheet returns an inert, closed sheet', () => {
    const sheet = createSheet({ content: '#sheet', open: true });
    const listener = vi.fn();
    const off = sheet.subscribe(listener);
    expect(sheet.isOpen).toBe(false);
    expect(() => {
      sheet.open();
      sheet.toggle();
      sheet.snapToIndex(1);
      sheet.setOptions({ modal: false });
      off();
      sheet.destroy();
    }).not.toThrow();
    expect(sheet.isOpen).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('createPullToRefresh returns an inert, idle instance', async () => {
    const onRefresh = vi.fn();
    const ptr = createPullToRefresh({ content: '#list', onRefresh, disabled: true });
    expect(ptr.status).toBe('idle');
    await ptr.refresh();
    expect(() => {
      ptr.setOptions({ disabled: false });
      ptr.destroy();
    }).not.toThrow();
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
