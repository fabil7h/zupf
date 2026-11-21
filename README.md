# zupf

Native-feeling bottom sheets, pull-to-refresh and gestures for the web. Any framework or none, zero dependencies, ~13 KB gzipped. You write the markup, zupf adds gestures, physics and accessibility.

- **Drawer**: snap points, scaled background, nested sheets, any edge, non-modal mode. Based on [vaul](https://github.com/emilkowalski/vaul), without React or Radix.
- **Pull to refresh**: on any scroller, even inside a drawer.
- **Gestures**: swipes, double taps, long presses and sequences like `'tap tap hold+swipe-up'`.
- **Accessible**: dialog role, focus trap, Esc, outside press, `inert` background, scroll lock.
- **Mobile-proof**: vaul's iOS Safari fixes for the keyboard and scroll bleed.
- **Themeable**: zero-specificity default CSS and CSS variables.

```sh
npm i @lzth/zupf
```

```js
import { createSheet, createPullToRefresh, createGestures } from '@lzth/zupf';
import '@lzth/zupf/style.css'; // optional defaults

createSheet({ content: '#sheet', trigger: '#open', snapPoints: [0.5, 1] });
createPullToRefresh({ content: '#feed', onRefresh: () => loadNewPosts() });
createGestures({ target: '#photo', gestures: { 'double-tap': () => like() } });
```

## Drawer

```html
<div data-zupf-wrapper><!-- your app (only needed for scaleBackground) --></div>

<button id="open">Open</button>
<div id="overlay"></div>
<div id="sheet" hidden>
  <div data-zupf-handle></div>
  <h2 data-zupf-title>Title</h2>
  <p data-zupf-description>Description</p>
  <button data-zupf-close>Close</button>
</div>
```

```js
const sheet = createSheet({
  content: '#sheet',
  overlay: '#overlay',
  trigger: '#open',
  snapPoints: ['148px', 0.5, 1],
  onOpenChange: (open, reason) => console.log(open, reason),
});

sheet.open();
sheet.snapTo(1);
sheet.close();
sheet.destroy();
```

Keep the sheet outside `[data-zupf-wrapper]`, e.g. at the end of `<body>`.

### Markup hooks

| Attribute                          | Purpose                                            |
| ---------------------------------- | -------------------------------------------------- |
| `data-zupf-handle`                 | Drag handle. Tapping it cycles snap points.        |
| `data-zupf-close`                  | Closes the sheet on click.                         |
| `data-zupf-title` / `-description` | Wired to `aria-labelledby` / `aria-describedby`.   |
| `data-zupf-no-drag`                | Drags never start here, and text stays selectable. |
| `data-zupf-wrapper`                | Element that `scaleBackground` scales.             |

For styling, zupf sets `data-state="open|closed"` on content, overlay and handle, plus `data-direction`, `data-snap-points`, `data-dragging`, `data-handle-only` and `data-draggable="false"` on content.

### Options

| Option                                    | Default                                  |                                                            |
| ----------------------------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| `content`                                 | (required)                               | Element or selector                                        |
| `overlay`, `handle`, `trigger`, `wrapper` |                                          | Element or selector. `trigger` also takes an array.        |
| `container`                               | `window`                                 | Snap points are sized against this                         |
| `parent`                                  |                                          | Parent `Sheet`, for nesting                                |
| `direction`                               | `'bottom'`                               | `'top'`, `'bottom'`, `'left'`, `'right'`                   |
| `open`                                    | `false`                                  | Start open, without animation                              |
| `snapPoints`                              |                                          | Fractions (`0.5`) or px (`'320px'`), smallest first        |
| `activeSnapPoint`                         | first                                    | Initial snap point                                         |
| `fadeFromIndex`                           | `0`                                      | Snap index from which the overlay shows                    |
| `snapToSequentialPoint`                   | `false`                                  | Fast swipes never skip a snap point                        |
| `dismissible`                             | `true`                                   | `false`: only close buttons and the API close it           |
| `modal`                                   | `true`                                   | Overlay, focus trap, `inert` page, scroll lock             |
| `handleOnly`                              | `false`                                  | Only the handle starts a drag                              |
| `handleCycle`                             | `true`                                   | Handle tap cycles snap points                              |
| `closeThreshold`                          | `0.25`                                   | Fraction of the size to drag before closing                |
| `velocityThreshold`                       | `0.4`                                    | px/ms to close or move one snap point                      |
| `flickVelocity`                           | `2`                                      | px/ms to jump to the first or last snap point              |
| `scrollLockTimeout`                       | `100`                                    | ms after scrolling during which drags are ignored          |
| `duration` / `easing`                     | `500` / `cubic-bezier(0.32, 0.72, 0, 1)` | Animation timing                                           |
| `rubberband`                              | log curve                                | `(px) => px` resistance past fully open                    |
| `scaleBackground`                         | `false`                                  | `true` or `{ offset, radius, translate, background }`      |
| `nestedDisplacement`                      | `16`                                     | How far the parent shrinks under a nested sheet            |
| `lockScroll` / `inert` / `trapFocus`      | `true`                                   | Individual modal behaviors                                 |
| `autoFocus`                               | `false`                                  | Focus the first focusable instead of the sheet             |
| `restoreFocus`                            | `true`                                   | Refocus the previous element on close                      |
| `closeOnEscape` / `closeOnOutsidePress`   | `true`                                   |                                                            |
| `repositionInputs` / `fixed`              | `true` / `false`                         | Virtual keyboard behavior                                  |
| `noBodyStyles`                            | `false`                                  | Never touch `<body>` styles                                |
| `preventScrollRestoration`                | `false`                                  |                                                            |
| `shouldDrag(target, sheet)`               |                                          | Return `true`/`false` to override, `undefined` for default |

Callbacks: `onOpenChange(open, reason)`, `onClose()`, `onAnimationEnd(open)`, `onDrag(event, progress)`, `onRelease(event, open)`, `onSnapPointChange(point, index)`. `reason` is `api`, `trigger`, `close-button`, `escape`, `outside`, `drag` or `handle`.

### Instance

`open()`, `close()`, `toggle()`, `snapTo(point)`, `snapToIndex(i)`, `setOptions(partial)`, `getState()`, `subscribe(fn)`, `destroy()`, `isOpen`.

`getState()` returns `{ open, dragging, activeSnapPoint, activeSnapPointIndex }` (stable until it changes), and `subscribe` calls immediately. So a sheet is a Svelte store and works with React's `useSyncExternalStore`.

### Theming

```css
:root {
  --zupf-bg: #fff;
  --zupf-color: inherit;
  --zupf-radius: 12px; /* 20px where squircles are supported */
  --zupf-corner-shape: squircle; /* Chromium 139+ */
  --zupf-size: 96%; /* max-height (top/bottom) or width (left/right) */
  --zupf-overlay-bg: rgb(0 0 0 / 0.4);
  --zupf-handle-color: #d4d4d8;
  --zupf-handle-width: 32px;
  --zupf-handle-height: 5px;
  --zupf-shadow: none;
  --zupf-z: 50;
}
```

Any selector of yours overrides the defaults. Without `style.css`, keep `touch-action: none` on the content and hide `[hidden]` elements.

## Pull to refresh

```html
<div style="position: relative; overflow: hidden">
  <div data-zupf-ptr-indicator><span data-zupf-ptr-spinner></span></div>
  <ul id="list" style="height: 100%; overflow: auto">
    …
  </ul>
</div>
```

```js
import { createPullToRefresh } from '@lzth/zupf';
import '@lzth/zupf/pull-to-refresh.css'; // optional defaults

const ptr = createPullToRefresh({
  content: '#list',
  onRefresh: () => loadNewItems(), // return a promise to keep the indicator until it settles
});
```

Pulls start only at the top of the scroller when moving down. Sideways swipes and native scrolling are untouched otherwise. Inside a drawer, put `data-zupf-no-drag` on the list so pulling refreshes instead of dragging the sheet.

- **Options**: `content`, `indicator` (default `[data-zupf-ptr-indicator]` next to content), `scroller` (default: content if it scrolls, else nearest scrollable ancestor), `onRefresh`, `threshold` (64), `max` (150), `refreshingOffset` (threshold), `mouse` (false), `disabled` (false), `duration` (300), `easing`, `onPull(offset, progress)`, `onStatusChange(status)`.
- **Instance**: `refresh()`, `setOptions(partial)`, `getState()` → `{ status }` (`idle` | `pulling` | `ready` | `refreshing`), `subscribe(fn)`, `destroy()`, `status`.
- **Styling**: `data-state` on content and indicator, `data-settling` (`refreshed` | `cancelled`) on the indicator, `data-pulling` on content, `--zupf-ptr-indicator-size`, `--zupf-ptr-spinner-color`.

## Gestures

```js
import { createGestures } from '@lzth/zupf';

const gestures = createGestures({
  target: '#photo',
  gestures: {
    'double-tap': () => like(),
    'long-press': () => openMenu(),
    'hold+swipe': (e) => move(e.direction), // 'up' | 'down' | 'left' | 'right'
  },
});

// Custom flow: tap, tap, then hold and swipe left.
const off = gestures.on('tap tap hold+swipe-left', () => unlockDebugMenu());
```

A pattern is presses separated by spaces (or an array). Each press joins tokens with `+` in the order they happen:

| Token                                                 |                                              |
| ----------------------------------------------------- | -------------------------------------------- |
| `tap`                                                 | Released without holding or moving           |
| `hold`                                                | Held still for `holdTime`. First in a press. |
| `swipe-up`, `swipe-down`, `swipe-left`, `swipe-right` | Moved `swipeDistance`. A turn adds a token.  |
| `swipe`                                               | Any direction                                |

Aliases: `double-tap`, `triple-tap`, `long-press` (`hold`). E.g. `'hold+swipe-up'`, `'swipe-down+swipe-right'` (an L).

- A gesture fires once no other bound pattern can extend it: `long-press` fires while held, unless `hold+swipe` is bound too. `tap` waits `interval` ms if `double-tap` is bound.
- `touch-action`, text selection and context menus are set from the bound patterns, so scrolling stays native wherever possible.
- Impossible patterns throw when bound. Errors in handlers are reported with `reportError` and don't affect others.

- **Handler event**: `{ gesture, steps, direction, target, event }`, `steps` e.g. `[['tap'], ['hold', 'swipe-up']]`.
- **Options**: `target`, `gestures`, `holdTime` (500), `interval` (300), `swipeDistance` (50), `slop` (10), `mouse` (true), `disabled` (false).
- **Instance**: `on(pattern, handler)` → `off`, `reset()`, `setOptions(partial)`, `getState()` → `{ pressed, steps }`, `subscribe(fn)`, `destroy()`.
- **Styling**: `data-pressed` and `data-holding` on the target.

## Frameworks

Always render the elements; zupf shows and hides them with `hidden`.

**SSR**: importing is safe on the server, where `createSheet` / `createPullToRefresh` return inert no-op instances. Create the real one on the client. The default CSS hides closed sheets until zupf attaches; add `data-zupf-open` to content and overlay to server-render one open.

### React

```tsx
import { createSheet } from '@lzth/zupf';

function Drawer({ children }) {
  const content = useRef(null),
    overlay = useRef(null);
  const [sheet, setSheet] = useState(null);
  useEffect(() => {
    const s = createSheet({ content: content.current, overlay: overlay.current });
    setSheet(s);
    return () => s.destroy();
  }, []);
  const state = useSyncExternalStore(
    (cb) => sheet?.subscribe(cb) ?? (() => {}),
    () => sheet?.getState(),
  );
  return (
    <>
      <button onClick={() => sheet?.open()}>Open</button>
      {createPortal(
        <>
          <div ref={overlay} />
          <div ref={content} hidden>
            <div data-zupf-handle />
            {children}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
```

### Vue

```vue
<script setup>
import { createSheet } from '@lzth/zupf';
const content = ref(),
  overlay = ref();
let sheet;
onMounted(() => (sheet = createSheet({ content: content.value, overlay: overlay.value })));
onBeforeUnmount(() => sheet.destroy());
</script>
<template>
  <button @click="sheet.open()">Open</button>
  <Teleport to="body">
    <div ref="overlay" />
    <div ref="content" hidden>
      <div data-zupf-handle />
      <slot />
    </div>
  </Teleport>
</template>
```

### Svelte

```svelte
<script>
  import { onMount } from 'svelte';
  import { createSheet } from '@lzth/zupf';
  let content, overlay, sheet;
  onMount(() => {
    sheet = createSheet({ content, overlay });
    return () => sheet.destroy();
  });
</script>
<button on:click={() => sheet.open()}>Open</button>
<div bind:this={overlay} />
<div bind:this={content} hidden><div data-zupf-handle /><slot /></div>
<!-- `$sheet` works too: a sheet is a valid Svelte store -->
```

## Differences from vaul

- No components: call `createSheet()` on your own markup.
- Built-in focus trap, `inert`, scroll lock and dismiss layers instead of Radix. Nested sheets stack correctly.
- Transitions only, no keyframes, so reopening mid-close continues smoothly.
- Timing, physics, rubberband, scale and nesting values are options.
- `data-zupf-close` works even with `dismissible: false`, and fixes for handle taps after drags and captured-pointer release.

## Development

Built with [Vite+](https://viteplus.dev). Docs are an [Astro](https://astro.build) site in `docs/` (npm workspace). Run `npx playwright install chromium` once for browser tests.

| Command            |                                    |
| ------------------ | ---------------------------------- |
| `npm run docs:dev` | Docs and examples                  |
| `npm run check`    | Format, lint, type check (`--fix`) |
| `npm test`         | Unit and browser tests             |
| `npm run build`    | Library build                      |

## License

MIT. Based on vaul by Emil Kowalski (MIT) and react-aria's `usePreventScroll` (Apache-2.0).
