import { effect, signal } from '@preact/signals';

type Theme = 'light' | 'dark' | null;
const browser = typeof window !== 'undefined';
const stored = browser ? localStorage.getItem('zupf-theme') : null;

/** Explicit theme, or `null` to follow the system preference. */
export const theme = signal<Theme>(stored === 'light' || stored === 'dark' ? stored : null);

/** Set after hydration. Until then the page renders as the server did (light icons), so hydration matches. */
export const hydrated = signal(false);

export const isDark = (): boolean =>
  hydrated.value &&
  (theme.value === 'dark' || (theme.value === null && matchMedia('(prefers-color-scheme: dark)').matches));

if (browser) {
  effect(() => {
    const t = theme.value;
    if (t) {
      document.documentElement.dataset.theme = t;
      localStorage.setItem('zupf-theme', t);
    } else {
      delete document.documentElement.dataset.theme;
    }
  });
}
