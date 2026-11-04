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

/** Lê `page`/`pageSize` da query com valores padrão seguros. */
export function parsePagination(
  pageParam: unknown,
  pageSizeParam: unknown,
  defaultPageSize = 20,
  maxPageSize = 100,
): Pagination {
  const parsedPage = Number(pageParam);
  const page = Math.max(1, Math.floor(Number.isFinite(parsedPage) ? parsedPage : 1) || 1);
  const parsedSize = Number(pageSizeParam);
  const rawSize = Number.isFinite(parsedSize) ? Math.floor(parsedSize) : defaultPageSize;
  const pageSize = Math.min(maxPageSize, Math.max(1, rawSize));

  return { page, pageSize, skip: (page - 1) * pageSize, limit: pageSize };
}