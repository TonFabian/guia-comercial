import { useEffect, useState } from 'react';

import type { DisplayBanner } from '@/data/mock';
import {
  getBanners,
  getCategories,
  getFeaturedCompany,
  getJobs,
  getPharmacyOnDuty,
} from '@/services/api';
import type { Category, Company, Job } from '@/types/domain';

export type HomeData = {
  loading: boolean;
  categories: Category[];
  banners: DisplayBanner[];
  jobs: Job[];
  featuredCompany: Company | null;
  pharmacy: Company | null;
};

const INITIAL: HomeData = {
  loading: true,
  categories: [],
  banners: [],
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
      const [categories, banners, jobs, featuredCompany, pharmacy] = await Promise.all([
        getCategories(),
        getBanners(),
        getJobs(),
        getFeaturedCompany(),
        getPharmacyOnDuty(),
      ]);
      if (cancelled) return;
      setState({
        loading: false,
        categories,
        banners,
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
