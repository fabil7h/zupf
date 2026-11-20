import { useMemo, useState } from 'preact/hooks';
import { highlight, type Lang } from '../highlight';
import { CopyIcon } from './AnimatedIcons';

export interface CodeTab {
  label?: string;
  lang: Lang;
  code: string;
}

export function CodeBlock({ tabs }: { tabs: CodeTab[] }) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const current = tabs[active];
  // Demos re-render their section on every status change; only re-highlight when the code changes.
  const html = useMemo(() => highlight(current.code.trim(), current.lang), [current.code, current.lang]);
  const showTabs = tabs.length > 1 || !!tabs[0].label;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current.code.trim());
    } catch {
      return; // Clipboard denied (permissions, insecure context): leave the button as is.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div class="mt-3 mb-4 overflow-hidden rounded-2xl border border-line-strong bg-code">
      <div class="flex min-h-10 items-stretch border-b border-line pr-2 pl-[18px]">
        {showTabs && (
          <div class="flex gap-5" role="tablist">
            {tabs.map((t, i) => (
              <button
                key={t.label}
                class="code-tab"
                role="tab"
                aria-selected={i === active}
                onClick={() => setActive(i)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        <button
          class="ml-auto inline-grid cursor-pointer place-items-center self-center rounded-sm p-1.5 text-muted transition-ui hover:bg-surface hover:text-fg active:scale-90 active:duration-[80ms]"
          aria-label={copied ? 'Copied' : 'Copy code'}
          title="Copy code"
          onClick={() => void copy()}
        >
          <CopyIcon copied={copied} />
        </button>
      </div>
      <pre class="overflow-x-auto px-[18px] py-4 leading-[1.6]">
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}
