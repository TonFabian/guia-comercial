import express from 'express';
import type { Request, Response } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import type { RequestAuth } from '../types/express.d.js';
import { guestScrub } from './guest.middleware.js';

const empresaFake = {
  slug: 'farmacia-sao-jose',
  category: 'farmacia',
  name: 'Farmácia São José',
  phone: '+5584321234567',
  whatsapp: '+5584999999999',
  address: 'Rua das Flores, 123',
};

const cupomFake = {
  code: 'DESCONTO10',
  title: '10% de desconto',
  company: empresaFake,
};

function buildApp(
  auth?: RequestAuth,
  payload?: unknown,
): express.Express {
  const app = express();
  app.use(guestScrub());
  app.get('/recurso', (req, res) => {
    if (auth) {
      (req as Request & { auth?: RequestAuth }).auth = auth;
    }
    res.json(payload ?? empresaFake);
    return undefined as unknown as Response;
  });
  return app;
}

describe('guestScrub', () => {
  it('reescreve a resposta da convidada com contato nulo', async () => {
    const response = await request(buildApp({ guest: true })).get('/recurso');

    expect(response.status).toBe(200);
    expect(response.body.phone).toBeNull();
    expect(response.body.whatsapp).toBeNull();
    expect(response.body.address).toBeNull();
    expect(response.body.name).toBe('Farmácia São José');
  });

  it('reescreve também a página paginada preservando total/page/pageSize', async () => {
    const pagina = { items: [empresaFake, cupomFake], total: 2, page: 1, pageSize: 20 };
    const response = await request(buildApp({ guest: true }, pagina)).get('/recurso');

    expect(response.body.total).toBe(2);
    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(20);
    expect(response.body.items[0].phone).toBeNull();
    expect(response.body.items[1].code).toBeNull();
    expect(response.body.items[1].company.phone).toBeNull();
  });

  it('mantém a resposta integral para usuário autenticado', async () => {
    const response = await request(
      buildApp({ guest: false, clerkId: 'user_123' }),
    ).get('/recurso');

    expect(response.body.phone).toBe('+5584321234567');
    expect(response.body.address).toBe('Rua das Flores, 123');
  });

  it('não altera a resposta no modo legado (sem req.auth)', async () => {
    const response = await request(buildApp()).get('/recurso');

    expect(response.body.phone).toBe('+5584321234567');
  });
});
