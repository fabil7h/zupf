import { effect, signal } from '@preact/signals';

type Theme = 'light' | 'dark' | null;
const stored = localStorage.getItem('zupf-theme');

/** Explicit theme, or `null` to follow the system preference. */
export const theme = signal<Theme>(stored === 'light' || stored === 'dark' ? stored : null);

export const isDark = (): boolean =>
  theme.value === 'dark' || (theme.value === null && matchMedia('(prefers-color-scheme: dark)').matches);

effect(() => {
  const t = theme.value;
  if (t) {
    document.documentElement.dataset.theme = t;
    localStorage.setItem('zupf-theme', t);
  } else {
    delete document.documentElement.dataset.theme;
  }
});
