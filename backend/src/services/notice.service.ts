import { isValidObjectId } from 'mongoose';

import { NoticeModel } from '../models/notice.model.js';
import type { Notice } from '../../../shared/domain.js';
import type { Pagination } from '../utils/http.js';
import { assertAdmin } from './user.service.js';

/**
 * Ids chegam como texto de URL: um id malformado não pode depender do
 * CastError do Mongoose (e do comportamento do driver) — virá 404 explícito
 * antes de qualquer consulta, como já ocorre nos controllers de resources com
 * `throwIfInvalidId`.
 */
function assegurarIdValido(id: string): void {
  if (!isValidObjectId(id)) {
    throw Object.assign(new Error('aviso não encontrado'), { statusCode: 404 });
  }
}

/**
 * Modos de listagem de avisos:
 * - 'ativos' — publicados (active) e dentro da janela de datas; é o que o app
 *   (Mural) e o visitante veem;
 * - 'inativos' — só rascunhos (consulta administrativa);
 * - 'todos' — sem filtro nenhum (lista de gerenciamento do painel).
 */
export type FiltroAvisos = 'ativos' | 'inativos' | 'todos';

/**
 * Condição Mongo de "aviso público": publicado (active) e dentro da janela de
 * datas — `startsAt` ausente ou ≤ agora; `expiresAt` ausente ou ≥ agora.
 * Fonte única da regra de vigência da listagem em modo 'ativos'.
 */
function condicaoAvisoPublico(agora: string): Record<string, unknown> {
  return {
    active: true,
    $and: [
      { $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gte: agora } }] },
      { $or: [{ startsAt: { $exists: false } }, { startsAt: { $lte: agora } }] },
    ],
  };
}

/**
 * Espelho em documento (não em query) da mesma regra de vigência:
 * `active === true` e dentro da janela de datas. Usado no detalhe por id para
 * decidir se o aviso pode ser exibido a um visitante sem reavaliar a janela
 * manualmente no controller.
 */
export function avisoEhPublico(
  aviso: Pick<Notice, 'active' | 'startsAt' | 'expiresAt'>,
  agora = new Date(),
): boolean {
  if (!aviso.active) {
    return false;
  }
  const agoraIso = agora.toISOString();
  if (aviso.startsAt !== undefined && aviso.startsAt > agoraIso) {
    return false;
  }
  if (aviso.expiresAt !== undefined && aviso.expiresAt < agoraIso) {
    return false;
  }
  return true;
}

export async function listNotices(
  filtro: FiltroAvisos = 'ativos',
  pagination?: Pagination,
): Promise<{ items: Notice[]; total: number }> {
  const now = new Date().toISOString();
  const query: Record<string, unknown> = {};
  if (filtro === 'ativos') {
    Object.assign(query, condicaoAvisoPublico(now));
  } else if (filtro === 'inativos') {
    query.active = false;
  }
  const pg = pagination ?? { skip: 0, limit: 100, page: 1, pageSize: 100 };
  const [items, total] = await Promise.all([
    NoticeModel.find(query).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean<Notice[]>().exec(),
    NoticeModel.countDocuments(query),
  ]);
  return { items, total };
}

export async function getNoticeById(id: string): Promise<Notice | null> {
  assegurarIdValido(id);
  return NoticeModel.findById(id).lean<Notice | null>().exec();
}

export async function createNotice(dto: Partial<Notice>, clerkId?: string) {
  await assertAdmin(clerkId, 'gerenciar avisos');
  return NoticeModel.create(dto);
}

export async function updateNotice(id: string, dto: Partial<Notice>, clerkId?: string) {
  assegurarIdValido(id);
  await assertAdmin(clerkId, 'gerenciar avisos');
  return NoticeModel.findByIdAndUpdate(id, dto, { returnDocument: 'after', runValidators: true }).lean();
}

export async function deleteNotice(id: string, clerkId?: string) {
  assegurarIdValido(id);
  await assertAdmin(clerkId, 'gerenciar avisos');
  const doc = await NoticeModel.findByIdAndDelete(id).lean();
  if (!doc) throw Object.assign(new Error('aviso não encontrado'), { statusCode: 404 });
}
