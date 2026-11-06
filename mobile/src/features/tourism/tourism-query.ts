/**
 * Parâmetros aceitos pela listagem de pontos turísticos e eventos.
 * Constrói a query string para `/tourist-spots` e `/events` (helper puro).
 */
export type TourismQueryParams = {
  active?: boolean;
  city?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

/**
 * Serializa os parâmetros de turismo em query string (`?a=1&b=2`).
 * - `pageSize` sempre presente (default 6).
 * - `active`, `city` e `q` só entram quando definidos e não vazios
 *   (`q` é aparado antes da checagem).
 * - `page` só entra quando maior que 1 (a página 1 é o default do backend).
 */
export function buildTourismQuery(params: TourismQueryParams): string {
  const search = new URLSearchParams({ pageSize: String(params.pageSize ?? 6) });
  if (params.active !== undefined) search.set('active', String(params.active));
  if (params.city) search.set('city', params.city);
  if (params.q?.trim()) search.set('q', params.q.trim());
  if (params.page !== undefined && params.page > 1) search.set('page', String(params.page));
  return `?${search.toString()}`;
}
