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
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, value, desc]) => (
            <tr key={name}>
              <td data-label={head[0]}>
                <code>{name}</code>
              </td>
              <td data-label={head[1]}>{value && <code>{value}</code>}</td>
              <td data-label={head[2]}>
                <Text>{desc}</Text>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
