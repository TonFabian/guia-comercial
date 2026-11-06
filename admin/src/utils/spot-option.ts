/**
 * Valor do select de atrações para um item da programação do evento.
 *
 * O backend pode ter salvo id ou slug, e a atração pode ter sido excluída ou
 * não estar na primeira página da listagem (o painel carrega só as 100
 * primeiras). Por isso o id é SEMPRE preservado quando existe — caso
 * contrário o PUT substituiria a programação inteira e apagaria a referência
 * silenciosamente. O editor desenha a opção "Atração removida do catálogo"
 * para esse caso, mas o id segue no estado do formulário e vai no payload.
 */
export function spotOptionValue(
  valor: string | { _id: string } | null | undefined,
  spots: { _id: string }[],
): string {
  if (!valor) return '';
  const id = typeof valor === 'string' ? valor : valor._id;
  const found = spots.find((option) => option._id === id);
  return found ? found._id : id;
}
