// Data and DOM helpers for the swipe-actions mail list demo.
export interface Mail {
  id: number;
  from: string;
  subject: string;
  starred?: boolean;
}

export const MAILS: Mail[] = [
  { id: 1, from: 'Ada', subject: 'Notes from the analytical engine review' },
  { id: 2, from: 'Grace', subject: 'Found a moth in relay 70' },
  { id: 3, from: 'Linus', subject: 'Re: Re: tabs vs. spaces' },
  { id: 4, from: 'Margaret', subject: 'Apollo guidance: final listing' },
  { id: 5, from: 'Dennis', subject: 'hello, world' },
  { id: 6, from: 'Barbara', subject: 'Abstraction boundaries, part 2' },
  { id: 7, from: 'Alan', subject: 'Can machines think? (draft)' },
  { id: 8, from: 'Edsger', subject: 'Goto considered harmful' },
];

export const listModes = [
  {
    label: 'Swipe actions',
    hint: 'Swipe an item left for actions, right to close. Double tap to star.',
    description:
      'Mail-app swipe actions with one instance for the whole list: find the item from `e.target`. Only horizontal swipes are bound, so the list still scrolls natively.',
    js: `import { createGestures } from '@lzth/zupf';

const list = document.querySelector('#mails');
const item = (e) => e.target.closest('li');

createGestures({
  target: list,
  gestures: {
    'swipe-left': (e) => open(item(e)), // reveals the actions
    'swipe-right': (e) => close(item(e)),
    'double-tap': (e) => toggleStar(item(e)),
  },
});

// The action buttons are plain buttons.
list.addEventListener('click', (e) => {
  const actionButton = e.target.closest('[data-action]');
  if (actionButton) run(actionButton.dataset.action, item(e));
});`,
    html: `<ul id="mails">
  <li>
    <div class="row">…</div>
    <div class="actions">
      <button data-action="star">Star</button>
      <button data-action="archive">Archive</button>
      <button data-action="delete">Delete</button>
    </div>
  </li>
</ul>`,
    css: `#mails li {
  position: relative;
  overflow: hidden;
}

#mails .row {
  position: relative;
  z-index: 1;
  transition: translate 250ms cubic-bezier(0.32, 0.72, 0, 1);
}

#mails li[data-open] .row {
  translate: -192px; /* 3 × 64px buttons */
}

#mails .actions {
  position: absolute;
  inset: 0 0 0 auto;
  display: flex;
}`,
  },
  {
    label: 'Hold, then swipe',
    hint: 'Hold an item, then swipe left (delete) or right (archive). Double tap to star.',
    description:
      'Swipes after a `hold` never block scrolling: the page only stays still once a press holds. While held, the row follows the pointer (plain `pointermove` plus the `data-holding` hook).',
    js: `import { createGestures } from '@lzth/zupf';

const list = document.querySelector('#mails');
const item = (e) => e.target.closest('li');

createGestures({
  target: list,
  swipeDistance: 120, // a deliberate swipe for destructive actions
  gestures: {
    'hold+swipe-left': (e) => remove(item(e)), // slides out, then collapses
    'hold+swipe-right': (e) => archive(item(e)),
    'double-tap': (e) => toggleStar(item(e)),
  },
});

// Feedback while held: the row follows the pointer. Inline styles, no re-render.
let start = null;
list.addEventListener('pointerdown', (e) => (start = { x: e.clientX, row: item(e)?.querySelector('.row') }));
list.addEventListener('pointermove', (e) => {
  if (!start?.row || !list.hasAttribute('data-holding')) return;
  start.row.style.transition = 'none';
  start.row.style.translate = \`\${e.clientX - start.x}px\`;
});
list.addEventListener('pointerup', () => {
  start?.row?.style.removeProperty('translate'); // CSS transition snaps it back
  start?.row?.style.removeProperty('transition');
  start = null;
});`,
    html: `<ul id="mails">
  <li>
    <div class="row">…</div>
  </li>
</ul>`,
    css: `#mails .row {
  transition: translate 250ms cubic-bezier(0.32, 0.72, 0, 1);
}

/* Highlight the held item: the list gets data-holding,
   the app marks the pressed item itself. */
#mails[data-holding] li[data-active] .row {
  background: #f4f4f5;
}`,
  },
];

export type MailAction = 'star' | 'archive' | 'delete';

export const applyAction = (mails: Mail[], id: number, action: MailAction) =>
  action === 'star'
    ? mails.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m))
    : mails.filter((m) => m.id !== id);

export const PAST: Record<MailAction, string> = { star: 'starred', archive: 'archived', delete: 'deleted' };

export const itemId = (target: EventTarget | null) =>
  Number(((target as Element | null)?.closest?.('li') as HTMLElement | null)?.dataset.id) || null;

/** Deleting is destructive: a long, deliberate swipe after the hold. */
export const HOLD_SWIPE_DISTANCE = 120;

/** A row being dragged after a hold: where the press started, its item and the row that moves. */
export interface RowDrag {
  x: number;
  li: HTMLElement;
  row: HTMLElement;
}

/** Follow the pointer and show which action a release would run. */
export function moveRow({ x, li, row }: RowDrag, clientX: number) {
  const dx = clientX - x;
  row.style.transition = 'none';
  row.style.translate = `${dx}px`;
  li.dataset.peek = dx < 0 ? 'delete' : 'archive';
  li.style.setProperty('--progress', String(Math.min(Math.abs(dx) / HOLD_SWIPE_DISTANCE, 1)));
}

/** Back to rest via the CSS transition. */
export function resetRow({ li, row }: RowDrag) {
  row.style.removeProperty('translate');
  row.style.removeProperty('transition');
  li.style.removeProperty('--progress');
  delete li.dataset.peek;
}

/**
 * Slide the row out from wherever it is (dragged or open), then collapse it, and only remove it once that has
 * finished. Following rows move with `translate`, so the collapse stays compositor-friendly.
 */
export async function animateOut(list: HTMLElement | null, id: number, dir: 'left' | 'right') {
  const li = list?.querySelector<HTMLElement>(`li[data-id="${id}"]`);
  const row = li?.querySelector<HTMLElement>('[data-row]');
  if (!li || !row || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const from = getComputedStyle(row).translate;
  row.style.transition = 'none'; // the snap-back transition mustn't fight the animation
  li.style.removeProperty('--progress');
  delete li.dataset.peek;
  const animations: Animation[] = [];
  try {
    const exit = row.animate(
      [{ translate: from === 'none' ? '0px' : from }, { translate: dir === 'left' ? '-101%' : '101%' }],
      { duration: 250, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'forwards' },
    );
    animations.push(exit);
    await exit.finished;
    const height = li.offsetHeight;
    const children = Array.from(li.parentElement?.children ?? []);
    const siblings = children
      .slice(children.indexOf(li) + 1)
      .filter((element): element is HTMLElement => element instanceof HTMLElement);
    const collapse = [
      // Opacity, not clip-path: stays on the compositor. Rows below slide up over it anyway.
      li.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 200,
        easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
        fill: 'forwards',
      }),
      ...siblings.map((sibling) =>
        sibling.animate([{ translate: '0 0' }, { translate: `0 -${height}px` }], {
          duration: 200,
          easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
          fill: 'forwards',
          // Adds up with the collapse of a row above that is still running (several rows removed in a row).
          composite: 'add',
        }),
      ),
    ];
    animations.push(...collapse);
    await Promise.all(collapse.map((animation) => animation.finished));
  } catch {
    /* cancelled, e.g. the element went away */
  } finally {
    for (const animation of animations) animation.cancel();
  }
}
