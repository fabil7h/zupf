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
      class="icon-btn theme-toggle"
      aria-label="Toggle theme"
      data-dark={dark || undefined}
      data-animate={animate || undefined}
      onClick={() => {
        setAnimate(true);
        theme.value = dark ? 'light' : 'dark';
      }}
    >
      <Icon name="sun" class="theme-sun" />
      <Icon name="moon" class="theme-moon" />
    </button>
  );
}

/** Copy icon that turns into a check drawn stroke by stroke (cut out of a filled square, like the Phosphor one). */
export function CopyIcon({ copied }: { copied: boolean }) {
  const mask = `copied-${useId()}`;
  return (
    <span class="icon copy-icon" style={{ '--icon-size': '16px' }} data-copied={copied || undefined} aria-hidden="true">
      <Icon name="copy" class="copy-icon-copy" />
      <svg class="copy-icon-check" viewBox="0 0 256 256">
        <mask id={mask}>
          <rect x="24" y="40" width="208" height="176" rx="16" fill="#fff" />
          <polyline
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
