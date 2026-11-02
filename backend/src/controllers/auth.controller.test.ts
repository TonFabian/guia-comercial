import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { guestLogin } from './auth.controller.js';

function fakeResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response as unknown as Response & typeof response;
}

describe('controller /auth/guest', () => {
  it('responde 200 declarando a entrada como convidado', async () => {
    const response = fakeResponse();

    await guestLogin({} as Request, response, vi.fn());

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ guest: true });
  });
});
