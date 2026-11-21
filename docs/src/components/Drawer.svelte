<script lang="ts" module>
  import type { Sheet } from 'zupf';

  /** The sheet a component is rendered inside of; used to wire up nested sheets. */
  const KEY = Symbol('sheet');
  interface SheetRef {
    readonly current: Sheet | null;
  }
</script>

<script lang="ts">
  // How you'd wrap zupf in Svelte: render the markup, create the sheet in an effect, destroy it on teardown.
  import { getContext, setContext, untrack, type Snippet } from 'svelte';
  import { createSheet, type SheetOptions } from 'zupf';

  interface Props {
    id: string;
    options?: Omit<SheetOptions, 'content' | 'overlay' | 'trigger' | 'parent'>;
    /**
     * Element or selector that toggles the sheet. `null` waits for it (a `bind:this` that is not set yet);
     * leave it out for a sheet driven from code.
     */
    trigger?: HTMLElement | string | null;
    /** Nest inside the sheet from context. */
    nested?: boolean;
    noHandle?: boolean;
    /** Classes for the content element. */
    class?: string;
    onready?: (sheet: Sheet) => void;
    onclick?: (event: MouseEvent) => void;
    children?: Snippet;
  }

  let { id, options, trigger, nested = false, noHandle = false, class: className, onready, onclick, children }: Props =
    $props();

  const parent = nested ? getContext<SheetRef | undefined>(KEY) : undefined;
  let sheet = $state<Sheet | null>(null);
  setContext<SheetRef>(KEY, {
    get current() {
      return sheet;
    },
  });

  let host: HTMLDivElement;
  let content: HTMLDivElement;
  let overlay: HTMLDivElement;

  $effect(() => {
    const parentSheet = parent?.current ?? null;
    if ((nested && !parentSheet) || trigger === null) return undefined;
    // Out of the page (and its scaled wrapper) to <body>. The host is this component's only root node,
    // so Svelte still removes it on teardown wherever it is.
    document.body.append(host);
    // Options are applied once; use sheet.setOptions() for runtime changes (or re-key the component).
    const s = untrack(() =>
      createSheet({ ...options, content, overlay, trigger: trigger ?? undefined, parent: parentSheet }),
    );
    sheet = s;
    untrack(() => onready?.(s));
    return () => {
      s.destroy();
      sheet = null;
    };
  });

  const top = $derived(options?.direction === 'top');
</script>

<div bind:this={host} class="contents">
  <div bind:this={overlay} id="{id}-overlay"></div>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div bind:this={content} id="{id}-sheet" class={className} hidden {onclick}>
    <!-- The handle sits on the edge facing the page: below the content for top sheets. -->
    {#if !noHandle && !top}<div data-zupf-handle></div>{/if}
    {@render children?.()}
    {#if !noHandle && top}<div data-zupf-handle></div>{/if}
  </div>
</div>
