import { chain, isInput, on, type Cleanup } from './helpers';
import { isIOS } from './browser';

const KEYBOARD_BUFFER = 24;

function isScrollable(node: Element): boolean {
  const style = window.getComputedStyle(node);
  return /(auto|scroll)/.test(style.overflow + style.overflowX + style.overflowY);
}

function getScrollParent(node: Element): Element {
  if (isScrollable(node)) node = node.parentElement as Element;
  while (node && !isScrollable(node)) node = node.parentElement as Element;
  return node || document.scrollingElement || document.documentElement;
}

let count = 0;
let restore: Cleanup | undefined;

/** Ref-counted: call once per open sheet, call the returned function to release. */
export function preventScroll(): Cleanup {
  count++;
  if (count === 1 && isIOS()) restore = preventScrollMobileSafari();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    count--;
    if (count === 0) {
      restore?.();
      restore = undefined;
    }
  };
}

function preventScrollMobileSafari(): Cleanup {
  let scrollable: Element | undefined;
  let lastY = 0;
  const visualViewport = window.visualViewport;

  const onTouchStart = (e: TouchEvent) => {
    if (!(e.target instanceof Element)) return;
    scrollable = getScrollParent(e.target);
    if (scrollable === document.documentElement && scrollable === document.body) return;
    lastY = e.changedTouches[0].pageY;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!scrollable || scrollable === document.documentElement || scrollable === document.body) {
      e.preventDefault();
      return;
    }
    const y = e.changedTouches[0].pageY;
    const scrollTop = scrollable.scrollTop;
    const bottom = scrollable.scrollHeight - scrollable.clientHeight;
    if (bottom === 0) return;
    if ((scrollTop <= 0 && y > lastY) || (scrollTop >= bottom && y < lastY)) e.preventDefault();
    lastY = y;
  };

  const onFocus = (e: FocusEvent) => {
    const target = e.target instanceof Element ? e.target : null;
    if (!isInput(target)) return;
    target.style.transform = 'translateY(-2000px)';
    requestAnimationFrame(() => {
      target.style.transform = '';
      if (!visualViewport) return;
      if (visualViewport.height < window.innerHeight) {
        requestAnimationFrame(() => scrollIntoView(target));
      } else {
        visualViewport.addEventListener('resize', () => scrollIntoView(target), { once: true });
      }
    });
  };

  const scrollX = window.pageXOffset;
  const scrollY = window.pageYOffset;
  const html = document.documentElement;
  const prevPadding = html.style.paddingRight;
  html.style.paddingRight = `${window.innerWidth - html.clientWidth}px`;
  window.scrollTo(0, 0);

  const removeEvents = chain(
    on(document, 'touchstart', onTouchStart, { passive: false, capture: true }),
    on(document, 'touchmove', onTouchMove, { passive: false, capture: true }),
    on(document, 'touchend', onTouchEnd, { passive: false, capture: true }),
    on(document, 'focus', onFocus, true),
    on(window, 'scroll', onWindowScroll),
  );

  return () => {
    html.style.paddingRight = prevPadding;
    removeEvents();
    window.scrollTo(scrollX, scrollY);
  };
}

// Tapping an input: focus it ourselves with a transform trick so Safari doesn't scroll the page.
function onTouchEnd(e: TouchEvent) {
  const target = e.target instanceof Element ? e.target : null;
  if (isInput(target) && target !== document.activeElement) {
    e.preventDefault();
    target.style.transform = 'translateY(-2000px)';
    target.focus();
    requestAnimationFrame(() => (target.style.transform = ''));
  }
}

const onWindowScroll = () => window.scrollTo(0, 0);

function scrollIntoView(target: Element) {
  const root = document.scrollingElement || document.documentElement;
  while (target && target !== root) {
    const scrollable = getScrollParent(target);
    if (scrollable !== document.documentElement && scrollable !== document.body && scrollable !== target) {
      const scrollableTop = scrollable.getBoundingClientRect().top;
      const targetTop = target.getBoundingClientRect().top;
      const targetBottom = target.getBoundingClientRect().bottom;
      const keyboardHeight = scrollable.getBoundingClientRect().bottom + KEYBOARD_BUFFER;
      if (targetBottom > keyboardHeight) scrollable.scrollTop += targetTop - scrollableTop;
    }
    target = scrollable.parentElement as Element;
  }
}
