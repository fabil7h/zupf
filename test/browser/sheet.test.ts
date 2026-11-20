import { afterEach, describe, expect, it } from 'vite-plus/test';
import { commands, userEvent } from 'vite-plus/test/browser';
import { createSheet, type Sheet, type SheetOptions } from '../../src';
import '../../src/drawer/style.css';

const sheets: Sheet[] = [];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const settle = () => wait(600);

function mount(opts: Omit<SheetOptions, 'content'> = {}, body = '<p>Body</p>') {
  const root = document.createElement('div');
  root.innerHTML = `
    <div class="overlay"></div>
    <div class="content">
      <div data-zupf-handle></div>
      <h2 data-zupf-title>Title</h2>
      ${body}
      <button data-zupf-close>Close</button>
    </div>`;
  document.body.append(root);
  const content = root.querySelector<HTMLElement>('.content')!;
  const sheet = createSheet({ content, overlay: root.querySelector<HTMLElement>('.overlay'), wrapper: null, ...opts });
  sheets.push(sheet);
  return { sheet, content, overlay: root.querySelector<HTMLElement>('.overlay')!, root };
}

const translate = (el: HTMLElement) => {
  const m = new DOMMatrix(getComputedStyle(el).transform);
  return { x: Math.round(m.m41) + 0, y: Math.round(m.m42) + 0, scale: m.a };
};
const handleOf = (content: HTMLElement) =>
  content.querySelector<HTMLElement>('[data-zupf-handle]')!.getBoundingClientRect();
const H = () => window.innerHeight;

afterEach(() => {
  sheets.splice(0).forEach((s) => s.destroy());
  document.body.innerHTML = '';
});

describe('dragging', () => {
  it('a short slow drag springs back; a long drag closes', async () => {
    const { sheet, content } = mount();
    sheet.open();
    await settle();
    expect(translate(content).y).toBe(0);

    let h = handleOf(content);
    await commands.drag(h.x + 10, h.y + 2, 0, 20, 20, 30);
    await settle();
    expect(sheet.isOpen).toBe(true);
    expect(translate(content).y).toBe(0);

    h = handleOf(content);
    await commands.drag(h.x + 10, h.y + 2, 0, 250, 20, 30);
    await settle();
    expect(sheet.isOpen).toBe(false);
    expect(content.hidden).toBe(true);
  });

  it('a fast flick closes', async () => {
    const { sheet, content } = mount();
    sheet.open();
    await settle();
    const h = handleOf(content);
    await commands.drag(h.x + 10, h.y + 2, 0, 60, 4, 5);
    await settle();
    expect(sheet.isOpen).toBe(false);
  });

  it('right sheet closes when swiped right', async () => {
    const { sheet, content } = mount({ direction: 'right' });
    sheet.open();
    await settle();
    const r = content.getBoundingClientRect();
    expect(Math.round(r.right)).toBe(window.innerWidth);
    await commands.drag(r.x + 100, 400, 250, 0, 20, 30);
    await settle();
    expect(sheet.isOpen).toBe(false);
  });

  it('top sheet shows its handle on the bottom edge, even when it comes first in the markup', async () => {
    const { sheet, content } = mount({ direction: 'top' });
    sheet.open();
    await settle();
    const c = content.getBoundingClientRect();
    const h = handleOf(content);
    expect(c.bottom - h.bottom).toBeLessThan(20);
    expect(h.top - c.top).toBeGreaterThan(50);
  });

  it('top sheet closes when swiped up', async () => {
    const { sheet, content } = mount({ direction: 'top' });
    sheet.open();
    await settle();
    const r = content.getBoundingClientRect();
    await commands.drag(200, r.bottom - 10, 0, -150, 20, 30);
    await settle();
    expect(sheet.isOpen).toBe(false);
  });

  it('non-dismissible ignores drag, Esc and outside press', async () => {
    const { sheet, content } = mount({ dismissible: false });
    sheet.open();
    await settle();
    expect(getComputedStyle(content.querySelector('[data-zupf-handle]')!).display).toBe('none');
    await userEvent.keyboard('{Escape}');
    const r = content.getBoundingClientRect();
    await commands.drag(r.x + 40, r.y + 10, 0, 300, 20, 20);
    await settle();
    expect(sheet.isOpen).toBe(true);
    expect(translate(content).y).toBe(0);
    content.querySelector<HTMLElement>('[data-zupf-close]')!.click();
    expect(sheet.isOpen).toBe(false);
  });

  it('does not drag-close while content is scrolled', async () => {
    const items = Array.from({ length: 40 }, (_, i) => `<li>Item ${i}</li>`).join('');
    const { sheet, content } = mount({}, `<div class="scroller" style="overflow:auto;flex:1"><ol>${items}</ol></div>`);
    content.style.setProperty('--zupf-size', '80%');
    sheet.open();
    await settle();
    content.querySelector('.scroller')!.scrollTop = 300;
    await wait(150);
    await commands.drag(200, 500, 0, 200, 20, 30);
    await settle();
    expect(sheet.isOpen).toBe(true);
  });
});

describe('snap points', () => {
  it('opens at the first point, snaps on drag, cycles via handle tap, resets on close', async () => {
    const { sheet, content, overlay } = mount({ snapPoints: ['148px', '355px', 1], fadeFromIndex: 1 });
    sheet.open();
    await settle();
    expect(translate(content).y).toBe(H() - 148);
    expect(getComputedStyle(overlay).opacity).toBe('0');

    let h = handleOf(content);
    await commands.drag(h.x + 10, h.y + 2, 0, -190, 30, 30);
    await settle();
    expect(sheet.getState().activeSnapPointIndex).toBe(1);
    expect(translate(content).y).toBe(H() - 355);
    expect(getComputedStyle(overlay).opacity).toBe('1');

    h = handleOf(content);
    await userEvent.click(content.querySelector('[data-zupf-handle]')!, { position: { x: 10, y: 2 } });
    await wait(800);
    expect(sheet.getState().activeSnapPointIndex).toBe(2);
    expect(translate(content).y).toBe(0);

    await userEvent.keyboard('{Escape}');
    await settle();
    expect(sheet.isOpen).toBe(false);
    expect(sheet.getState().activeSnapPointIndex).toBe(0);
  });
});

describe('overlay', () => {
  it('fades out while dragging a snap sheet down from its first point', async () => {
    const { sheet, content, overlay } = mount({ snapPoints: ['300px', 1] });
    sheet.open();
    await settle();
    expect(getComputedStyle(overlay).opacity).toBe('1');

    const h = handleOf(content);
    let midOpacity = '';
    const sample = setInterval(() => {
      if (content.hasAttribute('data-dragging')) midOpacity = getComputedStyle(overlay).opacity;
    }, 20);
    await commands.drag(h.x + 10, h.y + 2, 0, 150, 20, 30);
    clearInterval(sample);
    const mid = Number(midOpacity);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    await settle();
  });
});

const text = '<p class="txt">Some selectable text inside the drawer, long enough to drag across.</p>';
const selectAcross = async (el: Element) => {
  const r = el.getBoundingClientRect();
  await commands.drag(r.left + 2, r.top + r.height / 2, Math.min(200, r.width - 4), 0, 10, 15);
  return window.getSelection()?.toString() ?? '';
};

describe('text selection', () => {
  it('handle-only sheets allow selecting text and do not move', async () => {
    const { sheet, content } = mount({ handleOnly: true }, text);
    sheet.open();
    await settle();
    expect(content.hasAttribute('data-handle-only')).toBe(true);
    expect(getComputedStyle(content).userSelect).not.toBe('none');

    const selected = await selectAcross(content.querySelector('.txt')!);
    expect(selected.length).toBeGreaterThan(5);
    expect(sheet.isOpen).toBe(true);
    expect(translate(content).y).toBe(0);

    // The handle still drags.
    const h = handleOf(content);
    await commands.drag(h.x + 10, h.y + 2, 0, 250, 20, 30);
    await settle();
    expect(sheet.isOpen).toBe(false);
  });

  it('no-drag areas inside a draggable sheet are selectable', async () => {
    const { sheet, content } = mount({}, `<div data-zupf-no-drag>${text}</div><p class="plain">Plain text</p>`);
    sheet.open();
    await settle();
    expect(getComputedStyle(content.querySelector('.plain')!).userSelect).toBe('none');
    const selected = await selectAcross(content.querySelector('.txt')!);
    expect(selected.length).toBeGreaterThan(5);
    expect(translate(content).y).toBe(0);
    window.getSelection()?.removeAllRanges();
  });

  it('toggling handleOnly at runtime updates the attribute', () => {
    const { sheet, content } = mount();
    expect(content.hasAttribute('data-handle-only')).toBe(false);
    sheet.setOptions({ handleOnly: true });
    expect(content.hasAttribute('data-handle-only')).toBe(true);
  });
});

describe('scaleBackground', () => {
  it.each(['bottom', 'top', 'left', 'right'] as const)(
    '%s sheet: the page recedes away from the sheet, leaving a strip on the far edge',
    async (direction) => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-zupf-wrapper', '');
      wrapper.style.cssText = 'height:100vh;background:#eee';
      document.body.prepend(wrapper);
      // A large push makes a wrong direction obvious (the strip would end up on the other edge).
      const { sheet } = mount({ wrapper, direction, scaleBackground: { translate: 40, offset: 26 } });
      sheet.open();
      await settle();

      const r = wrapper.getBoundingClientRect();
      const gaps = {
        top: r.top,
        bottom: window.innerHeight - r.bottom,
        left: r.left,
        right: window.innerWidth - r.right,
      };
      const far = { bottom: 'top', top: 'bottom', left: 'right', right: 'left' } as const;
      const scale = (window.innerWidth - 26) / window.innerWidth;
      // Anchored to the far edge and pushed 40px (scaled) off it.
      expect(gaps[far[direction]]).toBeCloseTo(40 * scale, 0);
      sheet.close();
      await settle();
    },
  );

  it('keeps sticky headers in view on a scrolled page and restores the wrapper on close', async () => {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-zupf-wrapper', '');
    wrapper.innerHTML = `<header style="position:sticky;top:0;height:50px;background:#eee">Header</header>
      <div style="height:3000px">Long page</div>`;
    document.body.prepend(wrapper);
    const header = wrapper.querySelector('header')!;
    window.scrollTo(0, 1000);
    await wait(50);
    expect(header.getBoundingClientRect().top).toBe(0);

    const { sheet } = mount({ wrapper, scaleBackground: true });
    sheet.open();
    await settle();
    const top = header.getBoundingClientRect().top;
    // Scaled back and pushed down slightly, but still at the top of the viewport.
    expect(top).toBeGreaterThan(0);
    expect(top).toBeLessThan(40);
    expect(getComputedStyle(wrapper).clipPath).toContain('inset');

    sheet.close();
    await settle();
    await wait(100);
    expect(wrapper.getAttribute('style') ?? '').toBe('');
    expect(header.getBoundingClientRect().top).toBe(0);
    window.scrollTo(0, 0);
  });
});

describe('modal behavior', () => {
  it('moves focus in, makes the page inert, restores focus on close', async () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Open';
    document.body.prepend(trigger);
    const { sheet, content } = mount({ trigger });
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    await settle();
    expect(content.contains(document.activeElement)).toBe(true);
    expect(trigger.inert).toBe(true);

    await userEvent.keyboard('{Escape}');
    await settle();
    expect(trigger.inert).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(sheet.isOpen).toBe(false);
  });

  it('non-modal survives outside clicks', async () => {
    const outside = document.createElement('button');
    document.body.prepend(outside);
    const { sheet } = mount({ modal: false });
    sheet.open();
    await settle();
    await userEvent.click(outside);
    expect(sheet.isOpen).toBe(true);
  });

  it('nested: the child sheet is interactive and can be dragged', async () => {
    const parent = mount().sheet;
    const { sheet: child, content } = mount({ parent }, '<button class="inside">Inside</button>');
    parent.open();
    await settle();
    child.open();
    await settle();

    const btn = content.querySelector<HTMLElement>('.inside')!;
    const r = btn.getBoundingClientRect();
    expect(document.elementFromPoint(r.x + 5, r.y + 5)).toBe(btn);
    await userEvent.click(btn);
    await wait(100);
    expect(child.isOpen).toBe(true);

    const h = handleOf(content);
    await commands.drag(h.x + 10, h.y + 2, 0, 250, 20, 30);
    await settle();
    expect(child.isOpen).toBe(false);
    expect(parent.isOpen).toBe(true);
  });

  it('nested: parent scales back, Esc closes only the child', async () => {
    const parent = mount().sheet;
    const { sheet: child } = mount({ parent });
    parent.open();
    await settle();
    child.open();
    await settle();
    expect(translate(parent.content).scale).toBeLessThan(1);

    await userEvent.keyboard('{Escape}');
    await wait(800);
    expect(child.isOpen).toBe(false);
    expect(parent.isOpen).toBe(true);
    expect(translate(parent.content)).toMatchObject({ y: 0, scale: 1 });
  });
});
