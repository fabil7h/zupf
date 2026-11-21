// Code shown in the pull-to-refresh demos' tabs (and the CSS they apply live).
import type { PullToRefreshBehavior } from '@lzth/zupf';

export const listHtml = (id = 'list') => `<ul id="${id}">
    <li>…</li>
  </ul>`;

/** Layout every example needs: a clipping wrapper and a content element that scrolls itself. */
export function baseCss(content = '#list', wrapper = '.ptr-wrapper') {
  return `${wrapper} {
  position: relative; /* the indicator is absolutely positioned */
  overflow: hidden;   /* hides the indicator above the content */
  height: 420px;
}

${content} {
  height: 100%;
  overflow: auto;     /* the content is its own scroller */
}`;
}

export const barCss = `/* The indicator is the bar: full width, 4px tall. */
.load-bar {
  --zupf-ptr-indicator-size: 4px;
  overflow: hidden;
  background: rgb(14 165 233 / 0.15);
}

/* --progress (0..1, set from onPull) fills the bar while pulling. */
.load-bar::before {
  content: '';
  position: absolute;
  inset: 0;
  background: #0ea5e9;
  transform-origin: left;
  scale: var(--progress, 0) 1;
}

/* While refreshing it loops indefinitely, until onRefresh settles. */
.load-bar:is([data-state='refreshing'], [data-settling='refreshed'])::before {
  right: auto;
  width: 40%;
  scale: 1;
  animation: bar-slide 1s ease-in-out infinite;
}

@keyframes bar-slide {
  from { translate: -100%; }
  to { translate: 250%; }
}

@media (prefers-reduced-motion: reduce) {
  .load-bar:is([data-state='refreshing'], [data-settling='refreshed'])::before {
    animation: none;
  }
}`;

export const barHtml = `<div data-zupf-ptr-indicator class="load-bar"></div>`;

/** Options every loading bar demo uses (shown in the JS tabs). */
export const barOptions = { refreshingOffset: 4 };
export const barJs = `  refreshingOffset: 4, // rest right below the 4px bar, not a full threshold away
  onPull: (offset, progress) => ptr.indicator.style.setProperty('--progress', progress),
`;

export const basicCode = {
  js: `import { createPullToRefresh } from '@lzth/zupf';
import '@lzth/zupf/pull-to-refresh.css';

const ptr = createPullToRefresh({
  content: '#list',
${barJs}  onRefresh: async () => {
    await loadNewItems(); // the bar loops until this settles
  },
});`,
  html: `<div class="ptr-wrapper">
  ${barHtml}
  ${listHtml()}
</div>`,
  css: `${baseCss()}\n\n${barCss}`,
};

export const arrowCss = `.arrow-indicator {
  gap: 8px;
  font-size: 13px;
  color: #71717a;
}

.arrow-indicator .arrow {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: rotate 200ms;
}

/* data-state: idle | pulling | ready | refreshing */
.arrow-indicator[data-state='ready'] .arrow {
  rotate: 180deg;
}

.arrow-indicator [data-zupf-ptr-spinner] {
  display: none;
  width: 16px;
  height: 16px;
  border-width: 2px;
}

/* data-settling='refreshed' keeps the refreshing look while it slides away. */
.arrow-indicator:is([data-state='refreshing'], [data-settling='refreshed']) .arrow {
  display: none;
}
.arrow-indicator:is([data-state='refreshing'], [data-settling='refreshed']) [data-zupf-ptr-spinner] {
  display: block;
}

.arrow-indicator .label::after { content: 'Pull to refresh'; }
.arrow-indicator[data-state='ready'] .label::after { content: 'Release to refresh'; }
.arrow-indicator[data-state='refreshing'] .label::after { content: 'Refreshing…'; }
.arrow-indicator[data-settling='refreshed'] .label::after { content: 'Updated just now'; }`;

export const arrowPath = 'M12 5v14M5 12l7 7 7-7';

export const ringCss = `/* --progress (0..1, set from onPull) drives the ring fill. */
.ring {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: conic-gradient(
    #0ea5e9 calc(var(--progress, 0) * 360deg),
    rgb(14 165 233 / 0.15) 0
  );
  mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
  scale: calc(0.6 + var(--progress, 0) * 0.4);
}

[data-zupf-ptr-indicator]:is([data-state='refreshing'], [data-settling='refreshed']) .ring {
  background: conic-gradient(#0ea5e9 90deg, rgb(14 165 233 / 0.15) 0);
  animation: ring-spin 0.8s linear infinite;
}

@keyframes ring-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  [data-zupf-ptr-indicator]:is([data-state='refreshing'], [data-settling='refreshed']) .ring {
    animation: none;
  }
}`;

export const revealCss = `/* No indicator: the list uncovers a panel behind it. */
.reveal-panel {
  position: absolute;
  inset: 0 0 auto;
  height: 160px; /* covers the whole pull (max: 150) */
  display: grid;
  place-items: start center;
  padding-top: 22px;
  box-sizing: border-box;
  font-size: 13px;
  color: #fff;
  background: linear-gradient(135deg, #f43f5e, #f97316);
}

.reveal-panel::after { content: '↓  Keep pulling'; }
.reveal:has([data-state='ready']) .reveal-panel::after { content: '↑  Let go'; }
.reveal:has([data-state='refreshing']) .reveal-panel::after { content: 'Loading…'; }

.reveal [data-zupf-ptr] {
  position: relative; /* above the panel */
  background: var(--list-bg, #fff);
}

.reveal [data-zupf-ptr]:not([data-state='idle']) {
  border-radius: 16px 16px 0 0;
}`;

export const indent = (text: string, spaces: number) =>
  text
    .split('\n')
    .map((line) => ' '.repeat(spaces) + line)
    .join('\n');

export const blogCss = `.blog {
  height: 100%;
  overflow: auto; /* the scroller */
  overscroll-behavior-y: contain;
}

.blog > header {
  position: sticky;
  top: 0;
  z-index: 1;           /* above the indicator and the pulled posts */
  background: #fff;     /* opaque: the indicator hides behind it */
}

.posts-area {
  position: relative;   /* the indicator starts right below the header */
}`;

export type Tuning = Partial<
  Pick<PullToRefreshBehavior, 'threshold' | 'max' | 'refreshingOffset' | 'duration' | 'easing'>
>;

export const tuningVariants: { label: string; options: Tuning }[] = [
  { label: 'Default', options: {} },
  { label: 'Short pull', options: { threshold: 40, max: 90 } },
  { label: 'Long pull', options: { threshold: 110, max: 240 } },
  { label: 'Tight rest', options: { refreshingOffset: 44 } },
  { label: 'Bouncy', options: { duration: 650, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' } },
];

export const formatOptions = (options: Tuning) =>
  Object.entries(options)
    .map(([k, v]) => `  ${k}: ${typeof v === 'string' ? `'${v}'` : v},\n`)
    .join('');

export const thresholdCss = `/* Optional while tuning: a guide at the threshold.
   The content's top edge must pass it before releasing refreshes. */
.threshold-line {
  position: absolute;
  top: var(--threshold, 64px);
  left: 0;
  right: 0;
  z-index: 2;
  padding: 2px 6px;
  border-top: 1px dashed #ef4444;
  color: #ef4444;
  font-size: 10px;
  text-align: right;
  pointer-events: none;
}`;

export const nestedCss = `.carousel {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
}

.carousel > * {
  flex: 0 0 70%;
  scroll-snap-align: start;
}

.inner-scroller {
  max-height: 140px;
  overflow: auto;
}`;

export const drawerCss = `#sheet {
  height: 75dvh;
}

.sheet-list {
  position: relative;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

.sheet-list #sheet-list {
  height: 100%;
  overflow: auto;
}`;
