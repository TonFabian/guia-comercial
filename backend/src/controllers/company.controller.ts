import type { Request, Response } from 'express';

import * as companyService from '../services/company.service.js';
import type { CreateCompanyDto, UpdateCompanyDto } from '../types/dto.js';
import { asyncHandler, parsePagination } from '../utils/http.js';

export const list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const pagination = parsePagination(req.query.page, req.query.pageSize);
  const { items, total } = await companyService.listCompanies(
    { category: req.query.category, q: req.query.q, featured: req.query.featured },
    pagination,
  );
  res.json({ items, total, page: pagination.page, pageSize: pagination.pageSize });
});

export const getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  throwIfInvalidId(String(req.params.id));
  const company = await companyService.getCompanyById(String(req.params.id));
  if (!company) {
    res.status(404).json({ error: 'empresa não encontrada' });
    return;
  }
  res.json(company);
});

export const create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const company = await companyService.createCompany(req.body as CreateCompanyDto);
  res.status(201).json(company);
});

export const update = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    throwIfInvalidId(String(req.params.id));
    const company = await companyService.updateCompany(String(req.params.id), req.body as UpdateCompanyDto);
    if (!company) {
      res.status(404).json({ error: 'empresa não encontrada' });
      return;
    }
    res.json(company);
  },
);

export const remove = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    throwIfInvalidId(String(req.params.id));
    await companyService.deleteCompany(String(req.params.id));
    res.status(204).end();
  },
);

function throwIfInvalidId(id: string): void {
  if (!companyService.isObjectId(id)) {
    throw Object.assign(new Error('id inválido'), { statusCode: 404 });
  }
}
