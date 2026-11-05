/**
 * Regras PURAS da busca mesclada de turismo: monta as seções da tela de
 * busca combinando empresas, atrações e eventos.
 *
 * Sem React e sem I/O — a rede fica na tela (`api.ts`) e aqui entram apenas
 * dados prontos para derivar exibição. O termo digitado NÃO é aplicado às
 * empresas aqui (o termo delas já vai ao servidor); aplica-se somente ao
 * turismo (nome/descrição, case-insensitive), pois o backend de turismo não
 * expõe busca textual.
 */
import type { Company, TourEvent, TouristSpot } from '@/types/domain';

export type SearchItem =
  | { kind: 'company'; id: string; company: Company }
  | { kind: 'spot'; id: string; spot: TouristSpot }
  | { kind: 'event'; id: string; event: TourEvent };

export type SearchSection = {
  key: 'empresas' | 'atracoes' | 'eventos';
  title: string;
  items: SearchItem[];
};

/** Quantidade de atrações/eventos buscada por vez (turismo não pagina no MVP). */
export const TURISMO_PAGE_SIZE = 20;

/** Indica se o texto casa o termo (case-insensitive). */
function casaTermo(texto: string | undefined, termo: string): boolean {
  if (!texto) return false;
  return texto.toLowerCase().includes(termo);
}

/** Aplica o termo apenas a atrações/eventos; termo vazio devolve tudo. */
function filtraTurismoPorTermo<T>(
  itens: T[],
  term: string,
  campos: (item: T) => (string | undefined)[],
): T[] {
  const termo = term.trim().toLowerCase();
  if (!termo) return itens;
  return itens.filter((item) => campos(item).some((campo) => casaTermo(campo, termo)));
}

/**
 * Monta as seções da busca na ordem Empresas → Atrações → Eventos.
 * Uma seção só entra quando tem itens e o chip de turismo respectivo
 * (`showSpots`/`showEvents`) está ativo. `term` filtra somente turismo.
 */
export function buildSearchSections(params: {
  companies: Company[];
  spots: TouristSpot[];
  events: TourEvent[];
  showSpots: boolean;
  showEvents: boolean;
  term?: string;
}): SearchSection[] {
  const { companies, spots, events, showSpots, showEvents, term = '' } = params;
  const secoes: SearchSection[] = [];

  if (companies.length > 0) {
    secoes.push({
      key: 'empresas',
      title: 'Empresas',
      items: companies.map((company) => ({
        kind: 'company',
        id: company._id,
        company,
      })),
    });
  }

  if (showSpots) {
    const atracoes = filtraTurismoPorTermo(spots, term, (spot) => [
      spot.name,
      spot.description,
    ]);
    if (atracoes.length > 0) {
      secoes.push({
        key: 'atracoes',
        title: 'Atrações',
        items: atracoes.map((spot) => ({ kind: 'spot', id: spot._id, spot })),
      });
    }
  }

  if (showEvents) {
    const eventos = filtraTurismoPorTermo(events, term, (event) => [
      event.name,
      event.description,
    ]);
    if (eventos.length > 0) {
      secoes.push({
        key: 'eventos',
        title: 'Eventos',
        items: eventos.map((event) => ({ kind: 'event', id: event._id, event })),
      });
    }
  }

  return secoes;
}
