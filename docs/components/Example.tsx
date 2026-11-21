import { useMemo, useRef, useState } from 'preact/hooks';
import type { Sheet, SheetOptions } from '../../src';
import { exampleCode, resolveOptions } from '../codegen';
import type { Example as ExampleDef } from '../examples';
import { CodeBlock, type CodeTab } from './CodeBlock';
import { Drawer, useSheetState } from './Drawer';
import { SectionHeading, Segmented } from './Section';

/** Example markup is plain HTML, so the code tab shows exactly what is rendered. */
const Markup = ({ html }: { html: string }) => (
  <div style="display: contents" dangerouslySetInnerHTML={{ __html: html }} />
);

function ExampleDrawer({
  ex,
  trigger,
  nested,
  onReady,
}: {
  ex: ExampleDef;
  trigger?: Parameters<typeof Drawer>[0]['trigger'];
  nested?: boolean;
  onReady?: (sheet: Sheet) => void;
}) {
  const id = ex.id;
  const css = ex.css?.replace(/#sheet\b/g, `#${id}-sheet`).replace(/#overlay\b/g, `#${id}-overlay`);
  const options = resolveOptions(ex.options) as Omit<SheetOptions, 'content'>;
  return (
    <Drawer
      id={id}
      options={options}
      trigger={typeof options.trigger === 'string' ? options.trigger : trigger}
      nested={nested}
      noHandle={ex.noHandle}
      onReady={onReady}
    >
      {css && <style>{css}</style>}
      <Markup html={ex.markup} />
      {ex.children?.map((child) => (
        <ExampleDrawer key={child.id} ex={child} nested />
      ))}
    </Drawer>
  );
}

function LiveState({ sheet }: { sheet: Sheet | null }) {
  const state = useSheetState(sheet);
  return <pre class="demo-log">{state && JSON.stringify(state, null, 2)}</pre>;
}

/** Apply the selected variant: its options come first so they read naturally in the code sample. */
function withVariant(ex: ExampleDef, index: number): ExampleDef {
  const v = ex.variants?.[index];
  if (!v) return ex;
  return { ...ex, noHandle: v.noHandle ?? ex.noHandle, options: { ...v.options, ...ex.options } };
}

export function Example({ ex: base }: { ex: ExampleDef }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [variant, setVariant] = useState(0);
  const ex = useMemo(() => withVariant(base, variant), [base, variant]);
  const { js, html, css } = useMemo(() => exampleCode(ex), [ex]);
  const tabs: CodeTab[] = [
    { label: 'JavaScript', lang: 'js', code: js },
    { label: 'HTML', lang: 'html', code: html },
  ];
  if (css) tabs.push({ label: 'CSS', lang: 'css', code: css });

  return (
    <section id={ex.id}>
      <SectionHeading id={ex.id} title={ex.title} />
      <p dangerouslySetInnerHTML={{ __html: ex.description }} />
      <div class="demo-preview">
        {base.variants && (
          <Segmented labels={base.variants.map((v) => v.label)} value={variant} onChange={setVariant} />
        )}
        <div class="flex flex-wrap justify-center gap-2">
          {!ex.noTrigger && (
            <button class="btn btn-primary" ref={trigger}>
              Open Drawer
            </button>
          )}
          {ex.controls?.map((c) => (
            <button key={c.label} class="btn" onClick={() => sheet && c.run(sheet)}>
              {c.label}
            </button>
          ))}
        </div>
        {ex.live && <LiveState sheet={sheet} />}
      </div>
      <CodeBlock tabs={tabs} />
      {/* Keyed by variant: switching recreates the sheet with the new options. */}
      <ExampleDrawer key={variant} ex={ex} trigger={ex.noTrigger ? undefined : trigger} onReady={setSheet} />
    </section>
  );
}
