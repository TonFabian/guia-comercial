/**
 * Filtro textual no cliente sobre os itens já carregados.
 *
 * A paginação é server-side; a busca atua sobre a página carregada.
 */
export function filterByText<T>(items: T[], term: string, toText: (item: T) => string): T[] {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) => toText(item).toLowerCase().includes(normalized));
}

/**
 * Contagem exibida no rodapé de paginação.
 *
 * A paginação é server-side, mas os filtros de cliente (busca, "sem dono")
 * atuam só sobre a página carregada: com filtro ativo, o total do servidor
 * deixaria de descrever a tabela — a contagem passa a ser dos itens visíveis.
 */
export function totalDoRodape(totalServidor: number, filtroClienteAtivo: boolean, itensVisiveis: number): number {
  return filtroClienteAtivo ? itensVisiveis : totalServidor;
}
