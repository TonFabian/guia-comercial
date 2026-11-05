import type { Company } from '@/types/domain';

/** Remove da lista secundária exatamente a empresa exibida em destaque. */
export function excludeFeaturedCompany(
  companies: Company[],
  featured: Company | null,
): Company[] {
  if (!featured) return companies;

  return companies.filter((company) => company._id !== featured._id);
}
