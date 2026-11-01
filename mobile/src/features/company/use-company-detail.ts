import { useEffect, useState } from 'react';

import { getCompanyById } from '@/services/api';
import type { Company } from '@/types/domain';

type CompanyDetailState = {
  company: Company | null;
  loading: boolean;
  error: string | null;
};

const NOT_FOUND_ERROR = 'Empresa não encontrada.';
const LOAD_ERROR = 'Não foi possível carregar a empresa.';

export function useCompanyDetail(companyId: string): CompanyDetailState {
  const [state, setState] = useState<CompanyDetailState>(() => ({
    company: null,
    loading: Boolean(companyId),
    error: companyId ? null : NOT_FOUND_ERROR,
  }));

  useEffect(() => {
    if (!companyId) return;

    let cancelled = false;

    getCompanyById(companyId)
      .then((company) => {
        if (cancelled) return;
        setState({
          company,
          loading: false,
          error: company ? null : NOT_FOUND_ERROR,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ company: null, loading: false, error: LOAD_ERROR });
      });

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return state;
}
