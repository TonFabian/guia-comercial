import { describe, expect, it } from 'vitest';

import { buildMenu } from './profile-menu';

function ids(state: Parameters<typeof buildMenu>[0]) {
  return buildMenu(state).map((item) => item.id);
}

describe('buildMenu', () => {
  it('não inclui entrar no modo visitante', () => {
    expect(ids('guest')).toEqual(['meus-dados', 'minha-empresa', 'configuracoes']);
  });

  it('inclui sair apenas quando logado', () => {
    expect(ids('signedIn')).toEqual([
      'meus-dados',
      'minha-empresa',
      'configuracoes',
      'sair',
    ]);
  });

  it('não inclui entrar nem sair quando deslogado', () => {
    expect(ids('signedOut')).toEqual(['meus-dados', 'minha-empresa', 'configuracoes']);
  });

  it('não inclui entrar nem sair durante o loading', () => {
    expect(ids('loading')).toEqual(['meus-dados', 'minha-empresa', 'configuracoes']);
  });
});
