import { Types } from 'mongoose';

import { NotificationModel } from '../models/notification.model.js';
import { UserModel } from '../models/user.model.js';
import type { Pagination } from '../utils/http.js';

export interface FanOutCouponParams {
  companyId: string;
  couponId: string;
  title: string;
  body: string;
  deepLink: string;
  expiresAt?: Date | string | null;
  imageUrl?: string;
}

export interface FanOutEventParams {
  eventId: string;
  title: string;
  body: string;
  deepLink: string;
  cityId?: string | null;
  imageUrl?: string;
}

interface UsuarioFan {
  clerkId?: unknown;
}

async function buscarUsuarios(filtro: Record<string, unknown>): Promise<UsuarioFan[]> {
  const consulta = UserModel.find(filtro) as unknown as {
    select?: (projecao: Record<string, number>) => unknown;
    lean?: () => Promise<UsuarioFan[]>;
  };
  const comSelect = typeof consulta.select === 'function'
    ? (consulta.select({ clerkId: 1 }) as { lean?: () => Promise<UsuarioFan[]> })
    : consulta;
  if (typeof comSelect.lean === 'function') {
    return (await comSelect.lean()) ?? [];
  }
  return (await (comSelect as unknown as Promise<UsuarioFan[]>)) ?? [];
}

function ehErroDeDuplicata(err: unknown): boolean {
  const writeErrors = (err as { writeErrors?: Array<{ code?: number }> | undefined }).writeErrors;
  if (Array.isArray(writeErrors) && writeErrors.length > 0) {
    return writeErrors.every((we) => we?.code === 11000);
  }
  return (err as { code?: number }).code === 11000;
}

function primeiroErroNaoDuplicado(err: unknown): unknown {
  const writeErrors = (err as { writeErrors?: Array<{ code?: number }> | undefined }).writeErrors;
  if (Array.isArray(writeErrors)) {
    const naoDup = writeErrors.find((we) => we?.code !== 11000);
    if (naoDup) return naoDup;
  }
  return err;
}

function mensagemDeErro(err: unknown): unknown {
  if (err instanceof Error) return err.message;
  const obj = err as { message?: string; errmsg?: string } | null;
  if (obj && typeof obj === 'object') {
    return obj.message ?? obj.errmsg ?? err;
  }
  return err;
}

export async function notifyCouponFans(params: FanOutCouponParams): Promise<void> {
  if (params.expiresAt) {
    const when = params.expiresAt instanceof Date ? params.expiresAt : new Date(params.expiresAt);
    if (!Number.isFinite(when.getTime()) || when.getTime() < Date.now()) return;
  }
  try {
    const fans = await buscarUsuarios({ favorites: params.companyId });
    if (fans.length === 0) return;
    const docs = fans
      .filter((f) => typeof f.clerkId === 'string' && (f.clerkId as string).length > 0)
      .map((f) => ({
        clerkId: f.clerkId as string,
        type: 'coupon' as const,
        title: params.title,
        body: params.body,
        deepLink: params.deepLink,
        imageUrl: params.imageUrl,
        refId: params.couponId,
      }));
    if (docs.length === 0) return;
    await NotificationModel.insertMany(docs, { ordered: false });
  } catch (err) {
    if (ehErroDeDuplicata(err)) return;
    const primeiro = primeiroErroNaoDuplicado(err);
    console.warn('[notifications] fan-out cupom falhou:', mensagemDeErro(primeiro));
  }
}

export async function notifyEventCity(params: FanOutEventParams): Promise<void> {
  if (!params.cityId) return;
  try {
    const users = await buscarUsuarios({ city: params.cityId });
    if (users.length === 0) return;
    const docs = users
      .filter((u) => typeof u.clerkId === 'string' && (u.clerkId as string).length > 0)
      .map((u) => ({
        clerkId: u.clerkId as string,
        type: 'event' as const,
        title: params.title,
        body: params.body,
        deepLink: params.deepLink,
        imageUrl: params.imageUrl,
        refId: params.eventId,
      }));
    if (docs.length === 0) return;
    await NotificationModel.insertMany(docs, { ordered: false });
  } catch (err) {
    if (ehErroDeDuplicata(err)) return;
    const primeiro = primeiroErroNaoDuplicado(err);
    console.warn('[notifications] fan-out evento falhou:', mensagemDeErro(primeiro));
  }
}

export async function listNotifications(clerkId: string, pagination: Pagination) {
  const [items, total] = await Promise.all([
    NotificationModel.find({ clerkId })
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    NotificationModel.countDocuments({ clerkId }),
  ]);
  return { items, total };
}

export async function markNotificationsRead(clerkId: string, ids?: string[]): Promise<number> {
  const filter: Record<string, unknown> = { clerkId, readAt: null };
  if (ids && ids.length > 0) {
    const objectIds = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    if (objectIds.length === 0) return countUnreadNotifications(clerkId);
    filter._id = { $in: objectIds };
  }
  await NotificationModel.updateMany(filter, { $set: { readAt: new Date() } });
  return countUnreadNotifications(clerkId);
}

/** Reabre notificações (readAt volta a null), todas ou ids específicos. */
export async function markNotificationsUnread(clerkId: string, ids?: string[]): Promise<number> {
  const filter: Record<string, unknown> = { clerkId, readAt: { $ne: null } };
  if (ids && ids.length > 0) {
    const objectIds = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    if (objectIds.length === 0) return countUnreadNotifications(clerkId);
    filter._id = { $in: objectIds };
  }
  await NotificationModel.updateMany(filter, { $set: { readAt: null } });
  return countUnreadNotifications(clerkId);
}

export async function countUnreadNotifications(clerkId: string): Promise<number> {
  return NotificationModel.countDocuments({ clerkId, readAt: null });
}