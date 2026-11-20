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
    <div class="code">
      <div class="code-head">
        {showTabs && (
          <div class="code-tabs" role="tablist">
            {tabs.map((t, i) => (
              <button key={t.label} role="tab" aria-selected={i === active} onClick={() => setActive(i)}>
                {t.label}
              </button>
            ))}
          </div>
        )}
        <button class="copy" aria-label={copied ? 'Copied' : 'Copy code'} title="Copy code" onClick={() => void copy()}>
          <CopyIcon copied={copied} />
        </button>
      </div>
      <pre>
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}
