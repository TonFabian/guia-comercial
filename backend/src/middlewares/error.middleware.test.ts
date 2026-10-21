import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { errorHandler, mapError } from './error.middleware.js';

/**
 * Monta um app mínimo com o errorHandler global. O Express só roteia erros
 * para um middleware que declare 4 parâmetros (err, req, res, next) — se a
 * assinatura ficar com 3, este teste falha (o Express usaria o handler
 * padrão, que devolve HTML em vez de JSON).
 */
function appWithErrorHandler() {
  const app = express();
  app.get('/boom', () => {
    throw new Error('falha inesperada');
  });
  app.get('/teapot', () => {
    throw Object.assign(new Error('sou um bule'), { statusCode: 418 });
  });
  app.use(errorHandler);
  return app;
}

describe('mapError', () => {
  it('usa o statusCode definido pela camada de services', () => {
    const result = mapError(Object.assign(new Error('não encontrado'), { statusCode: 404 }));
    expect(result.status).toBe(404);
    expect(result.message).toBe('não encontrado');
  });

  it('mapeia Mongoose ValidationError para 400', () => {
    const error = Object.assign(new Error('invalid'), { name: 'ValidationError' });
    expect(mapError(error).status).toBe(400);
  });

  it('mapeia Mongoose CastError para 404', () => {
    const error = Object.assign(new Error('cast'), { name: 'CastError' });
    expect(mapError(error).status).toBe(404);
  });

  it('mapeia chave duplicada (11000) para 409', () => {
    const error = Object.assign(new Error('dup'), { code: 11000 });
    expect(mapError(error).status).toBe(409);
  });

  it('mapeia ZodError para 400', () => {
    const error = Object.assign(new Error('zod'), { name: 'ZodError' });
    expect(mapError(error).status).toBe(400);
  });

  it('usa 500 para erros desconhecidos', () => {
    const result = mapError(new Error('boom'));
    expect(result.status).toBe(500);
    expect(result.message).toBe('Erro interno do servidor');
  });
});

describe('errorHandler (middleware global)', () => {
  it('responde 500 em JSON quando a rota lança erro', async () => {
    const response = await request(appWithErrorHandler()).get('/boom');

    expect(response.status).toBe(500);
    expect(response.type).toBe('application/json');
    expect(response.body.error).toBe('Erro interno do servidor');
    expect(response.body.message).toBe('falha inesperada');
  });

  it('respeita statusCode customizado lançado pela camada de services', async () => {
    const response = await request(appWithErrorHandler()).get('/teapot');

    expect(response.status).toBe(418);
    expect(response.body.error).toBe('sou um bule');
  });
});
