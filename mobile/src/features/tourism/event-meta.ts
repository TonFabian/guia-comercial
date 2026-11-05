/**
 * Formatação de datas/horários, descrição de entradas/ingressos e labels de
 * categoria do módulo de turismo — funções PURAS (sem React, sem I/O) para
 * serem testadas de forma determinística.
 *
 * Datas chegam em `YYYY-MM-DD` e NUNCA passam por `new Date(iso)`: a meia-
 * noite UTC viraria o dia anterior em fuso negativo. O parse é feito pelas
 * partes e a comparação de dias é lexicográfica (o formato é fixo e
 * zero-preenchido), o que dispensa converter para `Date`.
 */
import type { TourEventCategory, TouristSpotCategory } from '@/types/domain';

const MESES_ABREV = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
] as const;

/** `YYYY-MM-DD` → "12 de nov" (dia sem zero à esquerda, mês abreviado em pt-BR). */
export function formatarDataEvento(iso: string): string {
  const partes = iso.split('-');
  const mes = Number(partes[1]);
  const dia = Number(partes[2]);
  const nomeMes = MESES_ABREV[mes - 1] ?? '';
  return `${dia} de ${nomeMes}`;
}

/**
 * Período do evento para exibição:
 * - mesmo dia → "12 de nov";
 * - mesmo mês → "12–14 de nov";
 * - meses diferentes → "28 de nov – 2 de dez".
 */
export function formatarPeriodoEvento(startDate: string, endDate: string): string {
  if (startDate === endDate) return formatarDataEvento(startDate);
  const mesmoMes = startDate.slice(0, 7) === endDate.slice(0, 7);
  if (mesmoMes) return `${Number(startDate.slice(8))}–${formatarDataEvento(endDate)}`;
  return `${formatarDataEvento(startDate)} – ${formatarDataEvento(endDate)}`;
}

/** Estado do evento no dia local: ainda vai acontecer, está rolando ou acabou. */
export type EstadoEvento = 'em-breve' | 'agora' | 'encerrado';

/**
 * "Hoje" no fuso do guia (America/Fortaleza, igual ao backend/admin) como
 * `YYYY-MM-DD`. Usa `Intl` em vez do relógio do dispositivo: perto da
 * meia-noite um app em fuso à frente/atrás desincronizaria do servidor.
 */
export function hojeISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Compara `YYYY-MM-DD` lexicograficamente; `hoje` é injetado pelo chamador. */
export function classificarEvento(
  startDate: string,
  endDate: string,
  hoje: string,
): EstadoEvento {
  if (endDate < hoje) return 'encerrado';
  if (startDate > hoje) return 'em-breve';
  return 'agora';
}

/** Horário do evento: "10:00 às 23:00" (ambos), "10:00" (só início), `null`. */
export function formatarHorario(startTime?: string, endTime?: string): string | null {
  if (!startTime) return null;
  if (!endTime) return startTime;
  return `${startTime} às ${endTime}`;
}

/** Descrição da entrada do ponto turístico: gratuita, paga (com preço) ou doação. */
export function descreverEntrada(
  entryFee?: 'free' | 'paid' | 'donation',
  entryPrice?: string,
): string | null {
  if (entryFee === 'free') return 'Entrada gratuita';
  if (entryFee === 'donation') return 'Aceita doações';
  if (entryFee === 'paid') return entryPrice ? `Entrada: ${entryPrice}` : 'Entrada paga';
  return null;
}

/** Descrição do ingresso do evento: gratuito ou pago (com preço). */
export function descreverIngresso(
  ticket?: 'free' | 'paid',
  ticketPrice?: string,
): string | null {
  if (ticket === 'free') return 'Ingresso gratuito';
  if (ticket === 'paid') return ticketPrice ? `Ingresso: ${ticketPrice}` : 'Ingresso pago';
  return null;
}

const LABEL_CATEGORIA_ATRACAO: Record<TouristSpotCategory, string> = {
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

const LABEL_CATEGORIA_EVENTO: Record<TourEventCategory, string> = {
  festival: 'Festival',
  show: 'Show',
  fair: 'Feira',
  exhibition: 'Exposição',
  sport: 'Esporte',
  religious: 'Religioso',
  cultural: 'Cultural',
  workshop: 'Oficina',
  other: 'Outro',
};

/** Label pt-BR da categoria de ponto turístico. */
export function labelCategoriaAtracao(category: TouristSpotCategory): string {
  return LABEL_CATEGORIA_ATRACAO[category];
}

/** Label pt-BR da categoria de evento turístico. */
export function labelCategoriaEvento(category: TourEventCategory): string {
  return LABEL_CATEGORIA_EVENTO[category];
}
