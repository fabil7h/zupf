<script lang="ts" module>
  import type { Lang } from '../lib/highlight';

  export interface CodeTab {
    label?: string;
    lang: Lang;
    code: string;
  }
</script>

<script lang="ts">
  // Code is highlighted while prerendering only (see lib/highlight.ts): `tabs` must not change after hydration.
  // For code that depends on a variant, render one CodeBlock per variant and hide the others.
  import { untrack } from 'svelte';
  import { highlight } from '../lib/highlight';
  import CopyIcon from './CopyIcon.svelte';

  let { tabs }: { tabs: CodeTab[] } = $props();
  const uid = $props.id();
  let active = $state(0);
  let copied = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const showTabs = $derived(tabs.length > 1 || !!tabs[0]?.label);
  const codes = $derived(tabs.map((tab) => tab.code.trim()));
  // Every tab is prerendered, so switching tabs only toggles `hidden`.
  const html = $derived(tabs.map((tab, i) => highlight(codes[i], tab.lang)));

  if (import.meta.env.DEV) {
    const initial = untrack(() => codes.join('\0'));
    $effect(() => {
      if (codes.join('\0') !== initial) {
        console.error('CodeBlock: code changed after hydration and is no longer highlighted.', codes);
      }
    });
  }

  async function copy() {
    try {
      // From the rendered panel: its text is the code (Shiki only adds spans), so the browser needs no copy of it.
      await navigator.clipboard.writeText(document.getElementById(`${uid}-panel-${active}`)?.textContent ?? '');
    } catch {
      return; // Clipboard denied (permissions, insecure context): leave the button as is.
    }
    copied = true;
    clearTimeout(timer);
    timer = setTimeout(() => (copied = false), 1200);
  }

  // Roving tabindex (WAI-ARIA tabs): only the active tab is focusable, the arrow keys move between tabs.
  function onTabKey(event: KeyboardEvent) {
    const last = tabs.length - 1;
    const next = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    active = (next + tabs.length) % tabs.length; // wraps around
    document.getElementById(`${uid}-tab-${active}`)?.focus();
  }
</script>

<div class="mt-3 mb-4 overflow-hidden rounded-2xl border border-line-strong bg-code">
  <div class="flex min-h-10 items-stretch border-b border-line pr-2 pl-4.5">
    {#if showTabs}
      <div class="flex gap-5" role="tablist" tabindex="-1" onkeydown={onTabKey}>
        {#each tabs as tab, i (i)}
          <button
            class="code-tab"
            role="tab"
            id="{uid}-tab-{i}"
            aria-controls="{uid}-panel-{i}"
            aria-selected={i === active}
            tabindex={i === active ? 0 : -1}
            onclick={() => (active = i)}
          >
            {tab.label}
          </button>
        {/each}
      </div>
    {/if}
    <button
      class="ml-auto inline-grid cursor-pointer place-items-center self-center rounded-sm p-1.5 text-muted transition-ui hover:bg-surface hover:text-fg active:scale-90 active:duration-80"
      aria-label={copied ? 'Copied' : 'Copy code'}
      title="Copy code"
      onclick={() => void copy()}
    >
      <CopyIcon {copied} />
    </button>
  </div>
  {#each tabs as _, i (i)}
    <pre
      class="overflow-x-auto px-4.5 py-4 leading-[1.6]"
      id="{uid}-panel-{i}"
      role={showTabs ? 'tabpanel' : undefined}
      aria-labelledby={showTabs ? `${uid}-tab-${i}` : undefined}
      hidden={i !== active}><!-- Escaped by Shiki (lib/shiki.ts). --><code
        ><!-- svelte-ignore hydration_html_changed -->{@html html[i]}</code
      ></pre>
  {/each}
</div>
