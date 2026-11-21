import type { Sheet, SheetOptions } from 'zupf';

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
  /** Plain text; `backticks` become <code>. */
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

export interface ExampleSection {
  slug: string;
  title: string;
  /** Plain text; `backticks` become <code>. */
  intro?: string;
  examples?: Example[];
}

const lorem = `<p>Drag, flick or snap me. You render the markup, zupf adds the behavior.</p>`;

const body = (title: string, text = lorem, extra = '') => `<div class="sheet-body">
  <h2 data-zupf-title>${title}</h2>
  ${text}
  ${extra}
</div>`;

const longList = Array.from({ length: 30 }, (_, i) => `    <li>Item ${i + 1}</li>`).join('\n');

export const examplePages: ExampleSection[] = [
  {
    slug: 'basics',
    title: 'Basics',
    intro: 'Drag it, flick it, press Esc or tap outside to close.',
    examples: [
      {
        id: 'default',
        title: 'Default',
        description: 'No options needed. Drag past 25% of its height, or flick, to close.',
        markup: body('Drag me down', lorem, '<button class="btn" data-zupf-close>Close</button>'),
      },
      {
        id: 'scaled',
        title: 'Scaled background',
        description:
          'The page shrinks back behind the sheet, like iOS. Wrap your app in `[data-zupf-wrapper]` and set `scaleBackground`, or pass `{ offset, radius, translate, background }` to tune it.',
        markup: body('Scaled background'),
        options: { scaleBackground: true },
      },
    ],
  },
  {
    slug: 'snap-points',
    title: 'Snap Points',
    intro:
      "Fractions (`0.5`) or pixels (`'355px'`), smallest first. Tap the handle to cycle. `fadeFromIndex` picks where the overlay appears; `snapToSequentialPoint` stops fast flicks from skipping points.",
    examples: [
      {
        id: 'snap',
        title: 'Snap points',
        description: 'Rests at each point. The overlay fades out as you drag below the first.',
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
        description: 'Maps-style: `modal: false` keeps the page usable behind the sheet.',
        markup: body('Non-modal', lorem, '<button class="btn" data-zupf-close>Close</button>'),
        options: { snapPoints: ['148px', '355px', 1], modal: false },
      },
      {
        id: 'snap-events',
        title: 'Listening to changes',
        description: 'Use callbacks, or `subscribe()` for every state change.',
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
    slug: 'nesting',
    title: 'Nested',
    intro: 'Pass `parent` to stack sheets. Esc and outside presses only close the top one.',
    examples: [
      {
        id: 'nested',
        title: 'Nested',
        description: 'The parent scales back while the child is open, and follows it as you drag.',
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
    slug: 'directions',
    title: 'Directions',
    intro: 'Slide in from any edge: side menus, top banners, settings panels.',
    examples: [
      {
        id: 'dir-scaled',
        title: 'Any edge',
        description:
          'Pick an edge with `direction` and swipe toward it to close. `scaleBackground` works on every edge.',
        markup: body('From any edge', lorem, '<button class="btn" data-zupf-close>Close</button>'),
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
    slug: 'forms',
    title: 'Forms and scrolling',
    intro: 'Mobile keyboards, selects and long content just work.',
    examples: [
      {
        id: 'inputs',
        title: 'Form',
        description:
          'When the keyboard opens, the sheet moves up so the focused field stays visible (`repositionInputs`, on by default). With `fixed: true` it shrinks instead.',
        markup: body(
          'Leave feedback',
          '',
          `<div class="form">
    <input placeholder="Name" />
    <select><option>Bug</option><option>Idea</option></select>
    <textarea rows="4" placeholder="Message"></textarea>
    <button class="btn" data-zupf-close>Send</button>
  </div>`,
        ),
        options: { autoFocus: true },
      },
      {
        id: 'scrollable',
        title: 'Scrollable content',
        description: 'With `handleOnly` only the handle drags, so the content scrolls and text can be selected.',
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
    slug: 'customize',
    title: 'Customize',
    intro: 'Theme, physics, behavior switches and the imperative API.',
    examples: [
      {
        id: 'themed',
        title: 'Theme and physics',
        description: 'CSS variables for the look, options for the motion.',
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
        description: 'Skip `trigger` and drive it from your own state with `open()`, `close()` and `snapTo()`.',
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
      {
        id: 'non-dismissible',
        title: 'Non-dismissible',
        description:
          'With `dismissible: false` only close buttons and `sheet.close()` close it. Nothing to drag, so no handle.',
        noHandle: true,
        markup: body(
          'Accept terms',
          '<p>You must make a choice.</p>',
          '<button class="btn" data-zupf-close>Accept</button>',
        ),
        options: { dismissible: false },
      },
    ],
  },
];
