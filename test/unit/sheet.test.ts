import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { createSheet, type Sheet } from '../../src';

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
    expect(els.app.inert).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(els.content);

    els.close.click();
    expect(sheet.isOpen).toBe(false);
    expect(onOpenChange).toHaveBeenLastCalledWith(false, 'close-button');
    expect(els.app.inert).toBeFalsy();
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.activeElement).toBe(els.trigger);
    expect(els.content.hidden).toBe(false); // still animating out

    vi.advanceTimersByTime(500);
    expect(els.content.hidden).toBe(true);
    expect(onAnimationEnd).toHaveBeenLastCalledWith(false);
  });

  it('Escape and outside press respect dismissible', () => {
    const els = mount();
    sheet = createSheet({ content: els.content, overlay: els.overlay, dismissible: false });
    sheet.open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(sheet.isOpen).toBe(true);

    sheet.setOptions({ dismissible: true });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(sheet.isOpen).toBe(false);

    vi.advanceTimersByTime(500);
    sheet.open();
    els.overlay.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(sheet.isOpen).toBe(false);
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
    const states: any[] = [];
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

  it('nested: a child sheet portaled next to its parent is not left inert', () => {
    const els = mount();
    const child = document.createElement('div');
    const childOverlay = document.createElement('div');
    document.body.append(childOverlay, child);
    sheet = createSheet({ content: els.content, overlay: els.overlay });
    const nested = createSheet({ content: child, overlay: childOverlay, parent: sheet });

    sheet.open();
    expect(child.inert).toBe(true); // hidden behind the parent

    nested.open();
    expect(child.inert).toBe(false);
    expect(childOverlay.inert).toBe(false);
    expect(els.content.inert).toBe(true); // parent is now in the background
    expect(els.app.inert).toBe(true);

    nested.close();
    expect(els.content.inert).toBeFalsy();
    expect(child.inert).toBe(true); // back behind the parent
    expect(els.app.inert).toBe(true);

    sheet.close();
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
