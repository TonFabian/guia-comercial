export interface PaginationDot {
  index: number;
  active: boolean;
}

/** Gera o modelo de dots exibido pelo componente de paginação. */
export function buildPaginationDots(
  total: number,
  activeIndex: number,
): PaginationDot[] {
  if (total <= 1) return [];

  const currentIndex = Math.min(Math.max(activeIndex, 0), total - 1);

  return Array.from({ length: total }, (_, index) => ({
    index,
    active: index === currentIndex,
  }));
}
