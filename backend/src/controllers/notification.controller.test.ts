import type { Request, Response } from 'express';
import { describe, it, expect, vi } from 'vitest';

import { makeListController, makeMarkReadController, makeMarkUnreadController, makeUnreadCountController } from './notification.controller.js';

function fakeResponse() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response & typeof res;
}

function fakeRequest(auth: Record<string, unknown> = {}, query: Record<string, unknown> = {}, body: unknown = {}) {
  return { auth, query, body } as unknown as Request;
}

describe('notification controller list', () => {
  it('401 sem clerkId', async () => {
    const handler = makeListController({ list: vi.fn() as never });
    const req = fakeRequest({}, {});
    const res = fakeResponse();
    await handler(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('notification controller markRead', () => {
  it('400 com id malformado', async () => {
    const handler = makeMarkReadController({ mark: vi.fn() as never });
    const req = fakeRequest({ clerkId: 'c1' }, {}, { ids: ['nao-e-objectid'] });
    const res = fakeResponse();
    await handler(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('notification controller unreadCount', () => {
  it('401 sem clerkId', async () => {
    const handler = makeUnreadCountController({ count: vi.fn() as never });
    const req = fakeRequest({}, {});
    const res = fakeResponse();
    await handler(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('notification controller markUnread', () => {
  it('401 sem clerkId', async () => {
    const handler = makeMarkUnreadController({ mark: vi.fn() as never });
    const req = fakeRequest({}, {}, {});
    const res = fakeResponse();
    await handler(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('400 com id malformado', async () => {
    const handler = makeMarkUnreadController({ mark: vi.fn() as never });
    const req = fakeRequest({ clerkId: 'c1' }, {}, { ids: ['nao-e-objectid'] });
    const res = fakeResponse();
    await handler(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('marca ids válidos e devolve unreadCount', async () => {
    const mark = vi.fn().mockResolvedValue(2);
    const handler = makeMarkUnreadController({ mark });
    const req = fakeRequest({ clerkId: 'c1' }, {}, { ids: ['507f1f77bcf86cd799439011'] });
    const res = fakeResponse();
    await handler(req, res, vi.fn());
    expect(mark).toHaveBeenCalledWith('c1', ['507f1f77bcf86cd799439011']);
    expect(res.json).toHaveBeenCalledWith({ unreadCount: 2 });
  });
});
