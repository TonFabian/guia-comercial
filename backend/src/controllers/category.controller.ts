import type { Request, Response } from 'express';

import * as categoryService from '../services/category.service.js';
import type { CreateCategoryDto, UpdateCategoryDto } from '../types/dto.js';
import { asyncHandler, parsePagination } from '../utils/http.js';

export const list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const pagination = parsePagination(req.query.page, req.query.pageSize);
  const { items, total } = await categoryService.listCategories(pagination);
  res.json({ items, total, page: pagination.page, pageSize: pagination.pageSize });
});

export const getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  throwIfInvalidId(String(req.params.id));
  const category = await categoryService.getCategoryById(String(req.params.id));
  if (!category) {
    res.status(404).json({ error: 'categoria não encontrada' });
    return;
  }
  res.json(category);
});

export const create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (process.env.CLERK_SECRET_KEY && !req.auth?.clerkId) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  const category = await categoryService.createCategory(req.body as CreateCategoryDto, req.auth?.clerkId);
  res.status(201).json(category);
});

export const update = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (process.env.CLERK_SECRET_KEY && !req.auth?.clerkId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    throwIfInvalidId(String(req.params.id));
    const category = await categoryService.updateCategory(String(req.params.id), req.body as UpdateCategoryDto, req.auth?.clerkId);
    if (!category) {
      res.status(404).json({ error: 'categoria não encontrada' });
      return;
    }
    res.json(category);
  },
);

export const remove = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (process.env.CLERK_SECRET_KEY && !req.auth?.clerkId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    throwIfInvalidId(String(req.params.id));
    await categoryService.deleteCategory(String(req.params.id), req.auth?.clerkId);
    res.status(204).end();
  },
);

function throwIfInvalidId(id: string): void {
  if (!categoryService.isObjectId(id)) {
    throw Object.assign(new Error('id inválido'), { statusCode: 404 });
  }
}
