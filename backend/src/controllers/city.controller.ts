import type { Request, RequestHandler, Response } from 'express';

import * as service from '../services/city.service.js';
import { assertAdmin } from '../services/user.service.js';
import { asyncHandler } from '../utils/http.js';

export const list: RequestHandler = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const cities = await service.listCities();
  res.json(cities);
});

// Cidades são geridas apenas pelo admin (painel): leitura aberta no app,
// escrita exige role `admin` (401 sem sessão, 403 sem permissão).
export const create: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await assertAdmin(req.auth?.clerkId, 'gerenciar cidades');
  const doc = await service.createCity(req.body);
  res.status(201).json(doc);
});

export const remove: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await assertAdmin(req.auth?.clerkId, 'gerenciar cidades');
  await service.deleteCity(String(req.params.id));
  res.status(204).end();
});
