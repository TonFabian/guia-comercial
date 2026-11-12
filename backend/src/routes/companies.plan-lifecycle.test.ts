import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CompanyModel } from '../models/company.model.js';
import { UserModel } from '../models/user.model.js';
import { runPlanLifecycle } from '../services/plan-lifecycle.service.js';
import type { MemoryDocument, MemoryModel } from '../test-support/memory-model.js';

vi.mock('../models/company.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { CompanyModel: criarModeloEmMemoria() };
});
vi.mock('../models/user.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { UserModel: criarModeloEmMemoria() };
});

const { chavesEnviadas, enviadosEmail, enviadosPush } = vi.hoisted(() => ({
  chavesEnviadas: new Set<string>(),
  enviadosEmail: [] as unknown[],
  enviadosPush: [] as unknown[],
}));

vi.mock('../models/plan-notification.model.js', () => ({
  PlanNotificationModel: {
    create: async (doc: { companyId: unknown; kind: string; planExpiresAt: string }) => {
      const chave = `${String(doc.companyId)}|${doc.kind}|${doc.planExpiresAt}`;
      if (chavesEnviadas.has(chave)) {
        throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
      }
      chavesEnviadas.add(chave);
      return doc;
    },
  },
}));

vi.mock('../services/email.service.js', () => ({
  sendEmail: async (msg: unknown) => {
    enviadosEmail.push(msg);
  },
}));
vi.mock('../services/push.service.js', () => ({
  sendPushToUser: async (clerkId: string, title: string, body: string) => {
    enviadosPush.push({ clerkId, title, body });
  },
}));

const modeloEmpresas = CompanyModel as unknown as MemoryModel;
const modeloUsuarios = UserModel as unknown as MemoryModel;

const HOJE = '2026-11-30';
const D7 = '2026-12-07';
const D1 = '2026-12-01';
const VENCIDA = '2026-11-30';

function empresa(dados: Partial<MemoryDocument>): MemoryDocument {
  return {
    _id: '000000000000000000000220',
    name: 'Loja Teste',
    slug: 'loja-teste',
    description: 'd',
    category: '000000000000000000000120',
    ownerClerkId: 'user_dono',
    plan: 'premium',
    ...dados,
  };
}

beforeEach(() => {
  chavesEnviadas.clear();
  enviadosEmail.length = 0;
  enviadosPush.length = 0;
  modeloEmpresas.documents.length = 0;
  modeloUsuarios.documents.length = 0;
  modeloUsuarios.documents.push({ _id: '000000000000000000000420', clerkId: 'user_dono', email: 'dono@teste.com', pushToken: 'ExponentPushToken[dono]' });
});

describe('runPlanLifecycle', () => {
  it('empresa em D-7 → notifica (email + push) e grava claim', async () => {
    modeloEmpresas.documents.push(empresa({ planExpiresAt: D7 }));
    const res = await runPlanLifecycle(HOJE);
    expect(res.notificadas).toBe(1);
    expect(enviadosEmail).toHaveLength(1);
    expect(enviadosPush).toHaveLength(1);
    expect(JSON.stringify(enviadosEmail[0])).toContain('7 dias');
  });

  it('empresa em D-1 → avisa "vence amanhã"', async () => {
    modeloEmpresas.documents.push(empresa({ planExpiresAt: D1 }));
    await runPlanLifecycle(HOJE);
    expect(JSON.stringify(enviadosEmail[0])).toContain('amanhã');
  });

  it('empresa vencida → rebaixa para free, preserva datas e notifica "expirado"', async () => {
    modeloEmpresas.documents.push(empresa({ planExpiresAt: VENCIDA, planStartedAt: '2026-10-30' }));
    const res = await runPlanLifecycle(HOJE);
    expect(res.rebaixadas).toBe(1);
    const doc = modeloEmpresas.documents[0] as Record<string, unknown>;
    expect(doc.plan).toBe('free');
    expect(doc.planStartedAt).toBe('2026-10-30');
    expect(doc.planExpiresAt).toBe(VENCIDA);
    expect(JSON.stringify(enviadosEmail[0])).toContain('expirou');
  });

  it('SEGUNDA execução com a mesma data não duplica nada', async () => {
    modeloEmpresas.documents.push(empresa({ planExpiresAt: D7 }));
    await runPlanLifecycle(HOJE);
    const emailPrimeira = enviadosEmail.length;
    await runPlanLifecycle(HOJE);
    expect(enviadosEmail.length).toBe(emailPrimeira);
  });

  it('empresa sem planExpiresAt e empresa free ficam intocadas', async () => {
    modeloEmpresas.documents.push(empresa({ planExpiresAt: undefined }));
    modeloEmpresas.documents.push(empresa({ plan: 'free', planExpiresAt: VENCIDA }));
    const res = await runPlanLifecycle(HOJE);
    expect(res.notificadas).toBe(0);
    expect(res.rebaixadas).toBe(0);
  });

  it('empresa sem dono vinculado → ciclo roda, notificação não sai (claim grava)', async () => {
    modeloEmpresas.documents.push(empresa({ ownerClerkId: undefined, planExpiresAt: D7 }));
    const res = await runPlanLifecycle(HOJE);
    expect(res.notificadas).toBe(1);
    expect(enviadosEmail).toHaveLength(0);
  });
});
