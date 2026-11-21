export type Feature = 'catalog' | 'analytics' | 'priority' | 'coupons';

export interface PlanStrategy {
  label: string;
  hasFeature(f: Feature): boolean;
}

const FEATURE_MAPS: Record<string, Set<Feature>> = {
  free: new Set<Feature>([]),
  basic: new Set<Feature>(['catalog', 'priority']),
  premium: new Set<Feature>(['catalog', 'analytics', 'priority', 'coupons']),
};

const LABELS: Record<string, string> = {
  free: 'Gratuito',
  basic: 'Básico',
  premium: 'Premium',
};

export function getPlanStrategy(plan: string | null | undefined): PlanStrategy {
  const normalized = plan === 'basic' || plan === 'premium' ? plan : 'free';
  const features = FEATURE_MAPS[normalized];
  return {
    label: LABELS[normalized],
    hasFeature: (f: Feature) => features.has(f),
  };
}