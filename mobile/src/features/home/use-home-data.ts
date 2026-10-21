import { useEffect, useState } from 'react';

import type { DisplayBanner } from '@/data/mock';
import {
  getBanners,
  getCategories,
  getCoupons,
  getFeaturedCompany,
  getJobs,
  getPharmacyOnDuty,
} from '@/services/api';
import type { Category, Company, Coupon, Job } from '@/types/domain';

export type HomeData = {
  loading: boolean;
  categories: Category[];
  banners: DisplayBanner[];
  coupons: Coupon[];
  jobs: Job[];
  featuredCompany: Company | null;
  pharmacy: Company | null;
};

const INITIAL: HomeData = {
  loading: true,
  categories: [],
  banners: [],
  coupons: [],
  jobs: [],
  featuredCompany: null,
  pharmacy: null,
};

/**
 * Carrega todos os dados da Home via src/services/api.ts (com fallback para
 * os mocks quando o backend não responde).
 */
export function useHomeData(): HomeData {
  const [state, setState] = useState<HomeData>(INITIAL);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [categories, banners, coupons, jobs, featuredCompany, pharmacy] = await Promise.all([
        getCategories(),
        getBanners(),
        getCoupons(),
        getJobs(),
        getFeaturedCompany(),
        getPharmacyOnDuty(),
      ]);
      if (cancelled) return;
      setState({
        loading: false,
        categories,
        banners,
        coupons,
        jobs,
        featuredCompany,
        pharmacy,
      });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
