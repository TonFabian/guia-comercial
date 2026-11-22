export interface CompanyDataSource {
  getFeatured(city?: string, signal?: AbortSignal): Promise<import('@/types/domain').Company[]>;
  getCategories(signal?: AbortSignal): Promise<import('@/types/domain').Category[]>;
  getBanners(signal?: AbortSignal): Promise<import('@/types/domain').Banner[]>;
  getCoupons(signal?: AbortSignal): Promise<import('@/types/domain').Coupon[]>;
  getJobs(signal?: AbortSignal): Promise<import('@/types/domain').Job[]>;
  getPharmacyOnDuty(city?: string, signal?: AbortSignal): Promise<import('@/types/domain').Company | null>;
}

export function createDataSource(env: { apiConfigured: boolean; dev: boolean }): CompanyDataSource {
  // Delegação real ocorre em api.ts; esta fábrica mantém o contrato estável.
  return {
    async getFeatured() { return []; },
    async getCategories() { return []; },
    async getBanners() { return []; },
    async getCoupons() { return []; },
    async getJobs() { return []; },
    async getPharmacyOnDuty() { return null; },
  };
}
