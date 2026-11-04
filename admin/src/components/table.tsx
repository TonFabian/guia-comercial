import type { ReactNode } from 'react';

export interface TableProps {
  headers: string[];
  rows: ReactNode[][];
  /** Mensagem exibida quando não há linhas. */
  emptyMessage?: string;
}

/** Tabela genérica reaproveitada por todas as seções do painel. */
export function Table({ headers, rows, emptyMessage }: TableProps) {
  if (rows.length === 0) {
    return <p>{emptyMessage ?? 'Nenhum registro encontrado.'}</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
