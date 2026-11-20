import type { JSX } from 'preact';
import type { Sheet, SheetOptions } from '../src';

/** A value shown as source code in the docs while a real value is used at runtime. */
export class Raw<T = unknown> {
  constructor(
    readonly code: string,
    readonly value: T,
  ) {}
}
export const raw = <T>(code: string, value: T) => new Raw(code, value);

export type ExampleOptions = { [K in keyof SheetOptions]?: SheetOptions[K] | Raw<SheetOptions[K]> };

export interface Example {
  id: string;
  title: string;
  description: string;
  /** Inner HTML of the sheet content (after the handle). */
  markup: string;
  options?: ExampleOptions;
  /** Hide the drag handle. */
  noHandle?: boolean;
  /** No "Open Drawer" trigger; driven by `controls` instead. */
  noTrigger?: boolean;
  /** Switchable variants shown as a segmented control; each merges into `options`. */
  variants?: { label: string; options: ExampleOptions; noHandle?: boolean }[];
  /** Extra CSS, shown in the code and applied live (`#sheet` / `#overlay` are rewritten per example). */
  css?: string;
  /** Extra JS appended to the code sample. */
  extraCode?: string;
  /** Extra controls rendered in the preview next to the trigger. */
  controls?: { label: string; run: (sheet: Sheet) => void }[];
  /** Additional sheets (e.g. nested). */
  children?: Example[];
  /** Show the live `getState()` below the preview. */
  live?: boolean;
}

export interface Page {
  slug: string;
  title: string;
  group: 'Usage';
  intro?: string;
  examples?: Example[];
  /** "On this page" entries for custom pages; defaults to `examples`. */
  toc?: { id: string; title: string }[];
  /** Custom page body. */
  Component?: () => JSX.Element;
}

type ExampleSection = Pick<Page, 'slug' | 'title' | 'intro' | 'examples'>;

const lorem = `<p>zupf is a drawer that you can drag, flick and snap. It works with any framework, or none, because you
  render the markup and zupf adds the behavior.</p>`;

const body = (title: string, text = lorem, extra = '') => `<div class="sheet-body">
  <h2 data-zupf-title>${title}</h2>
  ${text}
  ${extra}
</div>`;

const longList = Array.from({ length: 30 }, (_, i) => `    <li>Item ${i + 1}</li>`).join('\n');

export const examplePages: ExampleSection[] = [
  {
    slug: 'default',
    title: 'Default',
    intro: 'A bottom sheet with default settings. Drag it down, flick it, press Esc or click the overlay to close it.',
    examples: [
      {
        id: 'default',
        title: 'Default',
        description: 'Drag past 25% of the sheet’s height, or flick it down fast, to close it.',
        markup: body('Drag me down', lorem, '<button class="btn" data-zupf-close>Close</button>'),
      },
      {
        id: 'scaled',
        title: 'Scaled background',
        description:
          'Wrap your app in <code>[data-zupf-wrapper]</code> and set <code>scaleBackground</code> to push the page back while the sheet is open, as iOS does.',
        markup: body('Scaled background'),
        options: { scaleBackground: true },
      },
      {
        id: 'scaled-custom',
        title: 'Custom scale',
        description: 'Each scale value can be changed: offset, radius, translate and the body background.',
        markup: body('Custom scale'),
        options: { scaleBackground: { offset: 60, radius: 24, translate: 30, background: '#0f172a' } },
      },
    ],
  },
  {
    slug: 'snap-points',
    title: 'Snap Points',
    intro:
      "Snap points are fractions of the screen (<code>0.5</code>) or pixel strings (<code>'355px'</code>), ordered from smallest to largest. Tap the handle to cycle through them.",
    examples: [
      {
        id: 'snap',
        title: 'Snap Points',
        description:
          'A modal snap sheet dims the page from the first snap point. Drag it down and the overlay fades out as the sheet closes.',
        markup: body('Snap points', lorem, '<div class="tall">Keep dragging…</div>'),
        options: { snapPoints: ['148px', '355px', 1] },
        controls: [
          { label: '148px', run: (sheet) => (sheet.open(), sheet.snapTo('148px')) },
          { label: '355px', run: (sheet) => (sheet.open(), sheet.snapTo('355px')) },
          { label: '1', run: (sheet) => (sheet.open(), sheet.snapTo(1)) },
        ],
      },
      {
        id: 'snap-nonmodal',
        title: 'Interact with background',
        description: 'With <code>modal: false</code> the page stays usable, as in a maps app.',
        markup: body('Non-modal', lorem, '<button class="btn" data-zupf-close>Close</button>'),
        options: { snapPoints: ['148px', '355px', 1], modal: false },
      },
      {
        id: 'snap-seq',
        title: 'Snap to sequential points',
        description:
          'A fast flick normally skips snap points. <code>snapToSequentialPoint</code> moves only one point per gesture.',
        markup: body('Sequential'),
        options: { snapPoints: [0.3, 0.6, 0.9], snapToSequentialPoint: true },
      },
      {
        id: 'snap-fade',
        title: 'Custom fade index',
        description:
          '<code>fadeFromIndex</code> sets the snap point where the overlay becomes visible. With the last index (as in vaul), the page is only dimmed when the sheet is fully expanded, and the overlay fades in as you drag towards it.',
        markup: body('Custom fade index'),
        options: { snapPoints: ['148px', '355px', 1], fadeFromIndex: 2 },
      },
      {
        id: 'snap-events',
        title: 'Listening to changes',
        description: 'Use callbacks, or <code>subscribe()</code> to react to every state change.',
        markup: body('Events', '<p>The live state is shown below the preview.</p>'),
        options: {
          snapPoints: [0.25, 0.5, 1],
          onSnapPointChange: raw('(point, index) => console.log(point, index)', () => {}),
        },
        extraCode: `sheet.subscribe((state) => console.log(state));`,
        live: true,
      },
    ],
  },
  {
    slug: 'directions',
    title: 'Directions',
    intro: 'Sheets can slide in from any edge.',
    examples: [
      ...(['top', 'left', 'right'] as const).map((direction) => ({
        id: `dir-${direction}`,
        title: direction[0].toUpperCase() + direction.slice(1),
        description: `<code>direction: '${direction}'</code>. Swipe ${direction === 'top' ? 'up' : direction} to close.`,
        markup: body(`From the ${direction}`, lorem, '<button class="btn" data-zupf-close>Close</button>'),
        options: { direction },
        noHandle: direction !== 'top',
      })),
      {
        id: 'dir-scaled',
        title: 'Scaled background',
        description:
          '<code>scaleBackground</code> works with every direction. The page shrinks away from the sheet, leaving a strip of background on the opposite edge.',
        markup: body('Scaled background', lorem, '<button class="btn" data-zupf-close>Close</button>'),
        options: { scaleBackground: true },
        variants: (['bottom', 'top', 'left', 'right'] as const).map((direction) => ({
          label: direction[0].toUpperCase() + direction.slice(1),
          options: { direction },
          noHandle: direction === 'left' || direction === 'right',
        })),
      },
    ],
  },
  {
    slug: 'nested',
    title: 'Nested',
    intro:
      'Pass <code>parent</code> to nest a sheet inside another. While the child is open, the parent scales back and follows the child as you drag it.',
    examples: [
      {
        id: 'nested',
        title: 'Nested',
        description: 'Esc and outside presses only affect the sheet on top.',
        markup: body('Parent', lorem, '<button class="btn" id="open-nested">Open nested sheet</button>'),
        options: { scaleBackground: true },
        children: [
          {
            id: 'nested-child',
            title: 'Child',
            description: '',
            markup: body(
              'Nested sheet',
              '<p>Drag me. The parent sheet follows.</p>',
              '<button class="btn" data-zupf-close>Close</button>',
            ),
            options: { trigger: '#open-nested' },
          },
        ],
      },
    ],
  },
  {
    slug: 'inputs',
    title: 'Inputs',
    intro:
      'When the virtual keyboard opens on mobile, zupf moves or resizes the sheet so the focused field stays visible. Selects and <code>[data-zupf-no-drag]</code> areas never start a drag.',
    examples: [
      {
        id: 'inputs',
        title: 'Form',
        description: '<code>repositionInputs</code> is on by default.',
        markup: body(
          'Leave feedback',
          '',
          `<form class="form" onsubmit="return false">
    <input placeholder="Name" />
    <select><option>Bug</option><option>Idea</option></select>
    <textarea rows="4" placeholder="Message"></textarea>
    <button class="btn" data-zupf-close>Send</button>
  </form>`,
        ),
        options: { autoFocus: true },
      },
      {
        id: 'inputs-fixed',
        title: 'Fixed',
        description: 'With <code>fixed: true</code> the sheet shrinks instead of moving up when the keyboard opens.',
        markup: body('Fixed', '', '<input class="input" placeholder="Focus me on a phone" />'),
        options: { fixed: true },
      },
      {
        id: 'scrollable',
        title: 'Scrollable content',
        description:
          'Only the handle starts a drag, so you can scroll, select, and interact with any text inside the sheet.',
        markup: body(
          'Scrollable',
          '',
          `<div class="no-drag">You can select all the text in this sheet.</div>
  <ol class="list">
${longList}
  </ol>`,
        ),
        options: { handleOnly: true },
        css: `#sheet { --zupf-size: 80%; }
#sheet .sheet-body { flex: 1; min-height: 0; overflow-y: auto; }`,
      },
    ],
  },
  {
    slug: 'other',
    title: 'Other',
    intro: 'Behavior switches, theming and the imperative API.',
    examples: [
      {
        id: 'non-dismissible',
        title: 'Non-dismissible',
        description:
          'With <code>dismissible: false</code>, dragging, Esc and outside presses do nothing. Close buttons and <code>sheet.close()</code> still close the sheet. Without snap points there is nothing to drag, so there is no handle.',
        noHandle: true,
        markup: body(
          'Accept terms',
          '<p>You must make a choice.</p>',
          '<button class="btn" data-zupf-close>Accept</button>',
        ),
        options: { dismissible: false },
      },
      {
        id: 'handle-only',
        title: 'Handle only',
        description:
          'Only the handle starts a drag. The rest of the sheet behaves like normal page content: text can be selected, and touch scrolling works natively.',
        markup: body('Handle only', '<p>Try selecting this text. Only the handle drags the sheet.</p>'),
        options: { handleOnly: true },
      },
      {
        id: 'themed',
        title: 'Custom theme & physics',
        description: 'Style the sheet with CSS variables, and tune the motion with options.',
        markup: body('Themed', '<p>Slower, springier easing and a lower close threshold.</p>'),
        options: { duration: 700, easing: 'cubic-bezier(0.2, 1.3, 0.3, 1)', closeThreshold: 0.1 },
        css: `#sheet {
  --zupf-bg: #18181b;
  --zupf-color: #fafafa;
  --zupf-radius: 28px;
  --zupf-handle-color: #52525b;
  --zupf-size: 50%;
}
#overlay { --zupf-overlay-bg: rgb(76 29 149 / 0.45); }`,
      },
      {
        id: 'controlled',
        title: 'Controlled',
        description:
          'Leave out <code>trigger</code> and drive the sheet from your own state with <code>open()</code>, <code>close()</code> and <code>snapTo()</code>.',
        markup: body('Controlled', '<p>Opened from code.</p>'),
        options: { modal: false, snapPoints: [0.3, 0.7] },
        noTrigger: true,
        extraCode: `openButton.onclick = () => sheet.open();
closeButton.onclick = () => sheet.close();
expandButton.onclick = () => sheet.snapTo(0.7);`,
        controls: [
          { label: 'open()', run: (sheet) => sheet.open() },
          { label: 'snapTo(0.7)', run: (sheet) => (sheet.open(), sheet.snapTo(0.7)) },
          { label: 'close()', run: (sheet) => sheet.close() },
        ],
      },
    ],
  },
];
