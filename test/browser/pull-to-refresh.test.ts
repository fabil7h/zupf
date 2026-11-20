import { afterEach, describe, expect, it } from 'vite-plus/test';
import { commands } from 'vite-plus/test/browser';
import { createPullToRefresh, type PullToRefresh, type PullToRefreshOptions } from '../../src';
import '../../src/pull-to-refresh/style.css';

const instances: PullToRefresh[] = [];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function mount(opts: Partial<PullToRefreshOptions> = {}) {
  const root = document.createElement('div');
  root.style.cssText = 'position:relative;overflow:hidden;height:400px';
  root.innerHTML = `
    <div data-zupf-ptr-indicator><span data-zupf-ptr-spinner></span></div>
    <div class="list" style="height:400px;overflow:auto;background:#fff">
      ${Array.from({ length: 40 }, (_, i) => `<p style="margin:0;height:40px">Item ${i}</p>`).join('')}
    </div>`;
  document.body.append(root);
  const content = root.querySelector<HTMLElement>('.list')!;
  const ptr = createPullToRefresh({ content, mouse: true, duration: 100, ...opts });
  instances.push(ptr);
  return { ptr, content, rect: content.getBoundingClientRect() };
}

afterEach(() => {
  instances.splice(0).forEach((p) => p.destroy());
  document.body.innerHTML = '';
});

describe('pull to refresh', () => {
  it('uses the content as scroller when it scrolls', () => {
    const { ptr, content } = mount();
    expect(ptr.scroller).toBe(content);
  });

  it('a long pull refreshes, a short one springs back', async () => {
    let calls = 0;
    const { ptr, rect } = mount({ onRefresh: () => (calls++, wait(150)) });

    await commands.drag(rect.x + 50, rect.y + 20, 0, 40, 10, 16);
    await wait(150);
    expect(calls).toBe(0);
    expect(ptr.status).toBe('idle');

    await commands.drag(rect.x + 50, rect.y + 20, 0, 250, 15, 16);
    expect(calls).toBe(1);
    expect(ptr.status).toBe('refreshing');
    await wait(400);
    expect(ptr.status).toBe('idle');
  });

  it('does nothing when the list is scrolled down', async () => {
    let calls = 0;
    const { ptr, content, rect } = mount({ onRefresh: () => calls++ });
    content.scrollTop = 200;
    await commands.drag(rect.x + 50, rect.y + 20, 0, 250, 15, 16);
    expect(calls).toBe(0);
    expect(ptr.status).toBe('idle');
  });
});
