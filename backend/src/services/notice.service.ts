import { NoticeModel } from '../models/notice.model.js';
import type { Notice } from '../../../shared/domain.js';
import type { Pagination } from '../utils/http.js';
import { assertAdmin } from './user.service.js';

export async function listNotices(
  activeOnly = false,
  pagination?: Pagination,
): Promise<{ items: Notice[]; total: number }> {
  const now = new Date().toISOString();
  const query: Record<string, unknown> = {};
  if (activeOnly) {
    query.active = true;
    query.$and = [
      { $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gte: now } }] },
      { $or: [{ startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
    ];
  }
  const pg = pagination ?? { skip: 0, limit: 100, page: 1, pageSize: 100 };
  const [items, total] = await Promise.all([
    NoticeModel.find(query).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean<Notice[]>().exec(),
    NoticeModel.countDocuments(query),
  ]);
  return { items, total };
}

export async function getNoticeById(id: string) {
  return NoticeModel.findById(id).lean();
}

export async function createNotice(dto: Partial<Notice>, clerkId?: string) {
  await assertAdmin(clerkId, 'gerenciar avisos');
  return NoticeModel.create(dto);
}

export async function updateNotice(id: string, dto: Partial<Notice>, clerkId?: string) {
  await assertAdmin(clerkId, 'gerenciar avisos');
  return NoticeModel.findByIdAndUpdate(id, dto, { returnDocument: 'after', runValidators: true }).lean();
}

export async function deleteNotice(id: string, clerkId?: string) {
  await assertAdmin(clerkId, 'gerenciar avisos');
  const doc = await NoticeModel.findByIdAndDelete(id).lean();
  if (!doc) throw Object.assign(new Error('aviso não encontrado'), { statusCode: 404 });
}
