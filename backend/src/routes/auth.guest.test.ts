import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_placeholder');
vi.stubEnv('CLERK_PUBLISHABLE_KEY', 'pk_test_placeholder');

let app: Express;

beforeAll(async () => {
  app = (await import('../app.js')).default as unknown as Express;
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/auth/guest com Clerk configurado', () => {
  it('responde 200 declarando convidado', async () => {
    const response = await request(app).post('/api/auth/guest');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ guest: true });
  });
});
