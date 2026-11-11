import type { Company } from '@/types/domain';

export type Plan = 'free' | 'basic' | 'premium';

export type Feature =
  | 'gallery'
  | 'history'
  | 'promotion'
  | 'map'
  | 'badge'
  | 'catalog'
  | 'unlimitedCatalog'
  | 'clickableServices'
  | 'analytics'
  | 'prioritySearch'
  | 'verifiedBadge'
  | 'homeHighlight';

const FEATURES: Record<Plan, Set<Feature>> = {
  free: new Set<Feature>([]),
  basic: new Set<Feature>([
    'gallery',
    'history',
    'promotion',
    'map',
    'badge',
    'catalog',
    'prioritySearch',
  ]),
  premium: new Set<Feature>([
    'gallery',
    'history',
    'promotion',
    'map',
    'badge',
    'catalog',
    'unlimitedCatalog',
    'clickableServices',
    'analytics',
    'prioritySearch',
    'verifiedBadge',
    'homeHighlight',
  ]),
};

export function companyPlan(company: Company): Plan {
  const p = company.plan;
  if (p === 'basic' || p === 'premium') return p;
  return 'free';
}

/** Rótulo legível do plano para exibição nas telas. */
export function planLabel(plan: Plan): string {
  switch (plan) {
    case 'premium':
      return 'Premium';
    case 'basic':
      return 'Básico';
    default:
      return 'Gratuito';
  }
}

export function hasFeature(plan: Plan, feature: Feature): boolean {
  return FEATURES[plan].has(feature);
}

/** Ordem de prioridade: premium primeiro, free por último. */
const PLAN_PRIORITY: Record<Plan, number> = { premium: 0, basic: 1, free: 2 };

/**
 * Ordena por plano (premium > basic > free), estável dentro do mesmo plano.
 * Só reordena: empresas gratuitas continuam visíveis.
 */
export function sortCompaniesByPlan(companies: Company[]): Company[] {
  return [...companies].sort((a, b) => {
    const diferenca = PLAN_PRIORITY[companyPlan(a)] - PLAN_PRIORITY[companyPlan(b)];
    if (diferenca !== 0) return diferenca;
    return a.name.localeCompare(b.name);
  });
}