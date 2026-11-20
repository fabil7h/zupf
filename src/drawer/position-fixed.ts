// On Safari, fixing the body while a sheet is open prevents toolbar and scroll-related jumps.
import { isSafari } from '../shared';

let previous: Record<string, string> | null = null;
let lastUrl = typeof window !== 'undefined' ? window.location.href : '';

export function setPositionFixed(): void {
  if (!isSafari() || previous !== null) return;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return;

  const body = document.body;
  previous = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    height: body.style.height,
    right: 'unset',
  };
  const { scrollX, scrollY, innerHeight } = window;
  lastUrl = window.location.href;

  body.style.setProperty('position', 'fixed', 'important');
  Object.assign(body.style, { top: `${-scrollY}px`, left: `${-scrollX}px`, right: '0px', height: 'auto' });

  window.setTimeout(
    () =>
      requestAnimationFrame(() => {
        // If the bottom bar appeared due to the position change, shift content up.
        const bottomBarHeight = innerHeight - window.innerHeight;
        if (bottomBarHeight && scrollY >= innerHeight) body.style.top = `${-(scrollY + bottomBarHeight)}px`;
      }),
    300,
  );
}

export function restorePositionFixed(preventScrollRestoration = false): void {
  if (!isSafari() || previous === null) return;
  const body = document.body;
  const y = -parseInt(body.style.top, 10);
  const x = -parseInt(body.style.left, 10);
  Object.assign(body.style, previous);
  previous = null;

  requestAnimationFrame(() => {
    if (preventScrollRestoration && lastUrl !== window.location.href) {
      lastUrl = window.location.href;
      return;
    }
    window.scrollTo(x || 0, y || 0);
  });
}
