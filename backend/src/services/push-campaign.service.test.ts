import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CompanyModel } from '../models/company.model.js';
import { PushTokenModel } from '../models/push-token.model.js';
import { UserModel } from '../models/user.model.js';
import type { MemoryDocument, MemoryModel } from '../test-support/memory-model.js';
import { resolverSegmento } from './push-campaign.service.js';

vi.mock('../models/user.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { UserModel: criarModeloEmMemoria() };
});

vi.mock('../models/push-token.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { PushTokenModel: criarModeloEmMemoria() };
});

vi.mock('../models/company.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { CompanyModel: criarModeloEmMemoria() };
});

const modeloUsuarios = UserModel as unknown as MemoryModel;
const modeloTokens = PushTokenModel as unknown as MemoryModel;
const modeloEmpresas = CompanyModel as unknown as MemoryModel;

beforeEach(() => {
  modeloUsuarios.documents.length = 0;
  modeloTokens.documents.length = 0;
  modeloEmpresas.documents.length = 0;
});

describe('resolverSegmento — broadcast', () => {
  it('filtra opt-out e mantém guest', async () => {
    modeloUsuarios.documents.push({ _id: 'u1', clerkId: 'c1', preferences: { notifications: false } } as MemoryDocument);
    modeloUsuarios.documents.push({ _id: 'u2', clerkId: 'c2', preferences: { notifications: true } } as MemoryDocument);
    modeloTokens.documents.push({ _id: 't1', token: 'tok_opt', clerkId: 'c1' } as MemoryDocument);
    modeloTokens.documents.push({ _id: 't2', token: 'tok_ok', clerkId: 'c2' } as MemoryDocument);
    modeloTokens.documents.push({ _id: 't3', token: 'tok_guest' } as MemoryDocument);

    const resultado = await resolverSegmento({ kind: 'broadcast' });
    expect(resultado.targeted).toBe(3);
    expect(resultado.tokens).toEqual(['tok_ok', 'tok_guest']);
  });
});

describe('resolverSegmento — users', () => {
  it('ignora opt-out e usuário sem token', async () => {
    modeloUsuarios.documents.push({ _id: 'u1', clerkId: 'c1', preferences: { notifications: false } } as MemoryDocument);
    modeloUsuarios.documents.push({ _id: 'u2', clerkId: 'c2', preferences: { notifications: true } } as MemoryDocument);
    modeloTokens.documents.push({ _id: 't2', token: 'tok_ok', clerkId: 'c2' } as MemoryDocument);

    const resultado = await resolverSegmento({ kind: 'users', userIds: ['u1', 'u2'] });
    expect(resultado.tokens).toEqual(['tok_ok']);
    expect(resultado.targeted).toBe(1);
  });
});

describe('resolverSegmento — plan', () => {
  it('owner nulo não quebra', async () => {
    modeloEmpresas.documents.push({ _id: 'e1', plan: 'premium', ownerClerkId: null } as MemoryDocument);
    modeloEmpresas.documents.push({ _id: 'e2', plan: 'premium', ownerClerkId: 'c1' } as MemoryDocument);
    modeloUsuarios.documents.push({ _id: 'u1', clerkId: 'c1', preferences: { notifications: true } } as MemoryDocument);
    modeloTokens.documents.push({ _id: 't1', token: 'tok_plan', clerkId: 'c1' } as MemoryDocument);

    const resultado = await resolverSegmento({ kind: 'plan', plan: 'premium' });
    expect(resultado.tokens).toEqual(['tok_plan']);
  });
});

describe('resolverSegmento — favorites', () => {
  it('empresa sem favoritadores → vazio', async () => {
    const resultado = await resolverSegmento({ kind: 'favorites', companyId: 'comp_x' });
    expect(resultado.tokens).toEqual([]);
    expect(resultado.targeted).toBe(0);
  });

  it('favoritadores viram tokens', async () => {
    modeloUsuarios.documents.push({ _id: 'u1', clerkId: 'c1', favorites: ['comp_x'], preferences: { notifications: true } } as MemoryDocument);
    modeloTokens.documents.push({ _id: 't1', token: 'tok_fav', clerkId: 'c1' } as MemoryDocument);

    const resultado = await resolverSegmento({ kind: 'favorites', companyId: 'comp_x' });
    expect(resultado.tokens).toEqual(['tok_fav']);
  });
});

describe('resolverSegmento — dedup', () => {
  it('dedup de token repetido em dois usuários', async () => {
    modeloUsuarios.documents.push({ _id: 'u1', clerkId: 'c1', preferences: { notifications: true } } as MemoryDocument);
    modeloUsuarios.documents.push({ _id: 'u2', clerkId: 'c2', preferences: { notifications: true } } as MemoryDocument);
    modeloTokens.documents.push({ _id: 't1', token: 'tok_dup', clerkId: 'c1' } as MemoryDocument);
    modeloTokens.documents.push({ _id: 't2', token: 'tok_dup', clerkId: 'c2' } as MemoryDocument);

    const resultado = await resolverSegmento({ kind: 'users', userIds: ['u1', 'u2'] });
    expect(resultado.tokens).toEqual(['tok_dup']);
    expect(resultado.targeted).toBe(2);
  });
});

describe('resolverSegmento — city', () => {
  it('join por cidade', async () => {
    modeloUsuarios.documents.push({ _id: 'u1', clerkId: 'c1', city: '000000000000000000000001', preferences: { notifications: true } } as MemoryDocument);
    modeloTokens.documents.push({ _id: 't1', token: 'tok_city', clerkId: 'c1' } as MemoryDocument);

    const resultado = await resolverSegmento({ kind: 'city', cityId: '000000000000000000000001' });
    expect(resultado.tokens).toEqual(['tok_city']);
  });
});
