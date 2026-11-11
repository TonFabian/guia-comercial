/** Remove tudo que não é dígito. */
export function onlyDigits(s: string): string {
  return s.replace(/\D/g, '');
}

/**
 * Formata um telefone (com ou sem código de país +55) no padrão brasileiro:
 * - 11 dígitos (celular): (xx) xxxxx-xxxx
 * - 10 dígitos (fixo): (xx) xxxx-xxxx
 * Quando o número traz o código do país (55 + 10/11 dígitos), prefixa "+55 ".
 */
export function formatPhone(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length === 0) return value.trim() || '—';

  let country = '';
  let national = digits;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    country = '+55 ';
    national = digits.slice(2);
  }

  let formatted: string;
  if (national.length <= 2) {
    formatted = `(${national}`;
  } else if (national.length <= 6) {
    formatted = `(${national.slice(0, 2)}) ${national.slice(2)}`;
  } else if (national.length <= 10) {
    formatted = `(${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`;
  } else {
    formatted = `(${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7, 11)}`;
  }

  return `${country}${formatted}`;
}