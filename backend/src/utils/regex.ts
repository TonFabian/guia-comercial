/**
 * Escapa metacaracteres de expressão regular para uso em `new RegExp`.
 *
 * Entrada do usuário é não confiável: sem o escape, um termo como `(` quebra
 * a consulta (SyntaxError → 500) e `.*` casa tudo. A regex resultante casa
 * o texto literalmente.
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
