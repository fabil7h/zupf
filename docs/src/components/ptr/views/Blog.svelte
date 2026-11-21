<script lang="ts">
  import type { Blog } from '../data';

  let { state }: { state: Blog } = $props();
  const featured = $derived(state.posts[0]);
  const rest = $derived(state.posts.slice(1));
  const cover = (hue: number) =>
    `linear-gradient(135deg, hsl(${hue} 75% 65%), hsl(${(hue + 50) % 360} 70% 45%))`;
</script>

<div class="grid gap-3.5 px-4 pt-4 pb-6 text-fg">
  <article class="group grid gap-1.5" data-fresh={featured.fresh || undefined}>
    <div
      class="relative mb-1 aspect-video rounded-3xl group-data-fresh:animate-pop motion-reduce:animate-none!"
      style:background={cover(featured.hue)}
    >
      {#if featured.fresh}
        <span
          class="absolute top-2.5 left-2.5 rounded-full bg-white px-2.25 py-0.75 text-[11px] font-semibold text-[#111] corner-round"
        >
          New
        </span>
      {/if}
    </div>
    <small>{featured.topic} · {featured.minutes} min read</small>
    <h3 class="m-0 font-serif text-[22px] leading-[1.2] font-bold">{featured.title}</h3>
    <p class="m-0 text-sm leading-normal text-muted">{featured.excerpt}</p>
    <small>by {featured.author}</small>
  </article>
  {#each rest as p (p.id)}
    <article class="grid grid-cols-[72px_1fr] items-center gap-3 border-t border-line pt-3.5">
      <div class="aspect-square rounded-xl" style:background={cover(p.hue)}></div>
      <div>
        <small>{p.topic} · {p.minutes} min</small>
        <h4 class="my-0.5 text-[15px] leading-[1.3] font-bold">{p.title}</h4>
        <small>{p.author}</small>
      </div>
    </article>
  {/each}
</div>
