import { describe, expect, it } from 'vitest';

import { buildTourismQuery } from './tourism-query';

describe('buildTourismQuery', () => {
  it('inclui city quando definida', () => {
    const query = buildTourismQuery({ active: true, city: 'castelo-do-piaui' });
    expect(query).toContain('city=castelo-do-piaui');
  });

  it('omite city quando ausente ou vazia', () => {
    const semCity = buildTourismQuery({ active: true });
    expect(semCity).not.toContain('city=');

    const cityVazia = buildTourismQuery({ active: true, city: '' });
    expect(cityVazia).not.toContain('city=');
  });

  it('inclui active=true quando definido', () => {
    expect(buildTourismQuery({ active: true })).toContain('active=true');
  });

  it('inclui active=false quando definido', () => {
    expect(buildTourismQuery({ active: false })).toContain('active=false');
  });

  it('omite active quando ausente', () => {
    expect(buildTourismQuery({ city: 'castelo-do-piaui' })).not.toContain('active=');
  });

  it('inclui q quando termo não vazio', () => {
    const query = buildTourismQuery({ q: 'cachoeira' });
    expect(query).toContain('q=cachoeira');
  });

  it('inclui q com o termo aparado (trim)', () => {
    const query = buildTourismQuery({ q: '  cachoeira  ' });
    expect(query).toContain('q=cachoeira');
    expect(query).not.toContain('q=%20');
  });

  it('omite q quando vazio ou só espaços', () => {
    expect(buildTourismQuery({ q: '' })).not.toContain('q=');
    expect(buildTourismQuery({ q: '   ' })).not.toContain('q=');
  });

  it('inclui page quando maior que 1', () => {
    expect(buildTourismQuery({ page: 2 })).toContain('page=2');
  });

  it('omite page quando 1 ou ausente (default do backend)', () => {
    expect(buildTourismQuery({ active: true, page: 1 })).not.toContain('page=');
    expect(buildTourismQuery({ active: true })).not.toContain('page=');
  });

  it('inclui pageSize default 6 sempre', () => {
    expect(buildTourismQuery({})).toContain('pageSize=6');
  });

  it('respeita pageSize customizado', () => {
    expect(buildTourismQuery({ pageSize: 12 })).toContain('pageSize=12');
  });

  it('serializa todos os parâmetros no formato URLSearchParams (?a=1&b=2)', () => {
    const query = buildTourismQuery({ active: true, city: 'castelo-do-piaui', q: 'cachoeira', page: 2 });
    expect(query.startsWith('?')).toBe(true);
    const pares = Object.fromEntries(new URLSearchParams(query.slice(1)));
    expect(pares).toEqual({
      active: 'true',
      city: 'castelo-do-piaui',
      q: 'cachoeira',
      page: '2',
      pageSize: '6',
    });
  });
});
