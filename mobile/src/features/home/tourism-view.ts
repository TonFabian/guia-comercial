/**
 * Conversão dos pontos turísticos e eventos em cards da seção
 * "Turismo & Eventos" da Home.
 *
 * Comparação de datas usa o formato fixo `YYYY-MM-DD` e portanto é
 * LEXICOGRÁFICA (`new Date(iso)` ficaria preso ao fuso/UTC e seria incapaz de
 * distinguir o dia local). A data de "hoje" é injetada pelo chamador para o
 * teste ser determinístico.
 */
import type { TourEvent, TouristSpot, TouristSpotCategory } from '@/types/domain';

/** Card unificado de atração ou evento, pronto para a tela. */
export type TourismCard = {
  id: string;
  kind: 'spot' | 'event';
  title: string;
  subtitle: string;
  imageUrl: string | null;
  badge: string | null;
  href: string;
};

const CATEGORIA_ATRACAO: Record<TouristSpotCategory, string> = {
  nature: 'Natureza',
  park: 'Parque',
  waterfall: 'Cachoeira',
  viewpoint: 'Mirante',
  museum: 'Museu',
  church: 'Igreja',
  monument: 'Monumento',
  square: 'Praça',
  adventure: 'Aventura',
  other: 'Outro',
};

/** Compara `dateIso` e `hoje` (ambos `YYYY-MM-DD`) — lexicográfico, sem Date. */
export function ehDataPassada(dateIso: string, hoje: string): boolean {
  return dateIso < hoje;
}

/** A cidade chega como string ou como City populada — aceita os dois formatos. */
function nomeDaCidade(city: TouristSpot['city']): string {
  if (!city) return '';
  return typeof city === 'string' ? city : (city.name ?? '');
}

/** `YYYY-MM-DD` → `DD/MM` (formato fixo, sem Date). */
function dataCurta(dateIso: string): string {
  return `${dateIso.slice(8, 10)}/${dateIso.slice(5, 7)}`;
}

/** Junta as partes não vazias de um subtítulo com o separador. */
function juntaPartes(partes: string[]): string {
  return partes.filter((parte) => parte).join(' · ');
}

/** Badge do evento conforme o dia local: futuro, em andamento ou encerrado. */
function badgeDoEvento(evento: TourEvent, hoje: string): string {
  if (ehDataPassada(evento.endDate, hoje)) return 'Encerrado';
  if (evento.startDate > hoje) return 'Em breve';
  return 'Hoje';
}

function cardDeAtracao(atracao: TouristSpot): TourismCard {
  return {
    id: atracao._id,
    kind: 'spot',
    title: atracao.name,
    subtitle: juntaPartes([
      CATEGORIA_ATRACAO[atracao.category],
      nomeDaCidade(atracao.city),
    ]),
    imageUrl: atracao.photos?.[0] ?? null,
    badge: null,
    href: `/tourist-spot/${atracao._id}`,
  };
}

function cardDeEvento(evento: TourEvent, hoje: string): TourismCard {
  const cidade = nomeDaCidade(evento.city);
  const periodo =
    evento.startDate === evento.endDate
      ? dataCurta(evento.startDate)
      : `${dataCurta(evento.startDate)} – ${dataCurta(evento.endDate)}`;

  return {
    id: evento._id,
    kind: 'event',
    title: evento.name,
    subtitle: juntaPartes([cidade, periodo]),
    imageUrl: evento.photos?.[0] ?? null,
    badge: badgeDoEvento(evento, hoje),
    href: `/event/${evento._id}`,
  };
}

/**
 * Mescla os cards da Home: **atrações primeiro, eventos depois**. O badge do
 * evento depende do `hoje` injetado (`YYYY-MM-DD`).
 */
export function toTourismCards(
  spots: TouristSpot[],
  events: TourEvent[],
  hoje: string,
): TourismCard[] {
  return [
    ...spots.map(cardDeAtracao),
    ...events.map((evento) => cardDeEvento(evento, hoje)),
  ];
}
