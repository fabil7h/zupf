import type { RefObject } from 'preact';
import { useLayoutEffect, useState } from 'preact/hooks';

export function useInViewport(target?: RefObject<Element | null> | string): boolean {
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    if (visible) return undefined;
    const element = typeof target === 'string' ? document.querySelector(target) : target?.current;
    if (!target || !element || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }

    const activate = () => setVisible(true);
    if (element.getBoundingClientRect().top < window.innerHeight + 300) {
      activate();
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) activate();
      },
      { rootMargin: '300px 0px' },
    );
    observer.observe(element);
    element.addEventListener('pointerdown', activate, { once: true });
    element.addEventListener('focusin', activate, { once: true });
    return () => {
      observer.disconnect();
      element.removeEventListener('pointerdown', activate);
      element.removeEventListener('focusin', activate);
    };
  }, [target, visible]);

  return visible;
}
