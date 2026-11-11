/**
 * Estados de carregamento do painel:
 * - Skeleton: mantém o layout estável enquanto a listagem carrega.
 * - DotsLoader: indicador compacto inline (catálogo de referência, ações).
 */

/** Classe base do bloco de shimmer — exportada para teste e reuso. */
export function skeletonClass(): string {
  return 'animate-pulse rounded-md bg-surface-hover';
}

/** Quantidade de linhas do skeleton de tabela (padrão 5, limitada a 1–10). */
export function tableSkeletonRowCount(rows: number | undefined): number {
  if (rows === undefined || Number.isNaN(rows)) return 5;
  return Math.min(Math.max(Math.trunc(rows), 1), 10);
}

/** Atraso (ms) de cada dot do loader — escalonado para o efeito de onda. */
export function dotDelayMs(index: number): number {
  return Math.max(index, 0) * 150;
}

/** Bloco de shimmer reutilizável. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`${skeletonClass()} ${className}`} />;
}

interface TableSkeletonProps {
  /** Colunas da tabela real — o skeleton espelha a quantidade. */
  columns: number;
  rows?: number;
}

/** Skeleton com a forma da tabela enquanto a listagem carrega. */
export function TableSkeleton({ columns, rows }: TableSkeletonProps) {
  const rowCount = tableSkeletonRowCount(rows);
  const columnIndexes = Array.from({ length: Math.max(columns, 1) }, (_, index) => index);

  return (
    <div
      role="status"
      aria-label="Carregando"
      className="overflow-hidden rounded-[--radius-card] border border-border bg-surface shadow-[--shadow-card]"
    >
      <div className="flex gap-4 border-b border-border px-4 py-3">
        {columnIndexes.map((index) => (
          <Skeleton key={`h-${index}`} className="h-3 w-20" />
        ))}
      </div>
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <div key={`r-${rowIndex}`} className="flex gap-4 border-b border-border px-4 py-3 last:border-b-0">
          {columnIndexes.map((index) => (
            <Skeleton key={`c-${index}`} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

interface DotsLoaderProps {
  /** Texto opcional ao lado dos dots (ex.: "Carregando dados de referência…"). */
  label?: string;
}

/** Três pontos pulsando — indicador compacto para carregamentos inline. */
export function DotsLoader({ label }: DotsLoaderProps) {
  return (
    <span role="status" aria-label={label ?? 'Carregando'} className="inline-flex items-center gap-2 text-sm text-text-muted">
      <span aria-hidden="true" className="dots-loader">
        {[0, 1, 2].map((index) => (
          <span key={index} style={{ animationDelay: `${dotDelayMs(index)}ms` }} />
        ))}
      </span>
      {label && <span>{label}</span>}
    </span>
  );
}
