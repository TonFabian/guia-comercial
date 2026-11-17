import type { AppNotification } from '@/types/domain';

/** Adiciona ou remove um id do conjunto de seleção da lista. */
export function alternarSelecao(selecionados: string[], id: string): string[] {
  return selecionados.includes(id)
    ? selecionados.filter((i) => i !== id)
    : [...selecionados, id];
}

/**
 * Aplica estado de leitura (readAt) apenas às notificações selecionadas:
 * `lido: true` carimba o momento; `false` limpa (reabre).
 */
export function aplicarLeitura(
  itens: AppNotification[],
  selecionados: string[],
  lido: boolean,
): AppNotification[] {
  if (selecionados.length === 0) return itens;
  const carimbo = new Date().toISOString();
  const selecionado = new Set(selecionados);
  return itens.map((n) => {
    if (!n._id || !selecionado.has(n._id)) return n;
    return { ...n, readAt: lido ? (n.readAt ?? carimbo) : null };
  });
}
