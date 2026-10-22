import { useEffect, useState } from 'react';

import { getCompanyById, getCouponsByCompany } from '@/services/api';
import type { Company, Coupon } from '@/types/domain';

export type CompanyDetailData = {
  company: Company | null;
  coupons: Coupon[];
  loading: boolean;
  /** `true` quando a empresa não existe (id inválido ou removida). */
  notFound: boolean;
};

const INITIAL: CompanyDetailData = {
  company: null,
  coupons: [],
  loading: true,
  notFound: false,
};

const EMPTY: CompanyDetailData = {
  company: null,
  coupons: [],
  loading: false,
  notFound: true,
};

type CompanyDetailState = {
  /** Id carregado; diferente do atual significa que a tela ainda está carregando. */
  id: string | null;
  data: CompanyDetailData;
};

/** Carrega a empresa e os cupons dela para a tela de detalhes. */
export function useCompanyDetail(companyId: string | undefined): CompanyDetailData {
  const [state, setState] = useState<CompanyDetailState>({ id: null, data: INITIAL });

  useEffect(() => {
    if (!companyId) return;

    const targetId = companyId;
    let cancelled = false;

    async function load() {
      const company = await getCompanyById(targetId);
      if (cancelled) return;

      if (!company) {
        setState({ id: targetId, data: { company: null, coupons: [], loading: false, notFound: true } });
        return;
      }

      setState({
        id: targetId,
        data: { company, coupons: [], loading: false, notFound: false },
      });

      const coupons = await getCouponsByCompany(targetId);
      if (cancelled) return;

      setState({ id: targetId, data: { company, coupons, loading: false, notFound: false } });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  if (!companyId) return EMPTY;
  if (state.id !== companyId) return { ...INITIAL };
  return state.data;
}
