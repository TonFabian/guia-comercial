import type { Request, Response } from 'express';

import * as service from '../services/autonomous-professional.service.js';
import { asyncHandler, parsePagination } from '../utils/http.js';

export const list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const pagination = parsePagination(req.query.page, req.query.pageSize);
  const { items, total } = await service.listProfessionals(pagination);
  res.json({ items, total, page: pagination.page, pageSize: pagination.pageSize });
});

export const getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const doc = await service.getProfessionalById(String(req.params.id));
  if (!doc) {
    res.status(404).json({ error: 'não encontrado' });
    return;
  }
  res.json(doc);
});

export const create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const doc = await service.createProfessional(req.body, req.auth?.clerkId);
  res.status(201).json(doc);
});

export const update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const doc = await service.updateProfessional(String(req.params.id), req.body, req.auth?.clerkId);
  if (!doc) {
    res.status(404).json({ error: 'não encontrado' });
    return;
  }
  res.json(doc);
});

export const remove = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await service.deleteProfessional(String(req.params.id), req.auth?.clerkId);
  res.status(204).end();
});