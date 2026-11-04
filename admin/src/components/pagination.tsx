import { paginationStyle } from './styles';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

/** Paginação server-side: o total vem do backend, os botões trocam a página. */
export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  return (
    <div style={paginationStyle}>
      <span>
        {total === 0
          ? 'Nenhum item'
          : `Mostrando ${firstItem}-${lastItem} de ${total} ${total === 1 ? 'item' : 'itens'}`}
      </span>
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        Anterior
      </button>
      <span>
        Página {page} de {totalPages}
      </span>
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
        Próxima
      </button>
    </div>
  );
}
