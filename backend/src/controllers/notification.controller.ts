import type { RequestHandler } from 'express';
import { Types } from 'mongoose';

import { countUnreadNotifications, listNotifications, markNotificationsRead } from '../services/notification.service.js';
import { parsePagination } from '../utils/http.js';
import type { MarkReadDto } from '../types/dto.js';

export interface ListNotificationsDeps {
  list: typeof listNotifications;
  countUnread?: typeof countUnreadNotifications;
}
export interface MarkReadDeps { mark: typeof markNotificationsRead; }
export interface UnreadCountDeps { count: typeof countUnreadNotifications; }

export function makeListController(
  deps: ListNotificationsDeps = { list: listNotifications, countUnread: countUnreadNotifications },
): RequestHandler {
  return async (req, res): Promise<void> => {
    const clerkId = req.auth?.clerkId;
    if (!clerkId) { res.status(401).json({ error: 'Não autenticado' }); return; }
    const pagination = parsePagination(req.query.page, req.query.pageSize, 20, 50);
    const { items, total } = await deps.list(clerkId, pagination);
    const unreadCount = deps.countUnread ? await deps.countUnread(clerkId) : 0;
    res.json({ items, total, page: pagination.page, pageSize: pagination.pageSize, unreadCount });
  };
}

export function makeMarkReadController(deps: MarkReadDeps = { mark: markNotificationsRead }): RequestHandler {
  return async (req, res): Promise<void> => {
    const clerkId = req.auth?.clerkId;
    if (!clerkId) { res.status(401).json({ error: 'Não autenticado' }); return; }
    const { ids } = (req.body ?? {}) as MarkReadDto;
    if (ids && ids.length > 0) {
      const invalid = ids.some((id) => !Types.ObjectId.isValid(id));
      if (invalid) { res.status(400).json({ error: 'id de notificação inválido' }); return; }
    }
    const unreadCount = await deps.mark(clerkId, ids);
    res.json({ unreadCount });
  };
}

export function makeUnreadCountController(deps: UnreadCountDeps = { count: countUnreadNotifications }): RequestHandler {
  return async (req, res): Promise<void> => {
    const clerkId = req.auth?.clerkId;
    if (!clerkId) { res.status(401).json({ error: 'Não autenticado' }); return; }
    const unreadCount = await deps.count(clerkId);
    res.json({ unreadCount });
  };
}

export const list: RequestHandler = makeListController();
export const markRead: RequestHandler = makeMarkReadController();
export const unreadCount: RequestHandler = makeUnreadCountController();
