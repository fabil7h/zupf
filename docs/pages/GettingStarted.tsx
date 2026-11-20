import { useRef } from 'preact/hooks';
import { CodeBlock } from '../components/CodeBlock';
import { Drawer } from '../components/Drawer';
import { href } from '../router';

const html = `<button id="open">Open Drawer</button>

<div id="overlay"></div>
<div id="sheet" hidden>
  <div data-zupf-handle></div>
  <h2 data-zupf-title>Hello</h2>
  <p data-zupf-description>Drag me down to close.</p>
  <button data-zupf-close>Close</button>
</div>`;

const js = `import { createSheet } from 'zupf';
import 'zupf/style.css';

const sheet = createSheet({
  content: '#sheet',
  overlay: '#overlay',
  trigger: '#open',
});`;

const css = `:root {
  --zupf-bg: #fff;
  --zupf-radius: 12px; /* 20px where squircles are supported */
  --zupf-corner-shape: squircle; /* Chromium 139+; e.g. round, superellipse(3) */
  --zupf-size: 96%;
  --zupf-overlay-bg: rgb(0 0 0 / 0.4);
  --zupf-handle-color: #d4d4d8;
}

/* zupf sets these attributes for styling */
[data-zupf-content][data-state='open'] { }
[data-zupf-content][data-dragging] { }
[data-zupf-content][data-direction='left'] { }`;

const more = `import { createPullToRefresh, createGestures } from 'zupf';
import 'zupf/pull-to-refresh.css'; // optional defaults

createPullToRefresh({
  content: '#list',
  onRefresh: () => loadNewItems(), // return a promise to keep the indicator until it settles
});

createGestures({
  target: '#photo',
  gestures: {
    'double-tap': () => like(),
    'long-press': () => openMenu(),
  },
});`;

const preact = `import { createPortal } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
import { createSheet } from 'zupf';

export function Drawer({ trigger, children }) {
  const content = useRef(null);
  const overlay = useRef(null);

  useLayoutEffect(() => {
    const sheet = createSheet({
      content: content.current,
      overlay: overlay.current,
      trigger: trigger.current,
    });
    return () => sheet.destroy();
  }, []);

  return createPortal(
    <>
      <div ref={overlay} />
      <div ref={content} hidden>
        <div data-zupf-handle />
        {children}
      </div>
    </>,
    document.body,
  );
}`;

const react = `function Drawer({ trigger, children }) {
  const content = useRef(null);
  const overlay = useRef(null);

  useLayoutEffect(() => {
    const sheet = createSheet({
      content: content.current,
      overlay: overlay.current,
      trigger: trigger.current,
    });
    return () => sheet.destroy();
  }, []);

  return createPortal(
    <>
      <div ref={overlay} />
      <div ref={content} hidden>
        <div data-zupf-handle />
        {children}
      </div>
    </>,
    document.body,
  );
}`;

const vue = `<script setup>
const content = ref();
const overlay = ref();
let sheet;
onMounted(() => (sheet = createSheet({ content: content.value, overlay: overlay.value })));
onBeforeUnmount(() => sheet.destroy());
</script>

<template>
  <button @click="sheet.open()">Open</button>
  <Teleport to="body">
    <div ref="overlay"></div>
    <div ref="content" hidden>
      <div data-zupf-handle></div>
      <slot />
    </div>
  </Teleport>
</template>`;

const svelte = `<script>
  import { onMount } from 'svelte';
  let content, overlay, sheet;
  onMount(() => {
    sheet = createSheet({ content, overlay });
    return () => sheet.destroy();
  });
</script>

<button onclick={() => sheet.open()}>Open</button>
<div bind:this={overlay}></div>
<div bind:this={content} hidden>
  <div data-zupf-handle></div>
  <slot />
</div>`;

export function GettingStarted() {
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <p class="lead">
        Three touch interactions that feel native, for any framework. You write the markup, zupf adds the gestures,
        physics and accessibility. Zero dependencies, about 13 KB gzipped.
      </p>

      <h2 id="overview">What you can build</h2>
      <ul>
        <li>
          <a href={href('drawer')}>
            <strong>Drawer</strong>
          </a>
          : bottom sheets with <a href={href('drawer', 'snap')}>snap points</a>, a{' '}
          <a href={href('drawer', 'scaled')}>scaled background</a> like iOS,{' '}
          <a href={href('drawer', 'nested')}>nested sheets</a>, side panels and maps-style{' '}
          <a href={href('drawer', 'snap-nonmodal')}>non-modal sheets</a>. Based on{' '}
          <a href="https://github.com/emilkowalski/vaul">vaul</a>, rewritten without React or Radix.
        </li>
        <li>
          <a href={href('pull-to-refresh')}>
            <strong>Pull to refresh</strong>
          </a>
          : on any scroller, even <a href={href('pull-to-refresh', 'drawer')}>inside a drawer</a>, with an{' '}
          <a href={href('pull-to-refresh', 'blog')}>indicator you style in CSS</a>.
        </li>
        <li>
          <a href={href('gestures')}>
            <strong>Gestures</strong>
          </a>
          : <a href={href('gestures', 'list')}>swipe actions</a> in lists, double taps, long presses and{' '}
          <a href={href('gestures', 'custom')}>custom sequences</a> like <code>tap tap hold+swipe-up</code>.
        </li>
      </ul>

      <h2 id="installation">Installation</h2>
      <CodeBlock
        tabs={[
          { label: 'npm', lang: 'sh', code: 'npm install zupf' },
          { label: 'pnpm', lang: 'sh', code: 'pnpm add zupf' },
          { label: 'yarn', lang: 'sh', code: 'yarn add zupf' },
          { label: 'bun', lang: 'sh', code: 'bun add zupf' },
        ]}
      />

      <h2 id="usage">Your first drawer</h2>
      <p>Plain HTML plus one call. zupf wires up dragging, animation, focus trap, Esc and the ARIA attributes.</p>
      <CodeBlock
        tabs={[
          { label: 'HTML', lang: 'html', code: html },
          { label: 'JavaScript', lang: 'js', code: js },
        ]}
      />
      <div class="preview">
        <div class="preview-actions">
          <button class="btn btn-primary" ref={trigger}>
            Open Drawer
          </button>
        </div>
      </div>
      <Drawer id="gs" trigger={trigger}>
        <div class="sheet-body">
          <h2 data-zupf-title>Hello</h2>
          <p data-zupf-description>Drag me down to close.</p>
          <button class="btn" data-zupf-close>
            Close
          </button>
        </div>
      </Drawer>

      <h2 id="styling">Styling</h2>
      <p>
        The default stylesheet is optional and uses zero-specificity <code>:where()</code>, so your CSS always wins.
        Theme it with variables:
      </p>
      <CodeBlock tabs={[{ lang: 'css', code: css }]} />

      <h2 id="more">Pull to refresh and gestures</h2>
      <p>
        Same package, same pattern: pass elements, get an instance with <code>setOptions</code>, <code>getState</code>,{' '}
        <code>subscribe</code> and <code>destroy</code>.
      </p>
      <CodeBlock tabs={[{ lang: 'js', code: more }]} />
      <p>
        Live demos and options: <a href={href('pull-to-refresh')}>Pull to Refresh</a>,{' '}
        <a href={href('gestures')}>Gestures</a>.
      </p>

      <h2 id="frameworks">Frameworks</h2>
      <p>
        Always render the elements (zupf toggles <code>hidden</code> itself), create the instance on mount and destroy
        it on unmount. These docs use the Preact version.
      </p>
      <CodeBlock
        tabs={[
          { label: 'Preact', lang: 'js', code: preact },
          { label: 'React', lang: 'js', code: react },
          { label: 'Vue', lang: 'html', code: vue },
          { label: 'Svelte', lang: 'html', code: svelte },
        ]}
      />
      <p>
        A sheet is a valid Svelte store and plugs straight into React's <code>useSyncExternalStore</code>.
      </p>
    </>
  );
}
