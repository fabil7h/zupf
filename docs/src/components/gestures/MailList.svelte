<script lang="ts">
  import type { GestureEvent } from '@lzth/zupf';
  import { useGestures } from './gestures.svelte';
  import {
    HOLD_SWIPE_DISTANCE,
    MAILS,
    PAST,
    animateOut,
    applyAction,
    itemId,
    moveRow,
    resetRow,
    type MailAction,
    type RowDrag,
  } from './mail';

  let { swipeActions, hint }: { swipeActions: boolean; hint: string } = $props();

  let list = $state<HTMLUListElement>();
  let mails = $state.raw(MAILS);
  let active = $state<number | null>(null);
  let open = $state<number | null>(null);
  let log = $state.raw<string[]>([]);
  /** Rows sliding out before they are removed, and the action that removes them. */
  let leaving = $state.raw<Record<number, true>>({});
  let removed = $state.raw<Record<number, MailAction>>({});
  /** Hold mode: the row being dragged after a hold. Moved via inline styles, so moves don't re-render. */
  let drag: RowDrag | null = null;

  const addLog = (line: string) => (log = [line, ...log].slice(0, 4));

  /** Let the row go: back to rest (CSS transition). */
  function releaseDrag() {
    const d = drag;
    drag = null;
    if (d) resetRow(d);
  }

  function run(id: number, action: MailAction, via: string) {
    // The press that removes the row ends here: keep its position, the exit animation continues from it.
    if (drag && Number(drag.li.dataset.id) === id) drag = null;
    addLog(`${PAST[action]} #${id}   ← ${via}`);
    if (action === 'star') {
      mails = applyAction(mails, id, action);
      open = null;
      return;
    }
    // Slide out the way it was swiped (open swipe actions always slide left), then collapse and remove.
    leaving = { ...leaving, [id]: true };
    removed = { ...removed, [id]: action };
    void animateOut(list ?? null, id, swipeActions || action === 'delete' ? 'left' : 'right').then(() => {
      mails = applyAction(mails, id, action);
      const { [id]: _, ...rest } = leaving;
      leaving = rest;
      if (open === id) open = null;
    });
  }

  const onItem = (action: MailAction) => (e: GestureEvent) => {
    const id = itemId(e.target);
    if (id) run(id, action, e.gesture);
  };

  // Recreated per mode (keyed by the parent), so reading the prop once is intended.
  // svelte-ignore state_referenced_locally
  const handlers: Record<string, (e: GestureEvent) => void> = swipeActions
    ? {
        'swipe-left': (e) => {
          const id = itemId(e.target);
          open = id;
          if (id) addLog(`opened #${id}   ← ${e.gesture}`);
        },
        'swipe-right': () => (open = null),
        'double-tap': onItem('star'),
      }
    : { 'hold+swipe-left': onItem('delete'), 'hold+swipe-right': onItem('archive'), 'double-tap': onItem('star') };
  // svelte-ignore state_referenced_locally
  useGestures(() => list, { gestures: handlers, swipeDistance: swipeActions ? undefined : HOLD_SWIPE_DISTANCE });

  function onclick(e: MouseEvent) {
    const button = (e.target as Element).closest<HTMLElement>('[data-action]');
    const id = itemId(e.target);
    if (button && id) run(id, button.dataset.action as MailAction, 'button');
    else open = null;
  }

  function onpointerdown(e: PointerEvent) {
    active = itemId(e.target);
    const li = (e.target as Element).closest<HTMLElement>('li[data-id]');
    const row = li?.querySelector<HTMLElement>('[data-row]');
    if (!swipeActions && li && row) drag = { x: e.clientX, li, row };
  }

  function onpointermove(e: PointerEvent) {
    if (drag && list?.hasAttribute('data-holding')) moveRow(drag, e.clientX);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<ul
  bind:this={list}
  id="mails"
  class="group/list h-75 w-[min(100%,420px)] overflow-auto rounded-[12px] border border-line bg-canvas corner-round"
  data-swipe-actions={swipeActions || undefined}
  {onpointerdown}
  {onpointermove}
  onpointerup={releaseDrag}
  onpointercancel={releaseDrag}
  {onclick}
>
  {#each mails as mail (mail.id)}
    <li
      class="mail-item group/item"
      data-id={mail.id}
      data-active={mail.id === active || undefined}
      data-open={mail.id === open || undefined}
      data-leaving={leaving[mail.id]}
      data-removed={removed[mail.id]}
    >
      <div
        data-row
        class="relative z-1 grid gap-0.5 bg-canvas px-4 py-3 [transition:translate_250ms_var(--ease-ios),background_150ms] group-data-open/item:-translate-x-48 group-data-holding/list:group-data-active/item:bg-surface motion-reduce:transition-none!"
      >
        <span class="text-sm font-semibold">
          {mail.from}
          {#if mail.starred}<span aria-label="starred">★</span>{/if}
        </span>
        <span class="text-[13px] text-muted">{mail.subject}</span>
      </div>
      {#if swipeActions}
        <div
          class="invisible absolute inset-y-0 right-0 flex [transition:visibility_0s_250ms] group-data-open/item:visible group-data-open/item:transition-none"
          inert={mail.id !== open}
        >
          <button class="swipe-action bg-warning" data-action="star">{mail.starred ? 'Unstar' : 'Star'}</button>
          <button class="swipe-action bg-info" data-action="archive">Archive</button>
          <button class="swipe-action bg-danger" data-action="delete">Delete</button>
        </div>
      {/if}
    </li>
  {:else}
    <li class="mail-item group/item px-4 py-3 text-[13px] text-muted">Inbox zero.</li>
  {/each}
</ul>
<div class="flex flex-wrap justify-center gap-2">
  <button
    class="btn"
    onclick={() => {
      mails = MAILS;
      removed = {};
    }}>Reset</button
  >
</div>
<pre class="demo-log">{log.length ? log.join('\n') : hint}</pre>
