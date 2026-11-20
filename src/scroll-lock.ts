// Ref-counted body scroll lock with scrollbar-gap compensation (replaces react-remove-scroll).
import type { Cleanup } from './helpers';

let count = 0;
let restore: Cleanup | undefined;

export function lockScroll(): Cleanup {
  count++;
  if (count === 1) {
    const html = document.documentElement;
    const body = document.body;
    const gap = window.innerWidth - html.clientWidth;
    const prev = { overflow: html.style.overflow, paddingRight: body.style.paddingRight };
    html.style.overflow = 'hidden';
    if (gap > 0) body.style.paddingRight = `calc(${getComputedStyle(body).paddingRight} + ${gap}px)`;
    html.style.setProperty('--zupf-scrollbar-gap', `${gap}px`);
    restore = () => {
      html.style.overflow = prev.overflow;
      body.style.paddingRight = prev.paddingRight;
      html.style.removeProperty('--zupf-scrollbar-gap');
    };
  }
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
