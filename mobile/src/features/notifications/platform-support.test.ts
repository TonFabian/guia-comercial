import { describe, expect, it } from 'vitest';

import { notificacoesNativasDisponiveis } from './platform-support';

describe('notificacoesNativasDisponiveis', () => {
  it('desabilita notificações no web', () => {
    expect(notificacoesNativasDisponiveis('web')).toBe(false);
  });

  it.each(['ios', 'android'])('habilita notificações em %s', (plataforma) => {
    expect(notificacoesNativasDisponiveis(plataforma)).toBe(true);
  });
});
