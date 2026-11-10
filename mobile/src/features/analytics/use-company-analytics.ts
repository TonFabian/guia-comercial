import { useEffect, useState } from 'react';

import { getCompanyAnalytics } from '@/services/api';
import type { CompanyAnalyticsSummary } from '@/services/api';
import { companyPlan } from '@/features/company/company-plan';
import type { Company } from '@/types/domain';

interface Estado {
  companyId: string;
  summary: CompanyAnalyticsSummary;
}

/**
 * Resumo de engajamento da empresa, apenas para plano Premium (gating é
 * server-side; o hook só evita a chamada quando a UI já sabe que não é premium).
 * Erros de rede ficam silenciosos: o card some, a tela segue usável.
 */
export function useCompanyAnalytics(company: Company | null): CompanyAnalyticsSummary | null {
  // Guarda a empresa junto do resumo: a leitura nunca retorna dado de outra
  // empresa em troca de tela, sem precisar de setState síncrono no efeito.
  const [estado, setEstado] = useState<Estado | null>(null);
  const premium = company !== null && companyPlan(company) === 'premium';

  useEffect(() => {
    if (!premium || !company) return;
    let cancelled = false;
    getCompanyAnalytics(company._id)
      .then((summary) => {
        if (!cancelled && summary) setEstado({ companyId: company._id, summary });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [premium, company]);

  if (!company || !estado || estado.companyId !== company._id) return null;
  return estado.summary;
}
