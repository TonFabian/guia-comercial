import type { Request, Response } from 'express';

import * as service from '../services/notice.service.js';
import { assertAdmin } from '../services/user.service.js';
import { asyncHandler, parsePagination } from '../utils/http.js';
import { lerBooleano } from '../utils/query.js';

export const list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const pagination = parsePagination(req.query.page, req.query.pageSize);
  // Sanitização aqui no controller (e não no service): o service já recebe o
  // booleano pronto (assinatura `listNotices(activeOnly, pagination)`) e o
  // `req.query.active` é lido ÚNICAMENTE neste ponto — a borda de parse é o
  // momento certo de validar e o 400 nasce com o nome do parâmetro.
  const active = lerBooleano(req.query.active, 'active');
  // Rascunhos de aviso são conteúdo administrativo: pedir `active=false`
  // explicitamente é tentar listar o que não foi publicado — exige admin.
  // Sem a checagem, qualquer visitante lista os avisos inativos (achado da
  // auditoria). `active=true` e ausente continuam públicos (Mural da Home).
  if (active === false) {
    await assertAdmin(req.auth?.clerkId, 'listar rascunhos de aviso');
  }
  const { items, total } = await service.listNotices(active === true, pagination);
  res.json({ items, total, page: pagination.page, pageSize: pagination.pageSize });
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
  const doc = await service.createNotice(req.body, req.auth?.clerkId);
  res.status(201).json(doc);
});

export const update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const doc = await service.updateNotice(String(req.params.id), req.body, req.auth?.clerkId);
  if (!doc) {
    res.status(404).json({ error: 'aviso não encontrado' });
    return;
  }
  res.json(doc);
});

export const remove = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await service.deleteNotice(String(req.params.id), req.auth?.clerkId);
  res.status(204).end();
});