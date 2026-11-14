import type { Request, Response } from 'express';

import * as companyService from '../services/company.service.js';
import * as analyticsService from '../services/analytics.service.js';
import type { CreateCompanyDto, UpdateCompanyDto, UpdatePlanDto } from '../types/dto.js';
import { asyncHandler, parsePagination } from '../utils/http.js';
import { auditLog } from '../utils/audit.js';

export const list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const pagination = parsePagination(req.query.page, req.query.pageSize);
  const { items, total } = await companyService.listCompanies(
    { category: req.query.category, q: req.query.q, featured: req.query.featured, owner: req.query.owner, city: req.query.city, prioritize: req.query.prioritize },
    pagination,
    req.auth?.clerkId,
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
  const company = await companyService.createCompany(req.body as CreateCompanyDto, req.auth?.clerkId);
  res.status(201).json(company);
});

export const update = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    throwIfInvalidId(String(req.params.id));
    const company = await companyService.updateCompany(String(req.params.id), req.body as UpdateCompanyDto, req.auth?.clerkId);
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
    const id = String(req.params.id);
    const atual = await companyService.getCompanyById(id);
    await companyService.deleteCompany(id, req.auth?.clerkId);
    auditLog({
      actor: req.auth?.clerkId ?? 'legado',
      action: 'company.delete',
      resource: 'company',
      resourceId: id,
      before: atual
        ? { _id: atual._id, name: atual.name, plan: atual.plan }
        : undefined,
      after: undefined,
    });
    res.status(204).end();
  },
);

export const updatePlan = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  throwIfInvalidId(String(req.params.id));
  const id = String(req.params.id);
  const payload = req.body as UpdatePlanDto;
  const atual = await companyService.getCompanyById(id);
  const before = atual
    ? { plan: atual.plan, planStartedAt: atual.planStartedAt, planExpiresAt: atual.planExpiresAt }
    : undefined;
  const company = await companyService.updateCompanyPlan(id, payload, req.auth?.clerkId);
  if (!company) {
    res.status(404).json({ error: 'empresa não encontrada' });
    return;
  }
  auditLog({
    actor: req.auth?.clerkId ?? 'legado',
    action: 'company.plan.update',
    resource: 'company',
    resourceId: id,
    before,
    after: {
      plan: company.plan,
      planStartedAt: company.planStartedAt,
      planExpiresAt: company.planExpiresAt,
    },
  });
  res.json(company);
});

export const trackView = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  throwIfInvalidId(String(req.params.id));
  const exists = await analyticsService.companyExists(String(req.params.id));
  if (!exists) {
    res.status(404).json({ error: 'empresa não encontrada' });
    return;
  }
  await analyticsService.incrementView(String(req.params.id));
  res.status(204).end();
});

export const trackWhatsappClick = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  throwIfInvalidId(String(req.params.id));
  const exists = await analyticsService.companyExists(String(req.params.id));
  if (!exists) {
    res.status(404).json({ error: 'empresa não encontrada' });
    return;
  }
  await analyticsService.incrementWhatsappClick(String(req.params.id));
  res.status(204).end();
});

export const trackFavorite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  throwIfInvalidId(String(req.params.id));
  const exists = await analyticsService.companyExists(String(req.params.id));
  if (!exists) {
    res.status(404).json({ error: 'empresa não encontrada' });
    return;
  }
  await analyticsService.incrementFavorite(String(req.params.id));
  res.status(204).end();
});

export const untrackFavorite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  throwIfInvalidId(String(req.params.id));
  const exists = await analyticsService.companyExists(String(req.params.id));
  if (!exists) {
    res.status(404).json({ error: 'empresa não encontrada' });
    return;
  }
  await analyticsService.decrementFavorite(String(req.params.id));
  res.status(204).end();
});

export const getAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  throwIfInvalidId(String(req.params.id));
  const company = await companyService.getCompanyById(String(req.params.id), true);
  if (!company) {
    res.status(404).json({ error: 'empresa não encontrada' });
    return;
  }
  // Autorização: owner ou admin. Sem auth configurada (legado) permite.
  if (process.env.CLERK_SECRET_KEY) {
    const clerkId = req.auth?.clerkId;
    if (!clerkId) {
      res.status(401).json({ error: 'não autenticado' });
      return;
    }
    const isOwner = (company as { ownerClerkId?: string } | null)?.ownerClerkId === clerkId;
    if (!isOwner) {
      // verifica admin
      const { findUserByClerkId } = await import('../services/user.service.js');
      const user = await findUserByClerkId(clerkId);
      if (user?.role !== 'admin') {
        res.status(403).json({ error: 'sem permissão' });
        return;
      }
    }
  }
  // Gating server-side da feature vendida: analytics só no plano Premium —
  // vale também no modo legado, onde não há sessão para autorizar.
  const plan = (company as { plan?: string } | null)?.plan;
  if (plan !== 'premium') {
    res.status(403).json({ error: 'analytics disponível apenas no plano Premium' });
    return;
  }
  const from = String(req.query.from ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const to = String(req.query.to ?? new Date().toISOString().slice(0, 10));
  const summary = await analyticsService.getSummary(String(req.params.id), from, to);
  res.json(summary);
});

function throwIfInvalidId(id: string): void {
  if (!companyService.isObjectId(id)) {
    throw Object.assign(new Error('id inválido'), { statusCode: 404 });
  }
}
