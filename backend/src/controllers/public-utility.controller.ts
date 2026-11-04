import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';

import * as service from '../services/public-utility.service.js';
import { asyncHandler, parsePagination } from '../utils/http.js';

export const list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const pagination = parsePagination(req.query.page, req.query.pageSize);
  const { items, total } = await service.listPublicUtilities(
    {
      category: req.query.category,
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

  const doc = await service.getPublicUtilityById(id);
  if (!doc) {
    res.status(404).json({ error: 'serviço público não encontrado' });
    return;
  }
  res.json(doc);
});

// As mutações são restritas ao admin: sem sessão o controller responde 401 e
// o service devolve 403 para quem não tem a role `admin`.
export const create = asyncHandler(async (req: Request, res: Response): Promise<void> => {

  const doc = await service.createPublicUtility(req.body, req.auth?.clerkId);
  res.status(201).json(doc);
});

export const update = asyncHandler(async (req: Request, res: Response): Promise<void> => {

  const id = String(req.params.id);
  if (!isValidObjectId(id)) {
    throw Object.assign(new Error('id inválido'), { statusCode: 404 });
  }

  const doc = await service.updatePublicUtility(id, req.body, req.auth?.clerkId);
  if (!doc) {
    res.status(404).json({ error: 'serviço público não encontrado' });
    return;
  }
  res.json(doc);
});

export const remove = asyncHandler(async (req: Request, res: Response): Promise<void> => {

  const id = String(req.params.id);
  if (!isValidObjectId(id)) {
    throw Object.assign(new Error('id inválido'), { statusCode: 404 });
  }

  await service.deletePublicUtility(id, req.auth?.clerkId);
  res.status(204).end();
});
