import { afterEach, describe, expect, it, type TestContext } from 'vite-plus/test';
import { createGestures, createPullToRefresh, createSheet, type SheetOptions } from '../../src';
import '../../src/drawer/style.css';
import '../../src/pull-to-refresh/style.css';
import { fmt, measure, pointerDrag, type Metrics, type PointerPath } from './metrics';

/**
 * Main-thread budgets. Counts (layouts, style recalcs) are deterministic, so they gate CI.
 * Durations are only annotated: shared runners are too noisy to assert on.
 *
 * Each drag runs twice, with FEW and MANY moves. Work must not grow with the number of moves:
 * the hot path (pointermove) may write styles but must never force a layout or style recalc.
 */
const FEW = 10;
const MANY = 50;
/** Slack for one stray recalc around the measured block (transitions ending, parallel test projects). */
const NOISE = 1;

const cleanups: (() => void)[] = [];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const settle = () => wait(700);

afterEach(() => {
  cleanups.splice(0).forEach((c) => c());
  document.body.innerHTML = '';
});

function mountSheet(opts: Omit<SheetOptions, 'content'> = {}) {
  const root = document.createElement('div');
  root.innerHTML = `
    <div class="overlay"></div>
    <div class="content"><div data-zupf-handle></div><p style="height:300px;margin:0">Body</p></div>`;
  document.body.append(root);
  const content = root.querySelector<HTMLElement>('.content')!;
  const sheet = createSheet({ content, overlay: root.querySelector<HTMLElement>('.overlay'), wrapper: null, ...opts });
  cleanups.push(() => sheet.destroy());
  return { sheet, content };
}

function mountPtr() {
  const root = document.createElement('div');
  root.style.cssText = 'position:relative;overflow:hidden;height:400px';
  root.innerHTML = `
    <div data-zupf-ptr-indicator><span data-zupf-ptr-spinner></span></div>
    <div class="list" style="height:400px;overflow:auto">${'<p style="height:40px;margin:0">Item</p>'.repeat(40)}</div>`;
  document.body.append(root);
  const content = root.querySelector<HTMLElement>('.list')!;
  const ptr = createPullToRefresh({ content, duration: 50, onRefresh: () => wait(10) });
  cleanups.push(() => ptr.destroy());
  return { ptr, content };
}

function mountGestures() {
  const el = document.createElement('div');
  el.style.cssText = 'width:300px;height:300px';
  document.body.append(el);
  const g = createGestures({ target: el });
  cleanups.push(() => g.destroy());
  return { g, el };
}

interface Budget {
  layouts: number;
  styleRecalcs: number;
}

function expectWithin(m: Metrics, budget: Budget) {
  expect(m.LayoutCount, 'layouts').toBeLessThanOrEqual(budget.layouts);
  expect(m.RecalcStyleCount, 'style recalcs').toBeLessThanOrEqual(budget.styleRecalcs);
}

/** Measures `path` with FEW and MANY moves (fresh setup each), asserts the budget and that cost doesn't scale. */
async function expectFlatDrag(
  { annotate }: TestContext,
  setup: () => Promise<Omit<PointerPath, 'steps'>>,
  budget: Budget,
) {
  const few = await measure(pointerDrag({ ...(await setup()), steps: FEW }));
  cleanups.splice(0).forEach((c) => c());
  document.body.innerHTML = '';
  const many = await measure(pointerDrag({ ...(await setup()), steps: MANY }));
  await annotate(`${FEW} moves: ${fmt(few)}\n${MANY} moves: ${fmt(many)}`);

  expectWithin(few, budget);
  expectWithin(many, budget);
  expect(many.LayoutCount - few.LayoutCount, 'layouts per extra move').toBe(0);
  expect(many.RecalcStyleCount - few.RecalcStyleCount, 'style recalcs per extra move').toBeLessThanOrEqual(NOISE);
}

describe('sheet', () => {
  it('open and close', async ({ annotate }) => {
    const { sheet } = mountSheet();
    // One intentional forced reflow to start the enter transition from the closed position.
    const open = await measure(() => sheet.open());
    await settle();
    const close = await measure(() => sheet.close());
    await settle();
    await annotate(`open: ${fmt(open)}\nclose: ${fmt(close)}`);
    expectWithin(open, { layouts: 1, styleRecalcs: 4 });
    expectWithin(close, { layouts: 1, styleRecalcs: 2 });
  });

  it('dragging does not force layout per move', async (ctx) => {
    await expectFlatDrag(
      ctx,
      async () => {
        const { sheet, content } = mountSheet();
        sheet.open();
        await settle();
        const r = content.getBoundingClientRect();
        return { target: content, x: r.x + 20, y: r.y + 20, dx: 0, dy: 60 };
      },
      { layouts: 1, styleRecalcs: 4 },
    );
  });

  it('dragging between snap points does not force layout per move', async (ctx) => {
    await expectFlatDrag(
      ctx,
      async () => {
        const { sheet, content } = mountSheet({ snapPoints: [0.4, 1] });
        sheet.open();
        await settle();
        const r = content.getBoundingClientRect();
        return { target: content, x: r.x + 20, y: r.y + 20, dx: 0, dy: -100 };
      },
      { layouts: 1, styleRecalcs: 4 },
    );
  });

  it('the synthetic drag really drives the sheet', async () => {
    const { sheet, content } = mountSheet();
    sheet.open();
    await settle();
    const r = content.getBoundingClientRect();
    pointerDrag({ target: content, x: r.x + 20, y: r.y + 20, dx: 0, dy: 400, steps: FEW })();
    expect(sheet.isOpen).toBe(false);
  });
});

describe('pull to refresh', () => {
  it('pulling does not force layout per move', async (ctx) => {
    await expectFlatDrag(
      ctx,
      async () => {
        const { content } = mountPtr();
        const r = content.getBoundingClientRect();
        return { target: content, x: r.x + 20, y: r.y + 20, dx: 0, dy: 60 };
      },
      { layouts: 1, styleRecalcs: 4 },
    );
  });

  it('the synthetic pull really drives pull to refresh', () => {
    const { ptr, content } = mountPtr();
    const r = content.getBoundingClientRect();
    pointerDrag({ target: content, x: r.x + 20, y: r.y + 20, dx: 0, dy: 300, steps: FEW })();
    expect(ptr.status).toBe('refreshing');
  });
});

describe('gestures', () => {
  it('swiping does not touch layout or style', async (ctx) => {
    let swipes = 0;
    await expectFlatDrag(
      ctx,
      async () => {
        const { g, el } = mountGestures();
        g.on('swipe', () => swipes++);
        return { target: el, x: 150, y: 250, dx: 0, dy: -200 };
      },
      // Only the harness's occasional stray recalc (seen when browser projects run in parallel).
      { layouts: 0, styleRecalcs: NOISE },
    );
    expect(swipes).toBe(2);
  });
});
