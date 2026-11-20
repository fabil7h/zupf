import { useRef } from 'preact/hooks';
import { CodeBlock } from '../components/CodeBlock';
import { Drawer } from '../components/Drawer';

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
        zupf is a drawer (bottom sheet) that works with any framework. It is a port of{' '}
        <a href="https://github.com/emilkowalski/vaul">vaul</a> without the React dependency. It has no dependencies, is
        about 9 KB gzipped, and is accessible by default.
      </p>

      <h2 id="installation">Installation</h2>
      <CodeBlock
        tabs={[
          { label: 'npm', lang: 'sh', code: 'npm install zupf' },
          { label: 'pnpm', lang: 'sh', code: 'pnpm add zupf' },
          { label: 'yarn', lang: 'sh', code: 'yarn add zupf' },
          { label: 'bun', lang: 'sh', code: 'bun add zupf' },
        ]}
      />

      <h2 id="usage">Create a sheet</h2>
      <p>
        Write the markup yourself and point <code>createSheet</code> at it. zupf adds the gestures, animation, focus
        management and ARIA attributes.
      </p>
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
        The default stylesheet is optional. All its selectors use zero-specificity <code>:where()</code>, so your own
        CSS always wins. For quick theming, set CSS variables:
      </p>
      <CodeBlock tabs={[{ lang: 'css', code: css }]} />

      <h2 id="frameworks">Frameworks</h2>
      <p>
        Render the elements on every render; don't put them behind a condition. Create the sheet once the component
        mounts, and destroy it when the component unmounts. These docs are built with Preact and use the Preact version
        below.
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
        A sheet is a valid Svelte store, and <code>sheet.getState</code> / <code>sheet.subscribe</code> plug straight
        into React's <code>useSyncExternalStore</code>.
      </p>
    </>
  );
}
