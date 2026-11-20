// Icons that animate between states. Both states stay in the DOM and CSS transitions between them,
// so nothing plays on page load or hydration, only on an actual change.
import { useId, useState } from 'preact/hooks';
import { isDark, theme } from '../theme';
import { Icon } from './Icon';

/** Sun/moon toggle: the outgoing icon turns away and fades, the incoming one turns in. */
export function ThemeToggle() {
  // Transitions only after the first click: hydration can switch the icon (server renders light).
  const [animate, setAnimate] = useState(false);
  const dark = isDark();
  return (
    <button
      class="icon-button group"
      aria-label="Toggle theme"
      data-dark={dark || undefined}
      data-animate={animate || undefined}
      onClick={() => {
        setAnimate(true);
        theme.value = dark ? 'light' : 'dark';
      }}
    >
      <Icon
        name="sun"
        class="theme-icon scale-50 -rotate-90 opacity-0 group-data-dark:scale-100 group-data-dark:rotate-0 group-data-dark:opacity-100"
      />
      <Icon
        name="moon"
        class="theme-icon group-data-dark:scale-50 group-data-dark:rotate-90 group-data-dark:opacity-0"
      />
    </button>
  );
}

/** Copy icon that turns into a check drawn stroke by stroke (cut out of a filled square, like the Phosphor one). */
export function CopyIcon({ copied }: { copied: boolean }) {
  const mask = `copied-${useId()}`;
  return (
    <span
      class="icon group inline-grid!"
      style={{ '--icon-size': '16px' }}
      data-copied={copied || undefined}
      aria-hidden="true"
    >
      <Icon name="copy" class="copy-icon-layer group-data-copied:scale-60 group-data-copied:opacity-0" />
      <svg
        class="copy-icon-layer scale-60 opacity-0 group-data-copied:scale-100 group-data-copied:opacity-100"
        viewBox="0 0 256 256"
      >
        <mask id={mask}>
          <rect x="24" y="40" width="208" height="176" rx="16" fill="#fff" />
          <polyline
            class="[stroke-dasharray:1] [stroke-dashoffset:1] transition-[stroke-dashoffset] duration-150 ease-[ease] group-data-copied:[stroke-dashoffset:0] group-data-copied:delay-120 group-data-copied:duration-300 group-data-copied:ease-ios motion-reduce:transition-none!"
            points="64 136 104 176 192 88"
            pathLength="1"
            fill="none"
            stroke="#000"
            stroke-width="16"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </mask>
        <rect x="24" y="40" width="208" height="176" rx="16" fill="currentColor" mask={`url(#${mask})`} />
      </svg>
    </span>
  );
}
