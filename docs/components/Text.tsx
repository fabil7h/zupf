import { Fragment } from 'preact';

/** Renders a string, turning `backticked` parts into <code>. */
export function Text({ children }: { children: string }) {
  return (
    <>
      {children
        .split(/(`[^`]+`)/)
        .map((part, i) =>
          part.startsWith('`') ? <code key={i}>{part.slice(1, -1)}</code> : <Fragment key={i}>{part}</Fragment>,
        )}
    </>
  );
}

export function Table({ head, rows }: { head: [string, string, string]; rows: [string, string, string][] }) {
  return (
    <div class="mt-3 mb-4 overflow-x-auto rounded-2xl border border-line-strong">
      <table class="w-full border-collapse text-[13.5px] max-sm:block">
        <thead class="max-sm:hidden">
          <tr>
            {head.map((h) => (
              <th
                key={h}
                class="border-b border-line px-3.5 py-2.5 text-left align-top bg-surface font-medium text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody class="max-sm:block">
          {rows.map(([name, value, desc]) => (
            <tr
              key={name}
              class="group max-sm:block max-sm:border-b max-sm:border-line max-sm:px-3.5 max-sm:py-3 max-sm:last:border-b-0"
            >
              <td data-label={head[0]} class="api-cell whitespace-nowrap">
                <code>{name}</code>
              </td>
              <td
                data-label={head[1]}
                class="api-cell max-sm:before:text-xs max-sm:before:text-muted max-sm:before:content-[attr(data-label)_':_']"
              >
                {value && <code>{value}</code>}
              </td>
              <td data-label={head[2]} class="api-cell">
                <Text>{desc}</Text>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
