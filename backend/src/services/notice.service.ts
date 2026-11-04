import { NoticeModel } from '../models/notice.model.js';
import type { Notice } from '../../../shared/domain.js';

export async function listNotices(activeOnly = false): Promise<Notice[]> {
  const now = new Date().toISOString();
  const query: Record<string, unknown> = {};
  if (activeOnly) {
    query.active = true;
    query.$and = [
      { $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gte: now } }] },
      { $or: [{ startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
    ];
  }
  return NoticeModel.find(query).sort({ createdAt: -1 }).lean<Notice[]>().exec();
}

export async function getNoticeById(id: string) {
  return NoticeModel.findById(id).lean();
}

export async function createNotice(dto: Partial<Notice>) {
  return NoticeModel.create(dto);
}

export async function updateNotice(id: string, dto: Partial<Notice>) {
  return NoticeModel.findByIdAndUpdate(id, dto, { returnDocument: 'after', runValidators: true }).lean();
}

export async function deleteNotice(id: string) {
  const doc = await NoticeModel.findByIdAndDelete(id).lean();
  if (!doc) throw Object.assign(new Error('aviso não encontrado'), { statusCode: 404 });
}