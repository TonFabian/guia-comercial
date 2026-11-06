import { describe, expect, it } from 'vitest';

import { loginFooterAction, loginFooterPrompt, loginSubmitLabel } from './login-labels';

describe('login labels', () => {
  it('usa textos de entrada no modo entrar', () => {
    expect(loginSubmitLabel('entrar')).toBe('Entrar');
    expect(loginFooterPrompt('entrar')).toBe('Não tem uma conta? ');
    expect(loginFooterAction('entrar')).toBe('Cadastre-se');
  });

  it('usa textos de cadastro no modo criar', () => {
    expect(loginSubmitLabel('criar')).toBe('Criar conta');
    expect(loginFooterPrompt('criar')).toBe('Já tem uma conta? ');
    expect(loginFooterAction('criar')).toBe('Entrar');
  });
});
