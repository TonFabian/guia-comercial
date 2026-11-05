import { describe, expect, it } from 'vitest';

import type { Company, TourEvent, TouristSpot } from '@/types/domain';

import { buildSearchSections } from './tourism-search';

function empresa(overrides: Partial<Company> = {}): Company {
  return {
    _id: 'emp-1',
    name: 'Pousada Serra Verde',
    slug: 'pousada-serra-verde',
    category: 'lodging',
    active: true,
    ...overrides,
  } as Company;
}

function atracao(overrides: Partial<TouristSpot> = {}): TouristSpot {
  return {
    _id: 'spot-1',
    name: 'Parque Natural',
    slug: 'parque-natural',
    description: 'Trilha entre rochas.',
    category: 'park',
    active: true,
    ...overrides,
  };
}

function evento(overrides: Partial<TourEvent> = {}): TourEvent {
  return {
    _id: 'event-1',
    name: 'Festival do Pequi',
    slug: 'festival-do-pequi',
    description: 'Três dias de festa.',
    category: 'festival',
    startDate: '2026-12-05',
    endDate: '2026-12-07',
    active: true,
    ...overrides,
  };
}

describe('buildSearchSections', () => {
  it('devolve as seções na ordem Empresas, Atrações, Eventos', () => {
    const sections = buildSearchSections({
      companies: [empresa()],
      spots: [atracao()],
      events: [evento()],
      showSpots: true,
      showEvents: true,
    });

    expect(sections.map((section) => section.key)).toEqual([
      'empresas',
      'atracoes',
      'eventos',
    ]);
    expect(sections.map((section) => section.title)).toEqual([
      'Empresas',
      'Atrações',
      'Eventos',
    ]);
  });

  it('omite seção sem itens', () => {
    const sections = buildSearchSections({
      companies: [empresa()],
      spots: [],
      events: [evento()],
      showSpots: true,
      showEvents: true,
    });

    expect(sections.map((section) => section.key)).toEqual(['empresas', 'eventos']);
  });

  it('omitem as seções de turismo com todos os chips desligados, mesmo com itens', () => {
    const sections = buildSearchSections({
      companies: [empresa()],
      spots: [atracao()],
      events: [evento()],
      showSpots: false,
      showEvents: false,
    });

    expect(sections.map((section) => section.key)).toEqual(['empresas']);
  });

  it('inclui só Atrações quando apenas o chip dela está ativo', () => {
    const sections = buildSearchSections({
      companies: [],
      spots: [atracao()],
      events: [evento()],
      showSpots: true,
      showEvents: false,
    });

    expect(sections.map((section) => section.key)).toEqual(['atracoes']);
  });

  it('inclui só Eventos quando apenas o chip dele está ativo', () => {
    const sections = buildSearchSections({
      companies: [],
      spots: [atracao()],
      events: [evento()],
      showSpots: false,
      showEvents: true,
    });

    expect(sections.map((section) => section.key)).toEqual(['eventos']);
  });

  it('envolve cada empresa em item kind company com id de Company', () => {
    const [secao] = buildSearchSections({
      companies: [empresa({ _id: 'emp-x' })],
      spots: [],
      events: [],
      showSpots: true,
      showEvents: true,
    });

    expect(secao.items).toEqual([
      { kind: 'company', id: 'emp-x', company: expect.any(Object) },
    ]);
  });

  it('envolve cada atração em item kind spot com id de TouristSpot', () => {
    const [secaoAtracoes] = buildSearchSections({
      companies: [],
      spots: [atracao({ _id: 'spot-x' })],
      events: [],
      showSpots: true,
      showEvents: true,
    });

    expect(secaoAtracoes.items).toEqual([
      { kind: 'spot', id: 'spot-x', spot: expect.any(Object) },
    ]);
  });

  it('envolve cada evento em item kind event com id de TourEvent', () => {
    const [secaoEventos] = buildSearchSections({
      companies: [],
      spots: [],
      events: [evento({ _id: 'event-x' })],
      showSpots: true,
      showEvents: true,
    });

    expect(secaoEventos.items).toEqual([
      { kind: 'event', id: 'event-x', event: expect.any(Object) },
    ]);
  });

  it('filtra turismo por termo comparando nome e descrição sem distinguir caixa', () => {
    const secoes = buildSearchSections({
      companies: [],
      spots: [atracao({ name: 'Cachoeira do Funil', description: 'Vale o passeio' })],
      events: [evento({ name: 'Festival de Inverno', description: 'Música e arte' })],
      showSpots: true,
      showEvents: true,
      term: 'FUNIL',
    });

    expect(secoes.map((secao) => secao.key)).toEqual(['atracoes']);

    const secoesPorDescricao = buildSearchSections({
      companies: [],
      spots: [atracao()],
      events: [evento({ description: 'Trilha do Funil fechada' })],
      showSpots: true,
      showEvents: true,
      term: 'funil',
    });

    expect(secoesPorDescricao.map((secao) => secao.key)).toEqual(['eventos']);
  });

  it('NÃO filtra empresas por termo (o termo delas vai ao servidor)', () => {
    const sections = buildSearchSections({
      companies: [empresa({ name: 'Pousada Serra' })],
      spots: [],
      events: [],
      showSpots: true,
      showEvents: true,
      term: 'pousada',
    });

    expect(sections[0].items).toHaveLength(1);
  });

  it('filtra por descrição quando o nome não casa', () => {
    const sections = buildSearchSections({
      companies: [],
      spots: [atracao({ name: 'Mirante da Serra', description: 'Vista do vale' })],
      events: [],
      showSpots: true,
      showEvents: false,
      term: 'VALE',
    });

    expect(sections.map((section) => section.key)).toEqual(['atracoes']);
  });

  it('devolve lista vazia sem empresas e sem chips de turismo', () => {
    const sections = buildSearchSections({
      companies: [],
      spots: [atracao()],
      events: [evento()],
      showSpots: false,
      showEvents: false,
    });

    expect(sections).toEqual([]);
  });
});
