<script lang="ts">
  import Section from '../Section.svelte';
  import { barOptions, basicCode } from './code';
  import { inbox, useContent, usePullToRefresh } from './ptr.svelte';

  let list = $state<HTMLDivElement>();
  const content = useContent(inbox);
  const pull = usePullToRefresh(() => list, { ...barOptions, onRefresh: content.load });
</script>

<Section
  id="basic"
  title="Basic"
  description="Pull the list down and let go. Return a promise from `onRefresh` and the loading bar stays until it settles. `onPull` hands the progress to the bar; the indicator is plain markup you style in CSS (more styles below)."
  code={basicCode}
>
  <div class="phone-frame h-105">
    <div data-zupf-ptr-indicator class="load-bar"></div>
    <div bind:this={list} class="h-full overflow-auto bg-canvas">
      <inbox.View state={content.state} />
    </div>
  </div>
  <pre class="demo-log">status: {pull.status}</pre>
</Section>
