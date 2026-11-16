export function formatBadgeCount(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return '';
  if (count >= 100) return '99+';
  return String(Math.floor(count));
}
