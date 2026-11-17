export function tempoRelativo(iso: string | null | undefined, agora: Date = new Date()): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diffMs = agora.getTime() - t;
  if (diffMs < 60_000) return 'agora';
  const min = Math.floor(diffMs / 60_000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}
