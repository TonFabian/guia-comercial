import type { Company } from '@/types/domain';

export const COMPANIES_PER_PAGE = 3;

export interface OtherCompaniesPage {
  id: string;
  companies: Company[];
}

export function paginateOtherCompanies(companies: Company[]): OtherCompaniesPage[] {
  const pages: OtherCompaniesPage[] = [];

  for (let index = 0; index < companies.length; index += COMPANIES_PER_PAGE) {
    const group = companies.slice(index, index + COMPANIES_PER_PAGE);
    const first = group[0];
    if (!first) continue;

    pages.push({ id: first._id, companies: group });
  }

  return pages;
}
