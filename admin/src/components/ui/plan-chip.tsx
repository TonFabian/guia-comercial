
export type Plan = 'free' | 'basic' | 'premium';

export function PlanChip({ plan }: { plan: Plan }) {
  return <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs ${planChipClass(plan)}`}>{planChipLabel(plan)}</span>;
}

/** Label do chip por plano — Premium ganha destaque de assinatura paga. */
export function planChipLabel(plan: Plan): string {
  if (plan === 'premium') return '★ Premium';
  if (plan === 'basic') return 'Básico';
  return 'Gratuito';
}

/** Classes Tailwind do chip por plano (tokens do @theme em styles.css). */
export function planChipClass(plan: Plan): string {
  if (plan === 'premium') {
    return 'bg-gradient-to-r from-primary to-[#ff9800] text-[#111827] font-semibold';
  }
  if (plan === 'basic') {
    return 'bg-surface-hover text-primary';
  }
  return 'bg-surface-hover text-text-muted';
}
