import { describe, expect, it } from 'vitest';

import type { TourEvent, TouristSpot } from '@/types/domain';

import { ehDataPassada, toTourismCards } from './tourism-view';

const HOJE = '2026-11-05';

function atracao(overrides: Partial<TouristSpot> = {}): TouristSpot {
  return {
    _id: 'parque-natural',
    name: 'Parque Natural Pedra do Castelo',
    slug: 'parque-natural-pedra-do-castelo',
    description: 'Unidade de conservação municipal.',
    category: 'park',
    city: 'Castelo do Piauí',
    active: true,
    ...overrides,
  };
}

function evento(overrides: Partial<TourEvent> = {}): TourEvent {
  return {
    _id: 'canyon-fest',
    name: 'Cânyon Fest Poti',
    slug: 'canyon-fest-poti',
    description: 'Festival de três dias.',
    category: 'festival',
    startDate: '2026-12-05',
    endDate: '2026-12-07',
    city: 'Castelo do Piauí',
    active: true,
    ...overrides,
  };
}

describe('ehDataPassada', () => {
  it('considera passada uma data lexicograficamente anterior a hoje', () => {
    expect(ehDataPassada('2026-11-04', HOJE)).toBe(true);
  });

  it('não considera passada a data de hoje nem uma futura', () => {
    expect(ehDataPassada('2026-11-05', HOJE)).toBe(false);
    expect(ehDataPassada('2026-11-06', HOJE)).toBe(false);
  });
});

describe('toTourismCards', () => {
  it('mescla atrações primeiro e eventos depois', () => {
    const cards = toTourismCards(
      [atracao({ _id: 'a1' }), atracao({ _id: 'a2' })],
      [evento({ _id: 'e1' })],
      HOJE,
    );

    expect(cards.map((card) => card.id)).toEqual(['a1', 'a2', 'e1']);
    expect(cards[0].kind).toBe('spot');
    expect(cards[2].kind).toBe('event');
  });

  it('monta o href de atração e de evento por tipo', () => {
    const cards = toTourismCards([atracao()], [evento()], HOJE);

    expect(cards[0].href).toBe('/tourist-spot/parque-natural');
    expect(cards[1].href).toBe('/event/canyon-fest');
  });

  it('marca evento com início futuro como Em breve', () => {
    const [card] = toTourismCards([], [evento()], HOJE);

    expect(card.badge).toBe('Em breve');
  });

  it('marca evento em andamento como Hoje', () => {
    const [card] = toTourismCards(
      [],
      [evento({ startDate: HOJE, endDate: '2026-11-08' })],
      HOJE,
    );

    expect(card.badge).toBe('Hoje');
  });

  it('marca evento encerrado quando a data de fim passou', () => {
    const [card] = toTourismCards(
      [],
      [evento({ startDate: '2026-11-01', endDate: '2026-11-03' })],
      HOJE,
    );

    expect(card.badge).toBe('Encerrado');
  });

  it('não coloca badge em atração', () => {
    const [card] = toTourismCards([atracao()], [], HOJE);

    expect(card.badge).toBeNull();
  });

  it('monta subtitulo de atração com categoria e cidade', () => {
    const [card] = toTourismCards([atracao()], [], HOJE);

    expect(card.subtitle).toBe('Parque · Castelo do Piauí');
  });

  it('monta subtitulo de evento com cidade e período', () => {
    const [card] = toTourismCards([], [evento()], HOJE);

    expect(card.subtitle).toBe('Castelo do Piauí · 05/12 – 07/12');
  });

  it('usa a primeira foto como imagem do card', () => {
    const [spotCard, eventCard] = toTourismCards(
      [atracao({ photos: ['https://exemplo.com/pedra.jpg'] })],
      [evento({ photos: ['https://exemplo.com/fest.jpg', 'https://exemplo.com/fest2.jpg'] })],
      HOJE,
    );

    expect(spotCard.imageUrl).toBe('https://exemplo.com/pedra.jpg');
    expect(eventCard.imageUrl).toBe('https://exemplo.com/fest.jpg');
  });

  it('deixa imagem nula quando não há foto', () => {
    const [card] = toTourismCards([atracao()], [], HOJE);

    expect(card.imageUrl).toBeNull();
  });

  it('devolve lista vazia quando não há atrações nem eventos', () => {
    expect(toTourismCards([], [], HOJE)).toEqual([]);
  });

  it('consegue ler cidade vindo como objeto City (populate)', () => {
    const [card] = toTourismCards(
      [atracao({ city: { _id: 'c1', name: 'Castelo do Piauí', slug: 'castelo-do-piaui', state: 'PI' } })],
      [],
      HOJE,
    );

    expect(card.subtitle).toBe('Parque · Castelo do Piauí');
  });
});
