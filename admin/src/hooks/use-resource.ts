import { useCallback, useEffect, useRef, useState } from 'react';

import { useApi } from '../services/api';
import type { Paginated } from '../types/domain';

export interface ResourceResult<T> {
  /** Itens da página atual. */
  items: T[];
  /** Total de registros informado pelo backend. */
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  /** Troca de página (paginação server-side). */
  setPage: (page: number) => void;
  /** Recarrega a página atual (após criar/editar/excluir). */
  reload: () => void;
}

/**
 * Carrega uma listagem paginada do backend.
 *
 * Cada instância tem estado próprio (itens, erro e carregamento): uma falha em
 * uma seção não pode derrubar as demais. O `loader` fica em uma ref para que a
 * arrow function inline não dispare refetch em laço.
 */
export function useResource<T>(
  loader: (page: number, pageSize: number) => Promise<Paginated<T>>,
  pageSize = 50,
): ResourceResult<T> {
  const [page, setPageState] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);

  // O loader fica em uma ref: arrow function inline não pode virar dependência
  // instável do `useCallback` e provocar refetch em laço.
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const fetcher = useCallback(
    () => loaderRef.current(page, pageSize),
    // `reloadToken` entra nas deps para forçar a repetição da busca.
    [page, pageSize, reloadToken],
  );

  const { data, error, loading } = useApi<Paginated<T>>(fetcher, [page, pageSize, reloadToken]);

  const setPage = useCallback((next: number) => {
    setPageState((current) => (next === current ? current : Math.max(1, next)));
  }, []);

  // Depois de excluir o último item de uma página, o backend devolve a página
  // vazia: volta para a primeira para não deixar a tabela sem conteúdo.
  useEffect(() => {
    if (loading || error !== null || !data) return;
    if (data.items.length === 0 && data.total > 0 && data.page > 1) {
      setPage(1);
    }
  }, [data, loading, error, setPage]);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? page,
    pageSize: data?.pageSize ?? pageSize,
    loading,
    error,
    setPage,
    reload,
  };
}
