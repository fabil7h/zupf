<script lang="ts">
  import { untrack } from 'svelte';
  import Section from '../Section.svelte';
  import { barJs, barOptions, basicCode } from './code';
  import { notifications, useContent, usePullToRefresh } from './ptr.svelte';

  let list = $state<HTMLDivElement>();
  const content = useContent(notifications);
  const pull = usePullToRefresh(() => list, { ...barOptions, onRefresh: content.load, mouse: false });
  let log = $state<string[]>([]);
  let disabled = $state(false);
  let mouse = $state(false);

  // subscribe() calls back right away: untracked, so this effect doesn't depend on `log`.
  $effect(() =>
    pull.ptr?.subscribe((s) =>
      untrack(() => (log = [...log.slice(-4), `${new Date().toLocaleTimeString()}  ${s.status}`])),
    ),
  );

  const code = {
    js: `const ptr = createPullToRefresh({
  content: '#list',
${barJs}  onRefresh: loadNewItems,
});

refreshButton.onclick = () => ptr.refresh();
ptr.setOptions({ disabled: true });
ptr.setOptions({ mouse: true });

ptr.subscribe(({ status }) => console.log(status));
ptr.status; // 'idle' | 'pulling' | 'ready' | 'refreshing'`,
    html: basicCode.html,
    css: basicCode.css,
  };
</script>

<Section
  id="api"
  title="Controlling it"
  description="`refresh()` runs one from code. `setOptions()` changes options at runtime, e.g. `disabled`. Mouse pulls are off by default: toggle them here. `subscribe()` reports every status change."
  {code}
>
  <div class="flex flex-wrap justify-center gap-2">
    <button class="btn btn-primary" onclick={() => void pull.ptr?.refresh()}>refresh()</button>
    <button
      class="btn"
      aria-pressed={disabled}
      onclick={() => {
        disabled = !disabled;
        pull.ptr?.setOptions({ disabled });
      }}
    >
      disabled: {disabled}
    </button>
    <button
      class="btn"
      aria-pressed={mouse}
      onclick={() => {
        mouse = !mouse;
        pull.ptr?.setOptions({ mouse });
      }}
    >
      mouse: {mouse}
    </button>
  </div>
  <div class="phone-frame h-105">
    <div data-zupf-ptr-indicator class="load-bar"></div>
    <div bind:this={list} class="h-full overflow-auto bg-canvas">
      <notifications.View state={content.state} />
    </div>
  </div>
  <pre class="demo-log">{log.join('\n') || `status: ${pull.status}`}</pre>
</Section>
