import { beforeEach, describe, expect, it, vi } from 'vitest';

import { touchSession } from './user.service.js';

const { updateOneMock } = vi.hoisted(() => ({ updateOneMock: vi.fn() }));

vi.mock('../models/user.model.js', () => ({
  UserModel: { updateOne: updateOneMock },
}));

interface DocumentoSessao {
  lastSid?: string;
  lastSignInAt?: string;
}

interface FiltroSessao {
  clerkId: string;
  lastSid?: { $ne: string };
}

interface AtualizacaoSessao {
  $set: { lastSid: string; lastSignInAt: string };
}

/** Reproduz o filtro `$ne` do Mongo: só aplica o `$set` quando a sid difere. */
function simularBanco(documento: DocumentoSessao) {
  return (filtro: FiltroSessao, atualizacao: AtualizacaoSessao) => ({
    exec: async () => {
      if (documento.lastSid === filtro.lastSid?.$ne) {
        return { matchedCount: 0 };
      }

      Object.assign(documento, atualizacao.$set);
      return { matchedCount: 1 };
    },
  });
}

describe('touchSession', () => {
  beforeEach(() => {
    updateOneMock.mockReset();
  });

  it('não grava quando a sid já é a última registrada', async () => {
    const documento: DocumentoSessao = { lastSid: 'sess_1' };
    updateOneMock.mockImplementation(simularBanco(documento));

    await touchSession('user_1', 'sess_1');

    expect(documento).toEqual({ lastSid: 'sess_1' });
  });

  it('grava a nova sid com lastSignInAt em ISO quando a sessão muda', async () => {
    const documento: DocumentoSessao = { lastSid: 'sess_1' };
    updateOneMock.mockImplementation(simularBanco(documento));

    await touchSession('user_1', 'sess_2');

    expect(documento.lastSid).toBe('sess_2');
    expect(documento.lastSignInAt).toBeDefined();
    expect(Date.parse(documento.lastSignInAt ?? '')).not.toBeNaN();
  });
});
