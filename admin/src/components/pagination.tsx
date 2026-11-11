interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-text-muted">
      <span>
        Mostrando {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} de {total} itens
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="h-8 rounded-[--radius-input] border border-border bg-surface px-3 disabled:opacity-40"
        >
          Anterior
        </button>
        <span>
          Página {page} de {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="h-8 rounded-[--radius-input] border border-border bg-surface px-3 disabled:opacity-40"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
