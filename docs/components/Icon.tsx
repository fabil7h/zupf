// Phosphor icons (fill weight), inlined as SVG so they inherit `currentColor`.
// Only the icons imported here end up in the bundle.
import check from '@phosphor-icons/core/fill/check-fill.svg?raw';
import copy from '@phosphor-icons/core/fill/copy-fill.svg?raw';
import github from '@phosphor-icons/core/fill/github-logo-fill.svg?raw';
import link from '@phosphor-icons/core/regular/link-simple.svg?raw';
import list from '@phosphor-icons/core/regular/list.svg?raw';
import moon from '@phosphor-icons/core/fill/moon-fill.svg?raw';
import sun from '@phosphor-icons/core/fill/sun-fill.svg?raw';

const icons = { check, copy, github, link, list, moon, sun } as const;

export type IconName = keyof typeof icons;

export function Icon({ name, size = 16, class: className }: { name: IconName; size?: number; class?: string }) {
  return (
    <span
      class={className ? `icon ${className}` : 'icon'}
      style={{ '--icon-size': `${size}px` }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: icons[name] }}
    />
  );
}
