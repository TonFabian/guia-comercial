import { describe, expect, it } from 'vitest';

import type { Company } from '@/types/domain';
import { excludeFeaturedCompany } from './home-companies';

function makeCompany(id: string, name: string): Company {
  return {
    _id: id,
    name,
    slug: id,
    description: '',
    category: 'outros',
  };
}

describe('excludeFeaturedCompany', () => {
  it('remove a empresa em destaque da lista secundária', () => {
    const featured = makeCompany('1', 'Construtora Alicerce');
    const other = makeCompany('2', 'Mercado Central');

    expect(excludeFeaturedCompany([featured, other], featured)).toEqual([other]);
  });

  it('mantém a lista quando não há destaque', () => {
    const companies = [makeCompany('1', 'A'), makeCompany('2', 'B')];

    expect(excludeFeaturedCompany(companies, null)).toEqual(companies);
  });

  it('não remove empresas apenas por nome igual', () => {
    const featured = makeCompany('1', 'A');
    const sameName = makeCompany('2', 'A');

    expect(excludeFeaturedCompany([featured, sameName], featured)).toEqual([sameName]);
  });

  it('preserva a ordem dos demais itens', () => {
    const featured = makeCompany('2', 'Destaque');
    const first = makeCompany('1', 'Primeira');
    const third = makeCompany('3', 'Terceira');

    expect(excludeFeaturedCompany([first, featured, third], featured)).toEqual([first, third]);
  });
});
