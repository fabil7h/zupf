import type { RefObject } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import {
  createGestures,
  parsePattern,
  type GestureEvent,
  type Gestures,
  type GesturesOptions,
  type GesturesState,
} from '../../src';
import { Section } from '../components/Section';
import { Table, Text } from '../components/Text';
import { useInViewport } from '../useInViewport';

/** Fills over holdTime (500ms) while pressed; solid once it is a hold. */
const HoldBar = () => (
  <div class="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-current opacity-30 group-data-holding:opacity-100 group-data-pressed:scale-x-100 group-data-pressed:transition-[scale] group-data-pressed:duration-500 group-data-pressed:ease-linear motion-reduce:group-data-pressed:transition-none" />
);

// ───────────────────────────── demo helpers ─────────────────────────────

const IDLE: GesturesState = { pressed: false, steps: [] };

/** Creates the instance on mount; demos recreate it via `key`. Handlers must be stable (setState, refs). */
function useGestures(
  target: RefObject<HTMLElement | null>,
  options: Omit<GesturesOptions, 'target'>,
): { gestures: Gestures | null; state: GesturesState } {
  const [gestures, setGestures] = useState<Gestures | null>(null);
  const [state, setState] = useState<GesturesState>(IDLE);
  const visible = useInViewport(target);
  useLayoutEffect(() => {
    if (!visible) return undefined;
    const instance = createGestures({ ...options, target: target.current! });
    const unsubscribe = instance.subscribe(setState);
    setGestures(instance);
    return () => {
      unsubscribe();
      instance.destroy();
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- create once on mount; demos recreate via `key`
  }, [visible]);
  return { gestures, state };
}

/** The last fired gesture, re-keyed on every fire so its pop animation replays. */
function useLastGesture(format: (e: GestureEvent) => string = (e) => e.gesture) {
  const [last, setLast] = useState<{ label: string; n: number } | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const fire = useRef((e: GestureEvent) => {
    const label = format(e);
    setLast((prev) => ({ label, n: (prev?.n ?? 0) + 1 }));
    setLog((prev) => [`${label}   ← ${formatSteps(e.steps)}`, ...prev].slice(0, 6));
  }).current;
  return { last, log, fire };
}

const formatSteps = (steps: readonly (readonly string[])[]) => steps.map((s) => s.join('+')).join('  ');

const Result = ({ last, hint }: { last: { label: string; n: number } | null; hint: string }) =>
  last ? (
    <strong key={last.n} class="animate-gesture-pop text-[22px] font-semibold motion-reduce:animate-none">
      {last.label}
    </strong>
  ) : (
    <span class="text-sm text-muted">{hint}</span>
  );

const Log = ({ lines, empty }: { lines: string[]; empty: string }) => (
  <pre class="demo-log">{lines.length ? lines.join('\n') : empty}</pre>
);

// ───────────────────────────── taps and long press ─────────────────────────────

const holdBarCss = `#pad .hold-bar {
  position: absolute;
  inset: auto 0 0;
  height: 3px;
  background: currentColor;
  opacity: 0.3;
  transform: scaleX(0);
  transform-origin: left;
}

/* data-pressed: while a finger is down. Fill the bar over holdTime. */
#pad[data-pressed] .hold-bar {
  transform: scaleX(1);
  transition: transform 500ms linear;
}

/* data-holding: the press became a hold. */
#pad[data-holding] .hold-bar {
  opacity: 1;
}`;

function Taps() {
  const pad = useRef<HTMLDivElement>(null);
  const { last, log, fire } = useLastGesture();
  useGestures(pad, { gestures: { tap: fire, 'double-tap': fire, 'triple-tap': fire, 'long-press': fire } });
  return (
    <Section
      id="taps"
      title="Taps and long press"
      description="Bind patterns by name. A tap waits briefly in case a double tap follows; a long press fires while the finger is still down."
      code={{
        js: `import { createGestures } from 'zupf';

createGestures({
  target: '#pad',
  gestures: {
    'tap': (e) => show(e.gesture),
    'double-tap': (e) => show(e.gesture),
    'triple-tap': (e) => show(e.gesture),
    'long-press': (e) => show(e.gesture),
  },
});`,
        html: `<div id="pad">
  Tap, double tap, triple tap or hold
  <div class="hold-bar"></div>
</div>`,
        css: holdBarCss,
      }}
    >
      <div ref={pad} class="gesture-pad group">
        <Result last={last} hint="Tap, double tap, triple tap or hold" />
        <HoldBar />
      </div>
      <Log lines={log} empty="gesture   ← steps performed" />
    </Section>
  );
}

// ───────────────────────────── swipes ─────────────────────────────

const ARROWS = { up: '↑', down: '↓', left: '←', right: '→' } as const;

const swipeVariants = [
  { label: 'Swipe', pattern: 'swipe', hint: 'Swipe in any direction' },
  { label: 'Hold, then swipe', pattern: 'hold+swipe', hint: 'Hold until the bar fills, then swipe' },
  { label: 'L shapes', pattern: 'swipe-down+swipe-right', hint: 'Swipe down, then turn right' },
];

function SwipePad({ pattern, hint }: { pattern: string; hint: string }) {
  const pad = useRef<HTMLDivElement>(null);
  const { last, log, fire } = useLastGesture((e) => (e.direction ? `${ARROWS[e.direction]} ${e.gesture}` : e.gesture));
  useGestures(pad, { gestures: { [pattern]: fire } });
  return (
    <>
      <div ref={pad} class="gesture-pad group">
        <Result last={last} hint={hint} />
        <HoldBar />
      </div>
      <Log lines={log} empty="gesture   ← steps performed" />
    </>
  );
}

function Swipes() {
  const [variant, setVariant] = useState(0);
  const { pattern, hint } = swipeVariants[variant];
  return (
    <Section
      id="swipes"
      title="Swipes"
      description="`swipe` matches any direction (read `e.direction`), `swipe-up` etc. match one. `+` chains tokens within one press: `hold+swipe` is a long press then a swipe, and a turn mid-swipe adds a token."
      variants={swipeVariants.map((v) => v.label)}
      variant={variant}
      onVariant={setVariant}
      code={{
        js: `import { createGestures } from 'zupf';

createGestures({
  target: '#pad',
  gestures: {
    '${pattern}': (e) => show(e.direction), // 'up' | 'down' | 'left' | 'right'
  },
});`,
        html: `<div id="pad">${hint}</div>`,
      }}
    >
      <SwipePad key={pattern} pattern={pattern} hint={hint} />
    </Section>
  );
}

// ───────────────────────────── in a list ─────────────────────────────

interface Mail {
  id: number;
  from: string;
  subject: string;
  starred?: boolean;
}

const MAILS: Mail[] = [
  { id: 1, from: 'Ada', subject: 'Notes from the analytical engine review' },
  { id: 2, from: 'Grace', subject: 'Found a moth in relay 70' },
  { id: 3, from: 'Linus', subject: 'Re: Re: tabs vs. spaces' },
  { id: 4, from: 'Margaret', subject: 'Apollo guidance: final listing' },
  { id: 5, from: 'Dennis', subject: 'hello, world' },
  { id: 6, from: 'Barbara', subject: 'Abstraction boundaries, part 2' },
  { id: 7, from: 'Alan', subject: 'Can machines think? (draft)' },
  { id: 8, from: 'Katherine', subject: 'Trajectory numbers checked' },
  { id: 9, from: 'Edsger', subject: 'Goto considered harmful' },
  { id: 10, from: 'Frances', subject: 'Compiler optimizations, the slides' },
];

const listModes = [
  {
    label: 'Swipe actions',
    hint: 'Swipe an item left for actions, right to close. Double tap to star.',
    description:
      'Mail-app swipe actions with one instance for the whole list: find the item from `e.target`. Only horizontal swipes are bound, so the list still scrolls natively.',
    js: `import { createGestures } from 'zupf';

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
    js: `import { createGestures } from 'zupf';

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
  background: var(--bg-subtle);
}`,
  },
];

type MailAction = 'star' | 'archive' | 'delete';

const applyAction = (mails: Mail[], id: number, action: MailAction) =>
  action === 'star'
    ? mails.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m))
    : mails.filter((m) => m.id !== id);

const PAST: Record<MailAction, string> = { star: 'starred', archive: 'archived', delete: 'deleted' };

const itemId = (target: EventTarget | null) =>
  Number(((target as Element | null)?.closest?.('li') as HTMLElement | null)?.dataset.id) || null;

/** Deleting is destructive: a long, deliberate swipe after the hold. */
const HOLD_SWIPE_DISTANCE = 120;

/**
 * Slide the row out from wherever it is (dragged or open), then collapse it, and only remove it once that has
 * finished. Following rows move with `translate`, so the collapse stays compositor-friendly.
 */
/** A row being dragged after a hold: where the press started, its item and the row that moves. */
interface RowDrag {
  x: number;
  li: HTMLElement;
  row: HTMLElement;
}

/** Follow the pointer and show which action a release would run. */
function moveRow({ x, li, row }: RowDrag, clientX: number) {
  const dx = clientX - x;
  row.style.transition = 'none';
  row.style.translate = `${dx}px`;
  li.dataset.peek = dx < 0 ? 'delete' : 'archive';
  li.style.setProperty('--progress', String(Math.min(Math.abs(dx) / HOLD_SWIPE_DISTANCE, 1)));
}

/** Back to rest via the CSS transition. */
function resetRow({ li, row }: RowDrag) {
  row.style.removeProperty('translate');
  row.style.removeProperty('transition');
  li.style.removeProperty('--progress');
  delete li.dataset.peek;
}

async function animateOut(list: HTMLElement | null, id: number, dir: 'left' | 'right') {
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

interface MailRowProps {
  mail: Mail;
  swipeActions: boolean;
  active: boolean;
  open: boolean;
  leaving?: true;
  removed?: MailAction;
}

function MailRow({ mail, swipeActions, active, open, leaving, removed }: MailRowProps) {
  return (
    <li
      class="mail-item group/item"
      data-id={mail.id}
      data-active={active || undefined}
      data-open={open || undefined}
      data-leaving={leaving}
      data-removed={removed}
    >
      <div
        data-row
        class="relative z-1 grid gap-0.5 bg-canvas px-4 py-3 [transition:translate_250ms_var(--ease-ios),background_150ms] group-data-open/item:-translate-x-[192px] group-data-holding/list:group-data-active/item:bg-surface motion-reduce:transition-none!"
      >
        <span class="text-sm font-semibold">
          {mail.from} {mail.starred && <span aria-label="starred">★</span>}
        </span>
        <span class="text-[13px] text-muted">{mail.subject}</span>
      </div>
      {swipeActions && (
        <div
          class="invisible absolute inset-y-0 right-0 flex [transition:visibility_0s_250ms] group-data-open/item:visible group-data-open/item:transition-none"
          inert={!open}
        >
          <button class="swipe-action bg-warning" data-action="star">
            {mail.starred ? 'Unstar' : 'Star'}
          </button>
          <button class="swipe-action bg-info" data-action="archive">
            Archive
          </button>
          <button class="swipe-action bg-danger" data-action="delete">
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

function MailList({ swipeActions, hint }: { swipeActions: boolean; hint: string }) {
  const list = useRef<HTMLUListElement>(null);
  const [mails, setMails] = useState(MAILS);
  const [active, setActive] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);
  /** Rows sliding out before they are removed, and which way. */
  const [leaving, setLeaving] = useState<Record<number, true>>({});
  const [removed, setRemoved] = useState<Record<number, MailAction>>({});
  /** Hold mode: the row being dragged after a hold. Moved via inline styles, so moves don't re-render. */
  const drag = useRef<RowDrag | null>(null);
  /** Let the row go: back to rest (CSS transition), or into the leave animation from where it is. */
  const releaseDrag = () => {
    const d = drag.current;
    drag.current = null;
    if (d) resetRow(d);
  };
  const run = useRef((id: number, action: MailAction, via: string) => {
    // The press that removes the row ends here: keep its position, the exit animation continues from it.
    if (drag.current && Number(drag.current.li.dataset.id) === id) drag.current = null;
    setLog((prev) => [`${PAST[action]} #${id}   ← ${via}`, ...prev].slice(0, 4));
    if (action === 'star') {
      setMails((prev) => applyAction(prev, id, action));
      setOpen(null);
      return;
    }
    // Slide out the way it was swiped (open swipe actions always slide left), then collapse and remove.
    setLeaving((prev) => ({ ...prev, [id]: true }));
    setRemoved((prev) => ({ ...prev, [id]: action }));
    void animateOut(list.current, id, swipeActions || action === 'delete' ? 'left' : 'right').then(() => {
      setMails((prev) => applyAction(prev, id, action));
      setLeaving((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setOpen((current) => (current === id ? null : current));
    });
  }).current;
  const handlers = useRef<Record<string, (e: GestureEvent) => void>>(
    swipeActions
      ? {
          'swipe-left': (e) => {
            const id = itemId(e.target);
            setOpen(id);
            if (id) setLog((prev) => [`opened #${id}   ← ${e.gesture}`, ...prev].slice(0, 4));
          },
          'swipe-right': () => setOpen(null),
          'double-tap': (e) => {
            const id = itemId(e.target);
            if (id) run(id, 'star', e.gesture);
          },
        }
      : {
          'hold+swipe-left': (e) => {
            const id = itemId(e.target);
            if (id) run(id, 'delete', e.gesture);
          },
          'hold+swipe-right': (e) => {
            const id = itemId(e.target);
            if (id) run(id, 'archive', e.gesture);
          },
          'double-tap': (e) => {
            const id = itemId(e.target);
            if (id) run(id, 'star', e.gesture);
          },
        },
  ).current;
  useGestures(list, { gestures: handlers, swipeDistance: swipeActions ? undefined : HOLD_SWIPE_DISTANCE });

  const onClick = (e: MouseEvent) => {
    const button = (e.target as Element).closest<HTMLElement>('[data-action]');
    const id = itemId(e.target);
    if (button && id) run(id, button.dataset.action as MailAction, 'button');
    else setOpen(null);
  };

  return (
    <>
      <ul
        ref={list}
        id="mails"
        class="group/list h-[300px] w-[min(100%,420px)] overflow-auto rounded-[12px] border border-line bg-canvas corner-round"
        data-swipe-actions={swipeActions || undefined}
        onPointerDown={(e) => {
          setActive(itemId(e.target));
          const li = (e.target as Element).closest<HTMLElement>('li[data-id]');
          const row = li?.querySelector<HTMLElement>('[data-row]');
          if (!swipeActions && li && row) drag.current = { x: e.clientX, li, row };
        }}
        onPointerMove={(e) => {
          if (drag.current && list.current?.hasAttribute('data-holding')) moveRow(drag.current, e.clientX);
        }}
        onPointerUp={releaseDrag}
        onPointerCancel={releaseDrag}
        onClick={onClick}
      >
        {mails.map((m) => (
          <MailRow
            key={m.id}
            mail={m}
            swipeActions={swipeActions}
            active={m.id === active}
            open={m.id === open}
            leaving={leaving[m.id]}
            removed={removed[m.id]}
          />
        ))}
        {!mails.length && <li class="mail-item group/item px-4 py-3 text-[13px] text-muted">Inbox zero.</li>}
      </ul>
      <div class="flex flex-wrap justify-center gap-2">
        <button class="btn" onClick={() => setMails(MAILS)}>
          Reset
        </button>
      </div>
      <Log lines={log} empty={hint} />
    </>
  );
}

function InAList() {
  const [variant, setVariant] = useState(0);
  const mode = listModes[variant];
  return (
    <Section
      id="list"
      title="Swipe actions in a list"
      description={mode.description}
      variants={listModes.map((m) => m.label)}
      variant={variant}
      onVariant={setVariant}
      code={mode}
    >
      <MailList key={variant} swipeActions={variant === 0} hint={mode.hint} />
    </Section>
  );
}

// ───────────────────────────── custom flow ─────────────────────────────

const presets = ['tap tap hold+swipe-up', 'hold tap hold', 'swipe-down+swipe-right', 'tap hold+swipe-left+swipe-right'];

function FlowPad({ pattern }: { pattern: string }) {
  const pad = useRef<HTMLDivElement>(null);
  const [unlocked, setUnlocked] = useState(0);
  const [failed, setFailed] = useState(0);
  const steps = parsePattern(pattern);
  const prev = useRef(0);
  /** Set synchronously by the handler, which runs right after the state resets to no steps. */
  const justUnlocked = useRef(false);
  const unlock = useRef(() => {
    justUnlocked.current = true;
    setUnlocked((n) => n + 1);
  }).current;
  const { state } = useGestures(pad, { gestures: { [pattern]: unlock } });
  // The sequence emptied without unlocking: wrong press or too slow.
  useLayoutEffect(() => {
    const length = state.steps.length;
    if (length > 0) {
      justUnlocked.current = false;
      setUnlocked(0);
    } else if (prev.current > 0 && !justUnlocked.current) {
      setFailed((n) => n + 1);
    }
    prev.current = length;
  }, [state]);

  const doneCount = state.pressed ? state.steps.length - 1 : state.steps.length;
  const current = state.pressed ? state.steps.at(-1) : undefined;
  const stepState = (i: number) => {
    if (i < doneCount || unlocked) return 'done';
    return i === doneCount && state.pressed ? 'active' : 'todo';
  };
  let hint = 'Perform the steps in order';
  if (unlocked) hint = 'Unlocked';
  else if (current?.length) hint = `now: ${current.join(' + ')}`;
  return (
    <div ref={pad} class="gesture-pad group" data-unlocked={unlocked > 0 || undefined}>
      <ol
        key={failed}
        class="flex flex-wrap justify-center gap-1.5 data-failed:animate-shake motion-reduce:animate-none"
        data-failed={failed > 0 || undefined}
        aria-label="Progress"
      >
        {steps.map((step, i) => (
          <li
            key={i}
            class="rounded-full border border-line-strong bg-canvas px-2.5 py-1 font-system-mono text-xs leading-[normal] text-muted transition-[background,color] duration-150 data-[state=active]:border-fg data-[state=active]:text-fg data-[state=done]:border-accent data-[state=done]:bg-accent data-[state=done]:text-accent-fg"
            data-state={stepState(i)}
          >
            {step.join(' + ')}
          </li>
        ))}
      </ol>
      <span class="text-sm text-muted">{hint}</span>
      <HoldBar />
    </div>
  );
}

function CustomFlow() {
  const [input, setInput] = useState(presets[0]);
  let error = '';
  try {
    parsePattern(input);
  } catch (e) {
    error = (e as Error).message.replace('[zupf] ', '');
  }
  // Keep the last valid pattern while the input is being edited.
  const valid = useRef(presets[0]);
  if (!error) valid.current = input.trim().replace(/\s+/g, ' ');
  const pattern = valid.current;
  return (
    <Section
      id="custom"
      title="Custom flows"
      description="Any sequence is a pattern: secret gestures, unlock flows, power-user shortcuts. Type your own below. `subscribe` reports the presses so far, so you can show progress."
      code={{
        js: `import { createGestures } from 'zupf';

const gestures = createGestures({ target: '#pad' });

const off = gestures.on('${pattern}', () => unlock());

gestures.subscribe(({ pressed, steps }) => {
  // steps: [['tap'], ['tap'], ['hold']], the last one in progress while pressed
  renderProgress(pressed ? steps.length - 1 : steps.length);
});`,
        html: `<div id="pad">
  <ol class="progress">…</ol>
</div>`,
      }}
    >
      <div class="grid w-[min(100%,520px)] gap-2.5">
        <input
          class="h-9 rounded-lg border border-line-strong bg-canvas px-3 font-system-mono text-sm leading-[normal] text-fg aria-invalid:border-danger"
          aria-label="Pattern"
          value={input}
          spellcheck={false}
          autocomplete="off"
          aria-invalid={!!error}
          onInput={(e) => setInput(e.currentTarget.value)}
        />
        <div class="flex flex-wrap justify-center gap-2">
          {presets.map((p) => (
            <button
              key={p}
              class="btn h-7 px-2.5 font-system-mono text-xs leading-[normal] font-normal aria-pressed:border-fg"
              aria-pressed={p === pattern}
              onClick={() => setInput(p)}
            >
              {p}
            </button>
          ))}
        </div>
        {error && <p class="m-0 text-[13px] text-danger">{error}</p>}
      </div>
      <FlowPad key={pattern} pattern={pattern} />
    </Section>
  );
}

// ───────────────────────────── page ─────────────────────────────

export function GesturesPage() {
  return (
    <>
      <p class="text-base text-muted">
        Describe a gesture as a string, like <code>'double-tap'</code> or <code>'tap tap hold+swipe-left'</code>, and
        get a callback. Touch, pen and mouse. Scrolling stays native wherever it can.
      </p>
      <Taps />
      <InAList />
      <CustomFlow />
      <Swipes />
      <section id="patterns">
        <h2>Patterns</h2>
        <p>
          <Text>
            {
              'A pattern is a list of presses separated by spaces (or an array). Each press is a combination of tokens joined with `+`, in the order they happen while the finger is down.'
            }
          </Text>
        </p>
        <Table
          head={['Token', 'Alias', 'Description']}
          rows={[
            ['tap', '', 'Pressed and released without holding or moving more than `slop`.'],
            ['hold', 'long-press', 'Held still for `holdTime`.'],
            ['swipe-up', '', 'Moved `swipeDistance` up. Also `swipe-down`, `swipe-left`, `swipe-right`.'],
            ['swipe', '', 'Any swipe direction.'],
            ['tap tap', 'double-tap', 'Two presses within `interval`.'],
            ['tap tap tap', 'triple-tap', ''],
          ]}
        />
        <p>
          <Text>
            {
              "A gesture fires as soon as no other bound pattern can still extend it: right away, or once the next press goes elsewhere, or after `interval`. A press that doesn't fit restarts the sequence from that press, and `hold` only counts when a bound pattern uses it. Handlers get `{ gesture, steps, direction, target, event }`."
            }
          </Text>
        </p>
      </section>
      <section id="options">
        <h2>Options</h2>
        <Table
          head={['Option', 'Default', 'Description']}
          rows={[
            ['target', '', 'Element that receives the presses. Element or selector.'],
            ['gestures', '', "Initial bindings, keyed by pattern: `{ 'double-tap': fn }`."],
            [
              'holdTime',
              '500',
              'ms a press must be held still to count as `hold`. Only recognized when a pattern uses `hold`.',
            ],
            ['interval', '300', 'Max ms between releasing and pressing again within a sequence.'],
            ['swipeDistance', '50', 'px a press must move in one direction to count as a swipe.'],
            ['slop', '10', 'px a press may move and still be a `tap` or `hold`.'],
            ['mouse', 'true', 'Recognize mouse presses (primary button). Touch and pen always work.'],
            ['disabled', 'false', 'Ignore input.'],
          ]}
        />
        <h3>Instance</h3>
        <p>
          <code>on(pattern, handler)</code> (returns <code>off</code>), <code>reset()</code>,{' '}
          <code>setOptions(partial)</code>, <code>getState()</code> → <code>{'{ pressed, steps }'}</code>,{' '}
          <code>subscribe(fn)</code>, <code>destroy()</code>.
        </p>
        <h3>Browser defaults</h3>
        <p>
          <Text>
            {
              "Derived from the bindings and restored on `destroy()`: `touch-action` blocks scrolling only on the axes that swipe from the start of a press, and is `manipulation` (no double-tap zoom) for multi-press patterns. With `hold` bound, the iOS callout, text selection and Android's context menu are off. A mouse hold or swipe that fires doesn't also click. A mouse swipe can still select text unless `hold` is bound (or you set `user-select: none`). Patterns that can never match throw when bound: `hold` must be first in a press and only once, and the same direction twice in a row is one swipe. An exception in a handler or subscriber is reported with `reportError` and doesn't affect the others."
            }
          </Text>
        </p>
        <h3>Styling hooks</h3>
        <Table
          head={['Hook', 'On', 'Description']}
          rows={[
            ['data-zupf-gestures', 'target', 'Set while attached.'],
            ['data-pressed', 'target', 'A press is in progress.'],
            ['data-holding', 'target', 'The press became a `hold`.'],
          ]}
        />
      </section>
    </>
  );
}
