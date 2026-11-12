/** Rótulo PT-BR do plano comercial (backend não importa do mobile). */
export function planLabel(plan: 'free' | 'basic' | 'premium'): string {
  switch (plan) {
    case 'premium':
      return 'Premium';
    case 'basic':
      return 'Básico';
    default:
      return 'Gratuito';
  }
}
