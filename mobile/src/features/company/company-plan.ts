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
  | 'sponsoredCoupon'
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
    'sponsoredCoupon',
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

export function hasFeature(plan: Plan, feature: Feature): boolean {
  return FEATURES[plan].has(feature);
}