/** Formatação de valores exibidos na tela da empresa. */

/** Preço em reais no padrão brasileiro (R$ 59,90). */
export function formatPrice(price: number): string {
  return `R$ ${price.toFixed(2).replace('.', ',')}`;
}
