import request from 'supertest';
import { describe, expect, it } from 'vitest';

// Importa o app (sem conectar Mongo) — nunca o index.ts, que chama connectDatabase().
import app from './app.js';

describe('GET /api/health', () => {
  it('responde 200 com status ok e timestamp ISO', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(() => new Date(response.body.timestamp)).not.toThrow();
  });
});

describe('rota inexistente', () => {
  it('responde 404 com JSON padronizado', async () => {
    const response = await request(app).get('/api/nao-existe');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Rota não encontrada');
    expect(response.body.path).toBe('/api/nao-existe');
  });
});
