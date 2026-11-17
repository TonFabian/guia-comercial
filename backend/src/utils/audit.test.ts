import { describe, expect, it, vi } from 'vitest';

import { Types } from 'mongoose';

import { auditLog, redigir } from './audit.js';

describe('redigir', () => {
  it('remove chaves sensíveis no topo', () => {
    const entrada = { name: 'Empresa', email: 'a@b.com', phone: '123', token: 't', password: 'p', secret: 's', ownerClerkId: 'u' };
    const saida = redigir(entrada) as Record<string, unknown>;
    expect(saida).toEqual({ name: 'Empresa' });
    expect(entrada.email).toBe('a@b.com'); // sem mutação
  });

  it('é case-insensitive por igualdade exata (não substring)', () => {
    const entrada = { Token: 'x', myToken: 'y', EMAIL: 'z' };
    const saida = redigir(entrada) as Record<string, unknown>;
    expect(saida).toEqual({ myToken: 'y' });
  });

  it('recursivo em objetos e arrays', () => {
    const entrada = { items: [{ email: 'a@b.com', id: 1 }, { phone: '9' }], meta: { secret: 'x', ok: true } };
    const saida = redigir(entrada) as Record<string, unknown>;
    expect(saida).toEqual({ items: [{ id: 1 }, {}], meta: { ok: true } });
  });

  it('preserva Date e ObjectId', () => {
    const data = new Date('2026-01-01T00:00:00.000Z');
    const id = new Types.ObjectId('000000000000000000000001');
    const entrada = { data, id, arr: [data, id] };
    const saida = redigir(entrada) as Record<string, unknown>;
    expect(saida.data).toBe(data);
    expect(saida.id).toBe(id);
    expect((saida.arr as unknown[])[0]).toBe(data);
    expect((saida.arr as unknown[])[1]).toBe(id);
  });

  it('preserva primitivos, null e undefined', () => {
    expect(redigir(42)).toBe(42);
    expect(redigir('abc')).toBe('abc');
    expect(redigir(null)).toBeNull();
    expect(redigir(undefined)).toBeUndefined();
  });

  it('retorna novo objeto sem mutar entrada', () => {
    const entrada = { a: { b: 1 }, arr: [1, 2] };
    const saida = redigir(entrada) as Record<string, unknown>;
    expect(saida).not.toBe(entrada);
    expect(saida.a).not.toBe(entrada.a);
    expect(saida.arr).not.toBe(entrada.arr);
  });
});

describe('auditLog', () => {
  it('emite uma linha JSON em process.stdout', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const payload = { actor: 'u', action: 'a', resource: 'r', resourceId: 'id' };
    auditLog(payload);
    expect(spy).toHaveBeenCalledWith(JSON.stringify(payload) + '\n');
    spy.mockRestore();
  });

  it('redige before/after', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    auditLog({ actor: 'u', action: 'a', resource: 'r', resourceId: 'id', before: { email: 'x' }, after: { token: 'y', ok: 1 } });
    expect(spy).toHaveBeenCalledWith(
      JSON.stringify({ actor: 'u', action: 'a', resource: 'r', resourceId: 'id', before: {}, after: { ok: 1 } }) + '\n',
    );
    spy.mockRestore();
  });
});
