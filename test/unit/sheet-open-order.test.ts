import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';

const calls: string[] = [];
vi.mock('../../src/drawer/position-fixed', () => ({
  setPositionFixed: () => {
    calls.push('fixed');
    return () => calls.push('unfix');
  },
}));
vi.mock('../../src/drawer/prevent-scroll', () => ({
  preventScroll: () => {
    calls.push('prevent');
    return () => calls.push('allow');
  },
}));

const { createSheet } = await import('../../src');

// preventScroll measures the scroll position, so it must come after the body is fixed (else a scrolled page jumps).
let sheet: ReturnType<typeof createSheet>;
beforeEach(() => {
  vi.useFakeTimers();
  calls.length = 0;
  document.body.innerHTML = '<div id="content"><button>x</button></div><div id="overlay"></div>';
});
afterEach(() => {
  sheet?.destroy();
  vi.useRealTimers();
});

it('fixes the body before preventScroll, and neither runs before the first frame', () => {
  sheet = createSheet({
    content: document.getElementById('content')!,
    overlay: document.getElementById('overlay')!,
  });
  sheet.open();
  expect(calls).toEqual([]);
  vi.advanceTimersByTime(50);
  expect(calls).toEqual(['fixed', 'prevent']);
});

it('opening already open (no animation) keeps the same order', () => {
  sheet = createSheet({
    content: document.getElementById('content')!,
    overlay: document.getElementById('overlay')!,
    open: true,
  });
  expect(calls).toEqual(['fixed', 'prevent']);
});

// iOS only opens the keyboard when focus moves inside the tap handler itself.
it('moves focus into the sheet synchronously on open, while the page effects wait for the frame', () => {
  sheet = createSheet({
    content: document.getElementById('content')!,
    overlay: document.getElementById('overlay')!,
  });
  sheet.open();
  expect(document.activeElement).toBe(document.getElementById('content'));
  expect(calls).toEqual([]);
});

// A non-modal sheet unfixes the body 500ms after opening. Closed before that, the body must stay fixed until the
// slide-out has finished, else the page moves under the sheet still sliding out.
it('a non-modal sheet closed early keeps the body fixed until the slide-out has finished', () => {
  sheet = createSheet({
    content: document.getElementById('content')!,
    overlay: document.getElementById('overlay')!,
    modal: false,
    duration: 500,
  });
  sheet.open();
  vi.advanceTimersByTime(100);
  expect(calls).toContain('fixed');
  sheet.close();
  vi.advanceTimersByTime(450); // past the 500ms unfix of the open, still sliding out
  expect(calls).not.toContain('unfix');
  vi.advanceTimersByTime(100);
  expect(calls).toContain('unfix');
});
