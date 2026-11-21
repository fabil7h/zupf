<script lang="ts">
  import { untrack } from 'svelte';
  import { parsePattern } from 'zupf';
  import { useGestures } from './gestures.svelte';
  import HoldBar from './HoldBar.svelte';

  let { pattern }: { pattern: string } = $props();

  let pad = $state<HTMLDivElement>();
  let unlocked = $state(0);
  let failed = $state(0);
  const steps = $derived(parsePattern(pattern));
  let prev = 0;
  /** Set synchronously by the handler, which runs right after the state resets to no steps. */
  let justUnlocked = false;
  const unlock = () => {
    justUnlocked = true;
    unlocked += 1;
  };
  // Recreated per pattern (keyed by the parent), so reading the prop once is intended.
  // svelte-ignore state_referenced_locally
  const g = useGestures(() => pad, { gestures: { [pattern]: unlock } });

  // The sequence emptied without unlocking: wrong press or too slow.
  $effect(() => {
    const length = g.state.steps.length;
    untrack(() => {
      if (length > 0) {
        justUnlocked = false;
        unlocked = 0;
      } else if (prev > 0 && !justUnlocked) {
        failed += 1;
      }
    });
    prev = length;
  });

  const doneCount = $derived(g.state.pressed ? g.state.steps.length - 1 : g.state.steps.length);
  const current = $derived(g.state.pressed ? g.state.steps.at(-1) : undefined);
  const stepState = (i: number) => {
    if (i < doneCount || unlocked) return 'done';
    return i === doneCount && g.state.pressed ? 'active' : 'todo';
  };
  const hint = $derived.by(() => {
    if (unlocked) return 'Unlocked';
    if (current?.length) return `now: ${current.join(' + ')}`;
    return 'Perform the steps in order';
  });
</script>

<div bind:this={pad} class="gesture-pad group" data-unlocked={unlocked > 0 || undefined}>
  {#key failed}
    <ol
      class="flex flex-wrap justify-center gap-1.5 data-failed:animate-shake motion-reduce:animate-none"
      data-failed={failed > 0 || undefined}
      aria-label="Progress"
    >
      {#each steps as step, i (i)}
        <li
          class="rounded-full border border-line-strong bg-canvas px-2.5 py-1 font-system-mono text-xs leading-[normal] text-muted transition-[background,color] duration-150 data-[state=active]:border-fg data-[state=active]:text-fg data-[state=done]:border-accent data-[state=done]:bg-accent data-[state=done]:text-accent-fg"
          data-state={stepState(i)}
        >
          {step.join(' + ')}
        </li>
      {/each}
    </ol>
  {/key}
  <span class="text-sm text-muted">{hint}</span>
  <HoldBar />
</div>
