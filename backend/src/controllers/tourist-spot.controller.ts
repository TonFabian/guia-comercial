import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';

import * as service from '../services/tourist-spot.service.js';
import { asyncHandler, parsePagination } from '../utils/http.js';

export const list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const pagination = parsePagination(req.query.page, req.query.pageSize);
  const { items, total } = await service.listTouristSpots(
    {
      category: req.query.category,
      q: req.query.q,
      active: req.query.active,
      city: req.query.city,
    },
    pagination,
  );
  res.json({ items, total, page: pagination.page, pageSize: pagination.pageSize });
});

export const getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  if (!isValidObjectId(id)) {
    throw Object.assign(new Error('id inválido'), { statusCode: 404 });
  }

  const doc = await service.getTouristSpotById(id);
  if (!doc) {
    res.status(404).json({ error: 'ponto turístico não encontrado' });
    return;
  }
  res.json(doc);
});

// As mutações são restritas ao admin: sem sessão o controller responde 401 e
// o service devolve 403 para quem não tem a role `admin`.
export const create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const doc = await service.createTouristSpot(req.body, req.auth?.clerkId);
  res.status(201).json(doc);
});

export const update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  if (!isValidObjectId(id)) {
    throw Object.assign(new Error('id inválido'), { statusCode: 404 });
  }

  const doc = await service.updateTouristSpot(id, req.body, req.auth?.clerkId);
  if (!doc) {
    res.status(404).json({ error: 'ponto turístico não encontrado' });
    return;
  }
  res.json(doc);
});

export const remove = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  if (!isValidObjectId(id)) {
    throw Object.assign(new Error('id inválido'), { statusCode: 404 });
  }

  await service.deleteTouristSpot(id, req.auth?.clerkId);
  res.status(204).end();
});
