import { afterEach, describe, expect, it } from 'vite-plus/test';
import { commands, userEvent } from 'vite-plus/test/browser';
import { createGestures, type GestureEvent, type Gestures } from '../../src';

const instances: Gestures[] = [];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function mount() {
  const el = document.createElement('button');
  el.style.cssText = 'display:block;width:300px;height:300px';
  document.body.append(el);
  const g = createGestures({ target: el, interval: 200 });
  instances.push(g);
  const seen: string[] = [];
  const log = (e: GestureEvent) => seen.push(`${e.gesture}${e.direction ? `:${e.direction}` : ''}`);
  return { el, g, seen, log, rect: el.getBoundingClientRect() };
}

afterEach(() => {
  instances.splice(0).forEach((g) => g.destroy());
  document.body.innerHTML = '';
});

describe('gestures', () => {
  it('double tap with real clicks', async () => {
    const { el, g, seen, log } = mount();
    g.on('tap', log);
    g.on('double-tap', log);
    await userEvent.dblClick(el);
    await wait(250);
    await userEvent.click(el);
    await wait(250);
    expect(seen).toEqual(['tap tap', 'tap']);
  });

  it('swipes, also past the element edge (pointer capture)', async () => {
    const { g, seen, log, rect } = mount();
    g.on('swipe', log);
    await commands.drag(rect.x + 150, rect.y + 150, 0, -200, 10, 16);
    await commands.drag(rect.x + 150, rect.y + 150, 250, 0, 10, 16);
    expect(seen).toEqual(['swipe:up', 'swipe:right']);
  });

  it('taps on a child button still click it, also right after a swipe', async () => {
    const { el, g, seen, log, rect } = mount();
    const button = document.createElement('button');
    button.textContent = 'Inner';
    el.append(button);
    const clicked: EventTarget[] = [];
    el.addEventListener('click', (e) => clicked.push(e.target!));
    g.on('swipe-left', log);
    g.on('double-tap', log);
    await commands.drag(rect.x + 250, rect.y + 150, -150, 0, 10, 16);
    await wait(50);
    await userEvent.click(button);
    expect(seen).toEqual(['swipe-left:left']);
    expect(clicked).toHaveLength(1);
    expect(clicked[0]).toBe(button);
  });
});
