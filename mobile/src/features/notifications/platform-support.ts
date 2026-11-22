/** O expo-notifications só expõe respostas de toque em Android e iOS. */
export function notificacoesNativasDisponiveis(plataforma: string): boolean {
  return plataforma !== 'web';
}
