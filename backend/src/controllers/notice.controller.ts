import type { Request, Response } from 'express';

import * as service from '../services/notice.service.js';
import { assertAdmin, ehAdmin } from '../services/user.service.js';
import { asyncHandler, parsePagination } from '../utils/http.js';
import { lerEnum } from '../utils/query.js';

/** Valores aceitos no parâmetro `active` da listagem de avisos. */
const VALORES_ACTIVE = ['true', 'false', 'all'] as const;

export const list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const pagination = parsePagination(req.query.page, req.query.pageSize);
  // Sanitização aqui no controller (e não no service): o service já recebe o
  // modo pronto (assinatura `listNotices(filtro, pagination)`) e o
  // `req.query.active` é lido ÚNICAMENTE neste ponto — a borda de parse é o
  // momento certo de validar e o 400 nasce com o nome do parâmetro. Não é
  // `lerBooleano` porque o contrato agora aceita também 'all'.
  const active = lerEnum(req.query.active, VALORES_ACTIVE, 'active');
  // Default fail-closed: ausente é tratado como 'true' — a API pública só
  // publicar aviso ativo E vigente; devolver sem filtro (comportamento antigo)
  // expunha rascunhos e vencidos a qualquer visitante (achado da auditoria).
  const filtro =
    active === 'false' ? 'inativos' : active === 'all' ? 'todos' : 'ativos';
  // Rascunhos e lista completa são conteúdo administrativo: pedir `active`
  // diferente de 'true'/ausente é tentar listar o que não foi publicado —
  // exige admin. Sem sessão o `assertAdmin` devolve 401; com sessão sem a
  // role, 403 (mesmo padrão dos demais endpoints administrativos).
  if (filtro !== 'ativos') {
    await assertAdmin(
      req.auth?.clerkId,
      filtro === 'todos' ? 'listar todos os avisos' : 'listar rascunhos de aviso',
    );
  }
  const { items, total } = await service.listNotices(filtro, pagination);
  res.json({ items, total, page: pagination.page, pageSize: pagination.pageSize });
});

export const getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const doc = await service.getNoticeById(String(req.params.id));
  if (!doc) {
    res.status(404).json({ error: 'aviso não encontrado' });
    return;
  }
  // Fail-closed: rascunho ou fora da janela é conteúdo administrativo. Para
  // não revelar a existência do aviso não publicado, responde com o MESMO 404
  // do id inexistente (não 403) — exceto para admin, que precisa abrir o
  // documento no painel.
  if (!service.avisoEhPublico(doc) && !(await ehAdmin(req.auth?.clerkId))) {
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