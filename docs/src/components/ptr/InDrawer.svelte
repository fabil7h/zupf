<script lang="ts">
  import { styleTag } from '../../lib/text';
  import Drawer from '../Drawer.svelte';
  import Section from '../Section.svelte';
  import { barCss, barHtml, barJs, barOptions, drawerCss } from './code';
  import { notifications, useContent, usePullToRefresh } from './ptr.svelte';

  let trigger = $state<HTMLButtonElement | null>(null);
  let list = $state<HTMLDivElement>();
  const content = useContent(notifications);
  const pull = usePullToRefresh(() => list, { ...barOptions, onRefresh: content.load });

  const code = {
    js: `import { createSheet, createPullToRefresh } from '@lzth/zupf';
import '@lzth/zupf/style.css';
import '@lzth/zupf/pull-to-refresh.css';

createSheet({ content: '#sheet', overlay: '#overlay', trigger: '#open' });
const ptr = createPullToRefresh({
  content: '#sheet-list',
${barJs}  onRefresh: loadNotifications,
});`,
    html: `<button id="open">Notifications</button>

<div id="overlay"></div>
<div id="sheet" hidden>
  <div data-zupf-handle></div>
  <h2 data-zupf-title>Notifications</h2>
  <div class="sheet-list">
    ${barHtml}
    <div id="sheet-list" data-zupf-no-drag>…</div>
  </div>
</div>`,
    css: `${drawerCss}\n\n${barCss}`,
  };
</script>

<Section
  id="drawer"
  title="In a drawer"
  description="Put `[data-zupf-no-drag]` on the list: pulling it refreshes, while the handle and header still drag the sheet."
  {code}
>
  <div class="flex flex-wrap justify-center gap-2">
    <button bind:this={trigger} class="btn btn-primary">Open Drawer</button>
  </div>
  <Drawer id="ptr-drawer" {trigger}>
    {@html styleTag(drawerCss.replace(/#sheet\b(?!-)/g, '#ptr-drawer-sheet'))}
    <div class="flex items-baseline justify-between px-5 pb-3">
      <h2 class="m-0 text-[1.5em] font-bold" data-zupf-title>Notifications</h2>
      <span class="text-xs text-muted">{pull.status}</span>
    </div>
    <div class="sheet-list border-t border-line bg-surface">
      <div data-zupf-ptr-indicator class="load-bar"></div>
      <div bind:this={list} class="h-full overflow-auto bg-canvas" data-zupf-no-drag>
        <notifications.View state={content.state} />
      </div>
    </div>
  </Drawer>
</Section>
