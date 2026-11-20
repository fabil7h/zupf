# tugsheet

A framework-agnostic, customizable drawer / bottom sheet. Ported from [vaul](https://github.com/emilkowalski/vaul): same gestures and physics, but with no React and no Radix.

- Zero dependencies, about 9 KB gzipped
- Works with plain HTML, React, Vue, Svelte, Solid, Lit and others: you render the markup, tugsheet adds the behavior
- Snap points, four directions, nested sheets, scaled background, non-modal mode, handle-only dragging
- Built-in accessibility: `role="dialog"`, focus trap, focus restore, Esc, outside press, `inert` background, scroll lock
- Includes vaul's iOS Safari fixes: keyboard repositioning, `position: fixed` body, and blocking scroll on touch
- Unstyled-friendly default CSS: every rule uses zero-specificity `:where()`, and theming is done with CSS variables

## Install

```sh
npm i tugsheet
```

```js
import { createSheet } from 'tugsheet';
import 'tugsheet/style.css'; // optional defaults
```

## Usage

```html
<div data-tugsheet-wrapper><!-- your app (only needed for scaleBackground) --></div>

<button id="open">Open</button>
<div id="overlay"></div>
<div id="sheet" hidden>
  <div data-tugsheet-handle></div>
  <h2 data-tugsheet-title>Title</h2>
  <p data-tugsheet-description>Description</p>
  <button data-tugsheet-close>Close</button>
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

Put the sheet markup outside the `[data-tugsheet-wrapper]` element. A good place is near the end of `<body>`.

## Markup hooks

| Attribute                              | Purpose                                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `data-tugsheet-handle`                 | Drag handle, found automatically inside `content`. Tapping it cycles through snap points. |
| `data-tugsheet-close`                  | Clicking it closes the sheet.                                                             |
| `data-tugsheet-title` / `-description` | Wired to `aria-labelledby` / `aria-describedby` automatically.                            |
| `data-tugsheet-no-drag`                | Dragging never starts from inside this element, and its text can be selected.             |
| `data-tugsheet-wrapper`                | Element that `scaleBackground` scales.                                                    |

tugsheet sets these attributes, which you can use in your CSS:

- `data-state="open|closed"` on content, overlay and handle
- `data-direction` and `data-snap-points` on content
- `data-dragging` on content while it is being dragged
- `data-handle-only` on content when `handleOnly` is on
- `data-draggable="false"` on content when nothing can be dragged (non-dismissible, no snap points). The default CSS then hides the handle.

## Options

| Option                                    | Default                                  |                                                                                                          |
| ----------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `content`                                 | (required)                               | Element or selector                                                                                      |
| `overlay`, `handle`, `trigger`, `wrapper` |                                          | Element or selector. `trigger` also accepts an array.                                                    |
| `container`                               | `window`                                 | Snap points are sized against this element                                                               |
| `parent`                                  |                                          | Parent `Sheet`, for nested sheets                                                                        |
| `direction`                               | `'bottom'`                               | `'top'`, `'bottom'`, `'left'` or `'right'`                                                               |
| `open`                                    | `false`                                  | Start open, without the enter animation                                                                  |
| `snapPoints`                              |                                          | Fractions (`0.5`) or px strings (`'320px'`), smallest first                                              |
| `activeSnapPoint`                         | first                                    | Snap point to start on                                                                                   |
| `fadeFromIndex`                           | `0`                                      | Snap point index from which the overlay is visible                                                       |
| `snapToSequentialPoint`                   | `false`                                  | Fast swipes never skip a snap point                                                                      |
| `dismissible`                             | `true`                                   | When `false`, dragging, Esc and outside press don't close the sheet. Close buttons and the API still do. |
| `modal`                                   | `true`                                   | Turns on the overlay, focus trap, `inert` page and scroll lock                                           |
| `handleOnly`                              | `false`                                  | Only the handle can start a drag. The content stays selectable.                                          |
| `handleCycle`                             | `true`                                   | Tapping the handle cycles through snap points                                                            |
| `closeThreshold`                          | `0.25`                                   | Fraction of the sheet size you must drag before it closes                                                |
| `velocityThreshold`                       | `0.4`                                    | px/ms. A faster release closes the sheet or moves one snap point.                                        |
| `flickVelocity`                           | `2`                                      | px/ms. A faster release jumps to the first or last snap point.                                           |
| `scrollLockTimeout`                       | `100`                                    | ms after scrolling during which dragging is ignored                                                      |
| `duration` / `easing`                     | `500` / `cubic-bezier(0.32, 0.72, 0, 1)` | Animation timing                                                                                         |
| `rubberband`                              | log curve                                | `(px) => px`: resistance when pulling past fully open                                                    |
| `scaleBackground`                         | `false`                                  | `true`, or `{ offset, radius, translate, background }`                                                   |
| `nestedDisplacement`                      | `16`                                     | How far the parent shrinks while a nested sheet is open                                                  |
| `lockScroll` / `inert` / `trapFocus`      | `true`                                   | Individual modal behaviors                                                                               |
| `autoFocus`                               | `false`                                  | Focus the first focusable element instead of the sheet itself                                            |
| `restoreFocus`                            | `true`                                   | Return focus to the previously focused element on close                                                  |
| `closeOnEscape` / `closeOnOutsidePress`   | `true`                                   |                                                                                                          |
| `repositionInputs` / `fixed`              | `true` / `false`                         | Behavior when the virtual keyboard opens                                                                 |
| `noBodyStyles`                            | `false`                                  | Never change `<body>` styles                                                                             |
| `preventScrollRestoration`                | `false`                                  |                                                                                                          |
| `shouldDrag(target, sheet)`               |                                          | Return `true` or `false` to override whether a drag starts. Return `undefined` to keep the default.      |

Callbacks:

- `onOpenChange(open, reason)`
- `onClose()`
- `onAnimationEnd(open)`
- `onDrag(event, progress)`
- `onRelease(event, open)`
- `onSnapPointChange(point, index)`

`reason` is one of `api`, `trigger`, `close-button`, `escape`, `outside`, `drag` or `handle`.

## Instance API

`open()`, `close()`, `toggle()`, `snapTo(point)`, `snapToIndex(i)`, `setOptions(partial)`, `getState()`, `subscribe(fn)`, `destroy()`, `isOpen`.

`getState()` returns `{ open, dragging, activeSnapPoint, activeSnapPointIndex }`. It returns the same object until something changes, and `subscribe` calls the listener immediately. This means a sheet works directly as a Svelte store or with React's `useSyncExternalStore`.

## Theming

```css
:root {
  --tugsheet-bg: #fff;
  --tugsheet-color: inherit;
  --tugsheet-radius: 12px; /* 20px where squircles are supported */
  --tugsheet-corner-shape: squircle; /* Chromium 139+; e.g. round, superellipse(3) */
  --tugsheet-size: 96%; /* max-height (top/bottom) or width (left/right) */
  --tugsheet-overlay-bg: rgb(0 0 0 / 0.4);
  --tugsheet-handle-color: #d4d4d8;
  --tugsheet-handle-width: 32px;
  --tugsheet-handle-height: 5px;
  --tugsheet-shadow: none;
  --tugsheet-z: 50;
}
```

Your own selectors override the defaults no matter how specific they are. You can also skip `style.css` completely. In that case keep `touch-action: none` on the content element, and hide `[hidden]` elements.

## Framework recipes

Render the elements on every render; don't put them behind a condition. tugsheet shows and hides them with the `hidden` attribute.

### React

```tsx
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
            <div data-tugsheet-handle />
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
      <div data-tugsheet-handle />
      <slot />
    </div>
  </Teleport>
</template>
```

### Svelte

```svelte
<script>
  import { onMount } from 'svelte';
  let content, overlay, sheet;
  onMount(() => {
    sheet = createSheet({ content, overlay });
    return () => sheet.destroy();
  });
</script>
<button on:click={() => sheet.open()}>Open</button>
<div bind:this={overlay} />
<div bind:this={content} hidden><div data-tugsheet-handle /><slot /></div>
<!-- `$sheet` works too: a sheet is a valid Svelte store -->
```

## Differences from vaul

- There are no components. You call `createSheet()` on your own markup.
- Radix Dialog is replaced by built-in focus trapping, `inert`, scroll lock and dismiss layers. Nested sheets stack correctly.
- `data-tugsheet-close` buttons close the sheet even when `dismissible: false`, because they are an explicit user action.
- Opening, closing and snapping all use transitions, with no CSS keyframes. Reopening a sheet while it is still closing continues smoothly from its current position.
- Animation timing, physics thresholds, the rubberband curve, scale-background values and the nested displacement are all options.
- Tapping the handle after dragging it no longer cycles snap points by accident.
- The `pointerout` release logic ignores the pointer while it is captured. vaul only avoided this problem because of a stale React closure.

## Development

The toolchain is [Vite+](https://viteplus.dev) (`vp`), one CLI that bundles:

- Vite 8 and Rolldown
- Vitest 5
- [Oxc](https://oxc.rs): Oxlint (type-aware linting), Oxfmt (formatting), and the type check through tsrs
- tsdown, with `.d.ts` generated by Oxc's isolated-declarations emitter

All configuration is in `vite.config.ts`. The docs are a Preact app in `docs/`, with JSX compiled by Oxc (no Babel).

| Command                               |                                                                      |
| ------------------------------------- | -------------------------------------------------------------------- |
| `npm run dev`                         | Docs and examples site                                               |
| `npm run check`                       | Format, lint and type check (`vp check`; add `--fix` to apply fixes) |
| `npm test`                            | Unit tests (jsdom) and browser tests (real Chromium via Playwright)  |
| `npm run test:unit` / `test:browser`  | Run one test project                                                 |
| `npm run build`                       | Library build (`vp pack`): ESM, `.d.ts`, publint                     |
| `npm run docs:build` / `docs:preview` | Static docs site in `docs-dist/`                                     |

Run `npx playwright install chromium` once before the first browser test run.

## License

MIT. Based on vaul by Emil Kowalski (MIT) and react-aria's `usePreventScroll` (Apache-2.0).
