import type { Request, Response } from 'express';

import * as service from '../services/notice.service.js';
import { asyncHandler } from '../utils/http.js';

export const list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const activeOnly = req.query.active === 'true';
  const notices = await service.listNotices(activeOnly);
  res.json(notices);
});

export const getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const doc = await service.getNoticeById(String(req.params.id));
  if (!doc) {
    res.status(404).json({ error: 'aviso não encontrado' });
    return;
  }
  res.json(doc);
});

export const create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (process.env.CLERK_SECRET_KEY && !req.auth?.clerkId) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  const doc = await service.createNotice(req.body);
  res.status(201).json(doc);
});

export const update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (process.env.CLERK_SECRET_KEY && !req.auth?.clerkId) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  const doc = await service.updateNotice(String(req.params.id), req.body);
  if (!doc) {
    res.status(404).json({ error: 'aviso não encontrado' });
    return;
  }
  res.json(doc);
});

export const remove = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (process.env.CLERK_SECRET_KEY && !req.auth?.clerkId) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  await service.deleteNotice(String(req.params.id));
  res.status(204).end();
});