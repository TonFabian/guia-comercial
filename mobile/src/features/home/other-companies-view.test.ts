import { describe, expect, it } from 'vitest';

import type { Company } from '@/types/domain';
import { paginateOtherCompanies } from './other-companies-view';

function makeCompany(id: string): Company {
  return {
    _id: id,
    name: `Empresa ${id}`,
    slug: id,
    description: '',
    category: 'outros',
  };
}

describe('paginateOtherCompanies', () => {
  it('agrupa três empresas por página e deixa a sobra na última', () => {
    const companies = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(makeCompany);

    const pages = paginateOtherCompanies(companies);

    expect(pages.map((page) => page.id)).toEqual(['a', 'd', 'g']);
    expect(pages.map((page) => page.companies.map((company) => company._id))).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
      ['g'],
    ]);
  });

  it('não cria página quando a lista está vazia', () => {
    expect(paginateOtherCompanies([])).toEqual([]);
  });
});
