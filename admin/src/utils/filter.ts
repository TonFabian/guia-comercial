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
