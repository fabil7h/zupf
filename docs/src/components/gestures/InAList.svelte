<script lang="ts">
  import Section from '../Section.svelte';
  import MailList from './MailList.svelte';
  import { listModes } from './mail';

  let variant = $state(0);
  const mode = $derived(listModes[variant]);
</script>

<Section
  id="list"
  title="Swipe actions in a list"
  description={mode.description}
  variants={listModes.map((m) => m.label)}
  bind:variant
  code={listModes}
>
  {#key variant}
    <MailList swipeActions={variant === 0} hint={mode.hint} />
  {/key}
</Section>
