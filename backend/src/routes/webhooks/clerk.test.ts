import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { makeClerkWebhook } from './clerk.js';
import type { ClerkWebhookDeps } from './clerk.js';

// Evento no formato do webhook do Clerk: dados de perfil em snake_case.
const payload = {
  id: 'user_123',
  first_name: 'Maria',
  last_name: 'Silva',
  email_addresses: [{ id: 'em_1', email_address: 'maria@example.com' }],
  primary_email_address_id: 'em_1',
  phone_numbers: [] as Array<{ id: string; phone_number: string }>,
  primary_phone_number_id: null,
  image_url: 'https://img.clerk.com/m.png',
};

function buildDeps(
  event: unknown,
  overrides: Partial<ClerkWebhookDeps> = {},
): ClerkWebhookDeps {
  return {
    verify: async () =>
      event as Awaited<ReturnType<ClerkWebhookDeps['verify']>>,
    upsert: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  };
}

function buildApp(deps: ClerkWebhookDeps): express.Express {
  const app = express();
  app.post(
    '/api/webhooks/clerk',
    express.raw({ type: 'application/json' }),
    makeClerkWebhook(deps),
  );
  return app;
}

describe('webhook do Clerk', () => {
  it('responde 400 quando a assinatura é inválida', async () => {
    const deps = buildDeps(undefined, {
      verify: async () => {
        throw new Error('assinatura inválida');
      },
    });

    const response = await request(buildApp(deps))
      .post('/api/webhooks/clerk')
      .send({ type: 'user.created' });

    expect(response.status).toBe(400);
    expect(deps.upsert).not.toHaveBeenCalled();
    expect(deps.remove).not.toHaveBeenCalled();
  });

  it('user.created faz upsert do espelho do usuário', async () => {
    const deps = buildDeps({ type: 'user.created', data: payload });

    const response = await request(buildApp(deps))
      .post('/api/webhooks/clerk')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
    expect(deps.upsert).toHaveBeenCalledTimes(1);
    expect(deps.upsert).toHaveBeenCalledWith('user_123', {
      clerkId: 'user_123',
      firstName: 'Maria',
      lastName: 'Silva',
      email: 'maria@example.com',
      imageUrl: 'https://img.clerk.com/m.png',
    });
    expect(deps.remove).not.toHaveBeenCalled();
  });

  it('user.updated também atualiza o espelho do usuário', async () => {
    const deps = buildDeps({ type: 'user.updated', data: payload });

    const response = await request(buildApp(deps))
      .post('/api/webhooks/clerk')
      .send({});

    expect(response.status).toBe(200);
    expect(deps.upsert).toHaveBeenCalledWith('user_123', expect.anything());
    expect(deps.remove).not.toHaveBeenCalled();
  });

  it('user.deleted remove o espelho do usuário', async () => {
    const deps = buildDeps({ type: 'user.deleted', data: payload });

    const response = await request(buildApp(deps))
      .post('/api/webhooks/clerk')
      .send({});

    expect(response.status).toBe(200);
    expect(deps.remove).toHaveBeenCalledWith('user_123');
    expect(deps.upsert).not.toHaveBeenCalled();
  });

  it('evento não relacionado a usuário responde sem tocar o espelho', async () => {
    const deps = buildDeps({ type: 'organization.created', data: { id: 'org_1' } });

    const response = await request(buildApp(deps))
      .post('/api/webhooks/clerk')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
    expect(deps.upsert).not.toHaveBeenCalled();
    expect(deps.remove).not.toHaveBeenCalled();
  });
});
