import { Table } from '../components/Text';

export function Api() {
  return (
    <>
      <p class="lead">
        <code>createSheet(options)</code> returns a <code>Sheet</code>. Elements can be given as elements or as
        selectors.
      </p>

      <h2 id="elements">Elements</h2>
      <Table
        head={['Option', 'Default', 'Description']}
        rows={[
          ['content', 'required', 'The sheet panel.'],
          ['overlay', '', 'Backdrop element. Only shown when `modal` is on.'],
          ['handle', '[data-zupf-handle]', 'Drag handle. Found automatically inside `content`.'],
          ['trigger', '', 'Element (or array of elements) that toggles the sheet when clicked.'],
          ['wrapper', '[data-zupf-wrapper]', 'Page wrapper that `scaleBackground` scales.'],
          ['container', 'window', 'Element that snap point sizes are measured against.'],
          ['parent', '', 'Parent `Sheet`, for nested sheets.'],
        ]}
      />

      <h2 id="options">Options</h2>
      <Table
        head={['Option', 'Default', 'Description']}
        rows={[
          ['direction', "'bottom'", "`'top' | 'bottom' | 'left' | 'right'`"],
          ['open', 'false', 'Start open, without the enter animation.'],
          ['snapPoints', '', "Fractions (`0.5`) or px strings (`'320px'`), smallest first."],
          ['activeSnapPoint', 'first', 'The snap point to start on.'],
          [
            'fadeFromIndex',
            '0',
            'Snap point index from which the overlay is visible. Use the last index to dim only when fully expanded.',
          ],
          ['snapToSequentialPoint', 'false', 'Fast swipes never skip a snap point.'],
          ['dismissible', 'true', 'When off, dragging, Esc and outside presses do not close the sheet.'],
          ['modal', 'true', 'Turns on the overlay, focus trap, `inert` page and scroll lock.'],
          [
            'handleOnly',
            'false',
            'Only the handle can start a drag. The content stays selectable and keeps native touch behavior.',
          ],
          ['handleCycle', 'true', 'Tapping the handle cycles through snap points.'],
          ['closeThreshold', '0.25', 'Fraction of the sheet size you must drag before it closes.'],
          ['velocityThreshold', '0.4', 'px/ms. A faster release closes the sheet or moves one snap point.'],
          ['flickVelocity', '2', 'px/ms. A faster release jumps to the first or last snap point.'],
          ['scrollLockTimeout', '100', 'ms after scrolling during which a drag cannot start.'],
          ['duration', '500', 'Animation duration in ms.'],
          ['easing', 'cubic-bezier(0.32, 0.72, 0, 1)', 'Animation timing function.'],
          ['rubberband', 'log curve', 'Resistance when pulling past fully open: `(px) => px`.'],
          ['scaleBackground', 'false', '`true` or `{ offset, radius, translate, background }`.'],
          ['nestedDisplacement', '16', 'How far the parent shrinks while a nested sheet is open.'],
          ['lockScroll', 'true', 'Lock page scroll while open (modal only).'],
          ['inert', 'true', 'Make the rest of the page `inert` while open (modal only).'],
          ['trapFocus', 'true', 'Keep Tab focus inside the sheet (modal only).'],
          ['autoFocus', 'false', 'Focus the first focusable element instead of the sheet itself.'],
          ['restoreFocus', 'true', 'Return focus to the previously focused element on close.'],
          ['closeOnEscape', 'true', ''],
          ['closeOnOutsidePress', 'true', 'Modal only.'],
          ['repositionInputs', 'true', 'Keep focused inputs above the virtual keyboard.'],
          ['fixed', 'false', 'When the keyboard opens, shrink the sheet instead of moving it up.'],
          ['noBodyStyles', 'false', 'Never change `<body>` styles.'],
          ['preventScrollRestoration', 'false', 'Skip restoring the scroll position if the URL changed while open.'],
          ['shouldDrag', '', '`(target, sheet) => boolean | undefined`. Overrides whether a drag starts.'],
        ]}
      />

      <h2 id="callbacks">Callbacks</h2>
      <Table
        head={['Callback', 'Arguments', 'Description']}
        rows={[
          [
            'onOpenChange',
            '(open, reason)',
            'reason: `api | trigger | close-button | escape | outside | drag | handle`',
          ],
          ['onClose', '()', 'Called just before closing starts.'],
          ['onAnimationEnd', '(open)', 'Called after the open or close animation finishes.'],
          ['onDrag', '(event, progress)', 'Called on every drag frame.'],
          ['onRelease', '(event, open)', 'Called when a drag ends.'],
          ['onSnapPointChange', '(point, index)', ''],
        ]}
      />

      <h2 id="instance">Instance</h2>
      <Table
        head={['Member', 'Returns', 'Description']}
        rows={[
          ['open(), close(), toggle()', 'void', ''],
          ['snapTo(point)', 'void', 'Snap to a snap point by its value.'],
          ['snapToIndex(i)', 'void', ''],
          ['setOptions(partial)', 'void', 'Change behavior or callbacks at runtime.'],
          [
            'getState()',
            'SheetState',
            '`{ open, dragging, activeSnapPoint, activeSnapPointIndex }`. Returns the same object until something changes.',
          ],
          [
            'subscribe(fn)',
            '() => void',
            'Calls `fn` immediately, then on every change. Returns an unsubscribe function.',
          ],
          ['destroy()', 'void', 'Removes all listeners and page side effects.'],
          ['isOpen', 'boolean', ''],
        ]}
      />

      <h2 id="attributes">Attributes</h2>
      <Table
        head={['Attribute', 'Set by', 'Description']}
        rows={[
          ['data-zupf-handle', 'you', 'Drag handle.'],
          ['data-zupf-close', 'you', 'Clicking it closes the sheet.'],
          ['data-zupf-title', 'you', 'Wired to `aria-labelledby`.'],
          ['data-zupf-description', 'you', 'Wired to `aria-describedby`.'],
          ['data-zupf-no-drag', 'you', 'Dragging never starts from inside this element, and its text can be selected.'],
          ['data-zupf-wrapper', 'you', 'Element scaled by `scaleBackground`.'],
          ['data-state', 'zupf', '`open | closed` on content, overlay and handle.'],
          ['data-dragging', 'zupf', 'On the content while dragging.'],
          ['data-handle-only', 'zupf', 'On the content when `handleOnly` is on.'],
          [
            'data-draggable',
            'zupf',
            '`false` when the sheet cannot be dragged (non-dismissible, no snap points). The default CSS then hides the handle.',
          ],
        ]}
      />
    </>
  );
}
