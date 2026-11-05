import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Envolve handlers async para repassar erros ao errorHandler. */
export function asyncHandler<R extends Request = Request>(
  handler: (req: R, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    handler(req as R, res, next).catch(next);
  };
}

export interface Pagination {
  page: number;
  pageSize: number;
  skip: number;
  limit: number;
}

/** Teto de `page`: `skip` = (page-1) * pageSize, e uma página muito alta
 * produziria um `skip` gigante (varredura da coleção). Com o teto de 10 000 e
 * pageSize ≤ 100, `skip` fica ≤ ~1 000 000. Uma página além do teto é
 * clampada (comportamento previsível), não rejeitada. */
const LIMITE_PAGINA = 10_000;

function lerParametroDePagina(valor: unknown, padrao: number, minimo: number, maximo: number): number {
  // Só string numérica: array (`?page=a&page=b`) e objeto são tratados como
  // ausentes (default) — nunca convertidos silenciosamente.
  if (typeof valor !== 'string') return padrao;
  const texto = valor.trim();
  if (texto === '' || !/^-?\d+$/.test(texto)) return padrao;
  const numero = Math.min(Math.max(Number(texto), minimo), maximo);
  return Math.floor(numero);
}

/** Lê `page`/`pageSize` da query com valores padrão seguros. */
export function parsePagination(
  pageParam: unknown,
  pageSizeParam: unknown,
  defaultPageSize = 20,
  maxPageSize = 100,
): Pagination {
  const page = lerParametroDePagina(pageParam, 1, 1, LIMITE_PAGINA);
  const pageSize = lerParametroDePagina(pageSizeParam, defaultPageSize, 1, maxPageSize);

  return { page, pageSize, skip: (page - 1) * pageSize, limit: pageSize };
}