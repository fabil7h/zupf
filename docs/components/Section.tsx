import type { ComponentChildren } from 'preact';
import { href, useDocRoute } from '../router';
import { CodeBlock, type CodeTab } from './CodeBlock';
import { Icon } from './Icon';
import { Text } from './Text';

/** Section title linking to itself; the link icon slides (and on desktop, turns) in on hover. */
export function SectionHeading({ id, title }: { id: string; title: string }) {
  const { slug } = useDocRoute();
  return (
    <h2>
      <a href={href(slug, id)} class="group inline-flex items-center gap-2">
        {title}
        <Icon
          name="link"
          class="-translate-x-1 text-subtle opacity-0 [transition:opacity_150ms_ease,translate_200ms_var(--ease-ios),rotate_300ms_var(--ease-ios)] group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 fine-pointer:-rotate-20 fine-pointer:group-hover:rotate-0 fine-pointer:group-focus-visible:rotate-0 motion-reduce:rotate-none! motion-reduce:translate-none! motion-reduce:transition-opacity"
        />
      </a>
    </h2>
  );
}

/** Variant picker. Never wider than the page: long pickers scroll instead. */
export function Segmented({
  labels,
  value,
  onChange,
}: {
  labels: string[];
  value: number;
  onChange?: (i: number) => void;
}) {
  return (
    <div
      class="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-xl border border-line-strong bg-surface p-[3px] [scrollbar-width:none]"
      role="radiogroup"
      aria-label="Variant"
    >
      {labels.map((label, i) => (
        <button
          key={label}
          class="flex-none cursor-pointer rounded-md px-3 py-1 text-[13px] whitespace-nowrap text-muted transition-ui hover:text-fg active:scale-[0.97] active:duration-[80ms] aria-checked:bg-canvas aria-checked:text-fg aria-checked:shadow-[0_0_0_1px_var(--color-line),0_1px_2px_rgb(0_0_0/0.05)]"
          role="radio"
          aria-checked={i === value}
          onClick={() => onChange?.(i)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export interface SectionProps {
  id: string;
  title: string;
  description: ComponentChildren;
  code: { js: string; html: string; css?: string };
  variants?: string[];
  variant?: number;
  onVariant?: (i: number) => void;
  children: ComponentChildren;
}

export function Section({ id, title, description, code, variants, variant = 0, onVariant, children }: SectionProps) {
  const tabs: CodeTab[] = [
    { label: 'JavaScript', lang: 'js', code: code.js },
    { label: 'HTML', lang: 'html', code: code.html },
  ];
  if (code.css) tabs.push({ label: 'CSS', lang: 'css', code: code.css });
  return (
    <section id={id}>
      <SectionHeading id={id} title={title} />
      <p>{typeof description === 'string' ? <Text>{description}</Text> : description}</p>
      {/* The CSS tab is applied live. */}
      {code.css && <style>{code.css}</style>}
      <div class="demo-preview">
        {variants && <Segmented labels={variants} value={variant} onChange={onVariant} />}
        {children}
      </div>
      <CodeBlock tabs={tabs} />
    </section>
  );
}
