/** Formatação e limpeza de números de telefone brasileiros. */

/** Remove tudo que não é dígito. */
export function onlyDigits(s: string): string {
  return s.replace(/\D/g, '');
}

/**
 * Formata dígitos em máscara brasileira:
 * - 11 dígitos (celular): (xx) xxxxx-xxxx
 * - 10 dígitos (fixo): (xx) xxxx-xxxx
 * Enquanto digita, aplica formatação parcial.
 */
export function formatPhone(digits: string): string {
  const d = onlyDigits(digits).slice(0, 11);

  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}