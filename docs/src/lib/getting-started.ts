// Code samples on the Getting Started page.
export const html = `<button id="open">Open Drawer</button>

<div id="overlay"></div>
<div id="sheet" hidden>
  <div data-zupf-handle></div>
  <h2 data-zupf-title>Hello</h2>
  <p data-zupf-description>Drag me down to close.</p>
  <button data-zupf-close>Close</button>
</div>`;

export const js = `import { createSheet } from 'zupf';
import 'zupf/style.css';

const sheet = createSheet({
  content: '#sheet',
  overlay: '#overlay',
  trigger: '#open',
});`;

export const css = `:root {
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

export const more = `import { createPullToRefresh, createGestures } from 'zupf';
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

export const preact = `import { createPortal } from 'preact';
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

export const react = `import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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

export const vue = `<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { createSheet } from 'zupf';

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

export const svelte = `<script>
  import { createSheet } from 'zupf';

  let { trigger, children } = $props();
  let content, overlay;

  $effect(() => {
    const sheet = createSheet({ content, overlay, trigger });
    return () => sheet.destroy();
  });
</script>

<div bind:this={overlay}></div>
<div bind:this={content} hidden>
  <div data-zupf-handle></div>
  {@render children()}
</div>`;
