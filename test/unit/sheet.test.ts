import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { createSheet, type Sheet, type SheetState } from '../../src';

function mount() {
  document.body.innerHTML = `
    <div id="app"><button id="trigger">Open</button><input id="outside"></div>
    <div id="overlay"></div>
    <div id="content">
      <div data-zupf-handle></div>
      <h2 data-zupf-title>Title</h2>
      <p data-zupf-description>Desc</p>
      <button data-zupf-close id="close">Close</button>
    </div>`;
  return {
    app: document.getElementById('app')!,
    trigger: document.getElementById('trigger')!,
    content: document.getElementById('content')!,
    overlay: document.getElementById('overlay')!,
    close: document.getElementById('close')!,
  };
}

// Page effects of an open (inert, scroll lock, focus) apply once the first frame has been rendered.
const frame = () => vi.advanceTimersByTime(50);

describe('Sheet', () => {
  let sheet: Sheet;
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    sheet?.destroy();
    vi.useRealTimers();
  });

  it('sets up a11y attributes and starts hidden', () => {
    const els = mount();
    sheet = createSheet({ content: els.content, overlay: els.overlay, trigger: els.trigger });
    expect(els.content.hidden).toBe(true);
    expect(els.overlay.hidden).toBe(true);
    expect(els.content.getAttribute('role')).toBe('dialog');
    expect(els.content.getAttribute('aria-modal')).toBe('true');
    expect(els.content.getAttribute('aria-labelledby')).toBe(els.content.querySelector('h2')!.id);
    expect(els.content.getAttribute('aria-describedby')).toBe(els.content.querySelector('p')!.id);
    expect(els.trigger.getAttribute('aria-controls')).toBe(els.content.id);
    expect(els.trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens via trigger, makes the page inert, closes via close button and restores', () => {
    const els = mount();
    const onOpenChange = vi.fn();
    const onAnimationEnd = vi.fn();
    sheet = createSheet({
      content: els.content,
      overlay: els.overlay,
      trigger: els.trigger,
      onOpenChange,
      onAnimationEnd,
    });

    els.trigger.focus();
    els.trigger.click();
    expect(sheet.isOpen).toBe(true);
    expect(onOpenChange).toHaveBeenLastCalledWith(true, 'trigger');
    expect(els.content.hidden).toBe(false);
    expect(els.content.dataset.state).toBe('open');
    expect(els.app.inert).toBeFalsy(); // held back so the first frame of the slide-in is not delayed
    frame();
    expect(els.app.inert).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(els.content);

    els.close.click();
    expect(sheet.isOpen).toBe(false);
    expect(onOpenChange).toHaveBeenLastCalledWith(false, 'close-button');
    expect(els.content.hidden).toBe(false); // still animating out
    // Inert and focus wait for the first frame of the slide-out, so they don't delay it.
    expect(els.app.inert).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');

    frame();
    // The page takes clicks and focus during the slide-out; the scroll lock holds until it is out of view.
    expect(els.app.inert).toBeFalsy();
    expect(document.activeElement).toBe(els.trigger);
    expect(document.documentElement.style.overflow).toBe('hidden');

    vi.advanceTimersByTime(500);
    expect(document.documentElement.style.overflow).toBe('');
    expect(els.content.hidden).toBe(true);
    expect(onAnimationEnd).toHaveBeenLastCalledWith(false);
  });

  it('Escape and outside press respect dismissible', () => {
    const els = mount();
    sheet = createSheet({ content: els.content, overlay: els.overlay, dismissible: false });
    sheet.open();
    frame();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(sheet.isOpen).toBe(true);

    sheet.setOptions({ dismissible: true });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(sheet.isOpen).toBe(false);

    vi.advanceTimersByTime(500);
    sheet.open();
    frame();
    els.overlay.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(sheet.isOpen).toBe(false);
  });

  it('reopening during the slide-out ends the previous close first and leaves no stuck page state', () => {
    const els = mount();
    sheet = createSheet({ content: els.content, overlay: els.overlay, trigger: els.trigger });

    sheet.open();
    frame();
    sheet.close();
    expect(els.app.inert).toBe(true); // close effects still pending
    sheet.open(); // before the first frame of the slide-out
    frame();
    expect(sheet.isOpen).toBe(true);
    expect(els.app.inert).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');

    vi.advanceTimersByTime(500); // the old close timer must not undo the reopen
    expect(els.app.inert).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');

    sheet.close();
    vi.advanceTimersByTime(500);
    expect(els.app.inert).toBeFalsy();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('closing or destroying before the first frame never applies the page effects', () => {
    const els = mount();
    sheet = createSheet({ content: els.content, overlay: els.overlay, trigger: els.trigger });
    els.trigger.focus();
    sheet.open();
    sheet.close();
    frame();
    expect(els.app.inert).toBeFalsy();
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.activeElement).toBe(els.trigger);

    sheet.open();
    sheet.destroy();
    frame();
    expect(els.app.inert).toBeFalsy();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('handles a burst of resize events once per frame, and not after destroy', () => {
    const els = mount();
    sheet = createSheet({ content: els.content, overlay: els.overlay, snapPoints: [0.5, 1] });
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame');
    for (let i = 0; i < 25; i++) window.dispatchEvent(new Event('resize'));
    expect(raf).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(50);
    window.dispatchEvent(new Event('resize'));
    expect(raf).toHaveBeenCalledTimes(2);
    sheet.destroy();
    vi.advanceTimersByTime(50); // the pending frame was cancelled: nothing runs on a destroyed sheet
    raf.mockRestore();
  });

  it('destroying during the slide-out releases the page', () => {
    const els = mount();
    sheet = createSheet({ content: els.content, overlay: els.overlay });
    sheet.open();
    frame();
    sheet.close();
    sheet.destroy();
    expect(els.app.inert).toBeFalsy();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('non-modal does not make page inert or close on outside press', () => {
    const els = mount();
    sheet = createSheet({ content: els.content, overlay: els.overlay, modal: false });
    sheet.open();
    expect(els.app.inert).toBeFalsy();
    expect(els.overlay.hidden).toBe(true);
    document.getElementById('outside')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(sheet.isOpen).toBe(true);
  });

  it('subscribe emits state; snap points are tracked', () => {
    const els = mount();
    sheet = createSheet({ content: els.content, snapPoints: [0.25, 0.5, 1] });
    const states: SheetState[] = [];
    sheet.subscribe((s) => states.push(s));
    expect(states[0]).toMatchObject({ open: false, activeSnapPoint: 0.25, activeSnapPointIndex: 0 });

    sheet.open();
    expect(sheet.getState().open).toBe(true);
    expect(els.content.style.transform).toContain(`${window.innerHeight * 0.75}px`);

    sheet.snapTo(1);
    expect(sheet.getState()).toMatchObject({ activeSnapPoint: 1, activeSnapPointIndex: 2 });
    expect(els.content.style.transform).toMatch(/^translate3d\(0(px)?, 0px, 0(px)?\)$/);

    sheet.close();
    vi.advanceTimersByTime(500);
    expect(sheet.getState().activeSnapPointIndex).toBe(0); // reset after close
  });

  it('modal snap sheets dim from the first snap point by default', () => {
    const els = mount();
    sheet = createSheet({ content: els.content, overlay: els.overlay, snapPoints: [0.25, 1] });
    sheet.open();
    expect(els.overlay.style.opacity).toBe('1');
    sheet.close();
    vi.advanceTimersByTime(500);
    sheet.setOptions({ fadeFromIndex: 1 });
    sheet.open();
    expect(els.overlay.style.opacity).toBe('0');
    sheet.snapTo(1);
    expect(els.overlay.style.opacity).toBe('1');
  });

  it('getState returns a stable reference between changes', () => {
    const els = mount();
    sheet = createSheet({ content: els.content });
    const a = sheet.getState();
    expect(sheet.getState()).toBe(a);
    sheet.open();
    expect(sheet.getState()).not.toBe(a);
  });

  it('nested: only the top sheet reacts to Escape', () => {
    const els = mount();
    const child = document.createElement('div');
    document.body.append(child);
    sheet = createSheet({ content: els.content, overlay: els.overlay });
    const nested = createSheet({ content: child, parent: sheet });
    sheet.open();
    nested.open();
    expect(els.content.style.transform).toContain('scale(');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    expect(nested.isOpen).toBe(false);
    expect(sheet.isOpen).toBe(true);
    nested.destroy();
  });

  it('nested: the parent reacts to Escape again while the child is still sliding out', () => {
    const els = mount();
    const child = document.createElement('div');
    document.body.append(child);
    sheet = createSheet({ content: els.content, overlay: els.overlay });
    const nested = createSheet({ content: child, parent: sheet });
    sheet.open();
    nested.open();
    frame();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    expect(nested.isOpen).toBe(false);
    frame(); // child still sliding out
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    expect(sheet.isOpen).toBe(false);
    nested.destroy();
  });

  it('nested: a child sheet portaled next to its parent is not left inert', () => {
    const els = mount();
    const child = document.createElement('div');
    const childOverlay = document.createElement('div');
    document.body.append(childOverlay, child);
    sheet = createSheet({ content: els.content, overlay: els.overlay });
    const nested = createSheet({ content: child, overlay: childOverlay, parent: sheet });

    sheet.open();
    frame();
    expect(child.inert).toBe(true); // hidden behind the parent

    nested.open();
    frame();
    expect(child.inert).toBe(false);
    expect(childOverlay.inert).toBe(false);
    expect(els.content.inert).toBe(true); // parent is now in the background
    expect(els.app.inert).toBe(true);

    nested.close();
    frame();
    expect(els.content.inert).toBeFalsy(); // the parent takes clicks during the child's slide-out
    vi.advanceTimersByTime(500);
    expect(els.content.inert).toBeFalsy();
    expect(child.inert).toBe(true); // back behind the parent
    expect(els.app.inert).toBe(true);

    sheet.close();
    vi.advanceTimersByTime(500);
    expect(child.inert).toBeFalsy();
    expect(els.app.inert).toBeFalsy();
    nested.destroy();
  });

  it('marks non-draggable sheets so the handle can be hidden', () => {
    const els = mount();
    sheet = createSheet({ content: els.content, dismissible: false });
    expect(els.content.dataset.draggable).toBe('false');
    sheet.setOptions({ snapPoints: [0.5, 1] });
    expect(els.content.dataset.draggable).toBe('true'); // can still drag between snap points
    sheet.setOptions({ snapPoints: null, dismissible: true });
    expect(els.content.dataset.draggable).toBe('true');
  });

  it('starts open without animation when open: true', () => {
    const els = mount();
    sheet = createSheet({ content: els.content, open: true });
    expect(sheet.isOpen).toBe(true);
    expect(els.content.style.transition).toBe('none');
  });
});
