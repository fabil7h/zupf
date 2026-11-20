// On Safari, fixing the body while a sheet is open prevents toolbar and scroll-related jumps.
import { isSafari } from '../core';

let previous: Record<string, string> | null = null;
let lastUrl = typeof window !== 'undefined' ? window.location.href : '';
/** Open holders of the fix: the body is restored when the last one releases it. */
let holders = 0;

/**
 * Fix the body (Safari only). Returns the release: the body is restored when every holder has released it, so one
 * sheet finishing its slide-out never unfixes the body under another one. Releasing twice counts once.
 */
export function setPositionFixed(): (preventScrollRestoration?: boolean) => void {
  holders++;
  let released = false;
  fix();
  return (preventScrollRestoration = false) => {
    if (released) return;
    released = true;
    if (--holders === 0) restore(preventScrollRestoration);
  };
}

function fix(): void {
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

function restore(preventScrollRestoration: boolean): void {
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
