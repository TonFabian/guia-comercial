export type AuthMode = 'entrar' | 'criar';

/** Texto do botão principal conforme o modo do formulário. */
export function loginSubmitLabel(mode: AuthMode): string {
  return mode === 'entrar' ? 'Entrar' : 'Criar conta';
}

/** Texto que antecede o link de alternância no rodapé. */
export function loginFooterPrompt(mode: AuthMode): string {
  return mode === 'entrar' ? 'Não tem uma conta? ' : 'Já tem uma conta? ';
}

/** Rótulo do link de alternância no rodapé. */
export function loginFooterAction(mode: AuthMode): string {
  return mode === 'entrar' ? 'Cadastre-se' : 'Entrar';
}
