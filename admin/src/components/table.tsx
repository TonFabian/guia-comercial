import type { ReactNode } from 'react';

import { TableSkeleton } from './ui/loading';

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
  /** Primeiro carregamento: skeleton no lugar da tabela vazia. */
  loading?: boolean;
}

/** Célula de texto puro (string/número) recebe ellipsis; elementos (chips, ações) passam direto. */
export function isTextCell(cell: ReactNode): boolean {
  return typeof cell === 'string' || typeof cell === 'number';
}

/** Tabela genérica reaproveitada por todas as seções do painel. */
export function Table({ headers, rows, mobileRows, emptyMessage, loading }: TableProps) {
  if (rows.length === 0) {
    if (loading) {
      return <TableSkeleton columns={headers.length} />;
    }
    return <p className="text-sm text-text-muted">{emptyMessage ?? 'Nenhum registro encontrado.'}</p>;
  }

  return (
    <>
      {/* Scroll horizontal quando o viewport é estreito demais para as colunas:
          sem isso as Ações são cortadas em vez de rolarem. */}
      <div className="hidden overflow-x-auto rounded-(--radius-card) border border-border bg-surface shadow-(--shadow-card) md:block">
        <table
          className="w-full text-sm"
          style={{ minWidth: `${Math.max(headers.length * 6, 28)}rem` }}
        >
          <thead className="bg-surface-hover text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              {headers.map((header) => (
                <th key={header} className="whitespace-nowrap px-4 py-3 font-medium">
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
                    {isTextCell(cell) ? <span className="block max-w-[16rem] truncate">{cell}</span> : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mobileRows && mobileRows.length > 0 && (
        <ul className="space-y-6 md:hidden">
          {mobileRows.map((row) => (
            <li
              key={row.id}
              className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-(--shadow-card)"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
                    {row.primary}
                  </div>
                  {row.secondary && (
                    <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-muted">{row.secondary}</div>
                  )}
                </div>
              </div>
              {row.actions && (
                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  {row.actions}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
