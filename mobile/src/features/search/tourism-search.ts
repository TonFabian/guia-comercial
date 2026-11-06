/**
 * Regras PURAS da busca mesclada de turismo: monta as seções da tela de
 * busca combinando empresas, atrações e eventos.
 *
 * Sem React e sem I/O — a rede fica na tela (`api.ts`) e aqui entram apenas
 * dados prontos para derivar exibição. O termo das empresas vai ao servidor
 * e nunca é aplicado aqui. O termo do turismo TAMBÉM vai ao servidor (`?q=`
 * em `/tourist-spots` e `/events`, paginação de verdade); o filtro local por
 * termo permanece apenas para cobrir o fallback mock, que roda sem backend.
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

/** Indica se o texto casa o termo (case-insensitive). */
function casaTermo(texto: string | undefined, termo: string): boolean {
  if (!texto) return false;
  return texto.toLowerCase().includes(termo);
}

/** Indica se ainda há itens para carregar na próxima página. */
export function temMaisPagina(itensCarregados: number, total: number): boolean {
  return itensCarregados < total;
}

/**
 * `true` quando a resposta chegou depois de a busca ter reiniciado (novo
 * termo, chip ou reload): a geração do fetch divergiu da corrente e o
 * resultado de um termo antigo é descartado em favor do reset do efeito.
 */
export function resultadoObsoleto(geracaoDoFetch: number, geracaoCorrente: number): boolean {
  return geracaoDoFetch !== geracaoCorrente;
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
    // `location` também entra: o backend casa o termo em name, description E
    // location — sem o campo aqui, o filtro local descartaria um evento que
    // o servidor devolveu casando só pela location.
    const eventos = filtraTurismoPorTermo(events, term, (event) => [
      event.name,
      event.description,
      event.location,
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
