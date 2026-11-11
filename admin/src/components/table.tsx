import type { ReactNode } from 'react';

export interface MobileRow {
  id: string;
  primary: string;
  secondary?: string;
  actions?: ReactNode;
}

export interface TableProps {
  headers: string[];
  rows: ReactNode[][];
  /** Lista empilhada para mobile (< md). Se omitida, a tabela permanece. */
  mobileRows?: MobileRow[];
  /** Mensagem exibida quando não há linhas. */
  emptyMessage?: string;
}

/** Tabela genérica reaproveitada por todas as seções do painel. */
export function Table({ headers, rows, mobileRows, emptyMessage }: TableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-text-muted">{emptyMessage ?? 'Nenhum registro encontrado.'}</p>;
  }

  return (
    <>
      <div className="hidden md:block overflow-hidden rounded-[--radius-card] border border-border bg-surface shadow-[--shadow-card]">
        <table className="w-full text-sm">
          <thead className="bg-surface-hover text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-border hover:bg-surface-hover/40">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mobileRows && mobileRows.length > 0 && (
        <ul className="space-y-2 md:hidden">
          {mobileRows.map((row) => (
            <li
              key={row.id}
              className="rounded-[--radius-card] border border-border bg-surface p-3 shadow-[--shadow-card]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-text">{row.primary}</div>
                  {row.secondary && (
                    <div className="mt-0.5 text-xs text-text-muted">{row.secondary}</div>
                  )}
                </div>
                {row.actions && <div className="flex shrink-0 gap-1">{row.actions}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
