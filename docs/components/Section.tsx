import type { ComponentChildren } from 'preact';
import { href, useDocRoute } from '../router';
import { CodeBlock, type CodeTab } from './CodeBlock';
import { Icon } from './Icon';
import { Text } from './Text';

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
  const { slug } = useDocRoute();
  const tabs: CodeTab[] = [
    { label: 'JavaScript', lang: 'js', code: code.js },
    { label: 'HTML', lang: 'html', code: code.html },
  ];
  if (code.css) tabs.push({ label: 'CSS', lang: 'css', code: code.css });
  return (
    <section id={id}>
      <h2>
        <a href={href(slug, id)}>
          {title}
          <Icon name="link" class="anchor-icon" />
        </a>
      </h2>
      <p>{typeof description === 'string' ? <Text>{description}</Text> : description}</p>
      {/* The CSS tab is applied live. */}
      {code.css && <style>{code.css}</style>}
      <div class="preview">
        {variants && (
          <div class="segmented" role="radiogroup" aria-label="Variant">
            {variants.map((label, i) => (
              <button key={label} role="radio" aria-checked={i === variant} onClick={() => onVariant?.(i)}>
                {label}
              </button>
            ))}
          </div>
        )}
        {children}
      </div>
      <CodeBlock tabs={tabs} />
    </section>
  );
}
