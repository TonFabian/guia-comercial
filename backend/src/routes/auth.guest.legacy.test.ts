import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.stubEnv('CLERK_SECRET_KEY', '');
vi.stubEnv('CLERK_PUBLISHABLE_KEY', '');

let app: Express;

beforeAll(async () => {
  app = (await import('../app.js')).default as unknown as Express;
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/auth/guest no modo legado', () => {
  it('responde 404 porque a rota só é montada com Clerk configurado', async () => {
    const response = await request(app).post('/api/auth/guest');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Rota não encontrada');
  });
});
