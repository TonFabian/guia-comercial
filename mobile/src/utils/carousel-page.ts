/** Converte o deslocamento horizontal no índice da página mais próxima. */
export function pageIndexFromOffset(
  offsetX: number,
  pageWidth: number,
  total: number,
  maxOffset?: number,
): number {
  if (total <= 1 || pageWidth <= 0) return 0;
  if (maxOffset !== undefined && maxOffset > 0 && offsetX >= maxOffset - 1) {
    return total - 1;
  }

  const rawIndex = Math.round(offsetX / pageWidth);
  return Math.min(Math.max(rawIndex, 0), total - 1);
}
