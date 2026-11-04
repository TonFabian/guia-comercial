import type { Request, Response } from 'express';

import * as service from '../services/city.service.js';
import { asyncHandler } from '../utils/http.js';

export const list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const cities = await service.listCities();
  res.json(cities);
});

export const create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (process.env.CLERK_SECRET_KEY && !req.auth?.clerkId) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  const doc = await service.createCity(req.body);
  res.status(201).json(doc);
});

export const remove = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (process.env.CLERK_SECRET_KEY && !req.auth?.clerkId) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  await service.deleteCity(String(req.params.id));
  res.status(204).end();
});