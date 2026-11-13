import { isValidObjectId } from 'mongoose';

import { CompanyAnalyticsModel } from '../models/company-analytics.model.js';
import { CompanyModel } from '../models/company.model.js';

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isObjectId(value: string): boolean {
  return isValidObjectId(value);
}

export async function incrementView(companyId: string): Promise<void> {
  if (!isValidObjectId(companyId)) return;
  const date = todayUtc();
  await CompanyAnalyticsModel.updateOne(
    { companyId, date },
    { $inc: { views: 1 } },
    { upsert: true },
  );
}

export async function incrementWhatsappClick(companyId: string): Promise<void> {
  if (!isValidObjectId(companyId)) return;
  const date = todayUtc();
  await CompanyAnalyticsModel.updateOne(
    { companyId, date },
    { $inc: { whatsappClicks: 1 } },
    { upsert: true },
  );
}

export async function incrementFavorite(companyId: string): Promise<void> {
  if (!isValidObjectId(companyId)) return;
  const date = todayUtc();
  await CompanyAnalyticsModel.updateOne(
    { companyId, date },
    { $inc: { favorites: 1 } },
    { upsert: true },
  );
}

/** Desfavoritar nunca deixa o contador negativo: só decrementa quando há
 * favorito contado no dia (o $inc roda com filtro `favorites > 0`). */
export async function decrementFavorite(companyId: string): Promise<void> {
  if (!isValidObjectId(companyId)) return;
  const date = todayUtc();
  await CompanyAnalyticsModel.updateOne(
    { companyId, date, favorites: { $gt: 0 } },
    { $inc: { favorites: -1 } },
  );
}

export interface AnalyticsSummary {
  companyId: string;
  from: string;
  to: string;
  views: number;
  whatsappClicks: number;
  favorites: number;
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Períodos inválidos viram 400 na borda, não filtro silencioso que nunca casa. */
export function validarPeriodo(from: string, to: string): void {
  if (!DATA_ISO.test(from) || !DATA_ISO.test(to)) {
    throw Object.assign(new Error('período inválido: use o formato YYYY-MM-DD'), { statusCode: 400 });
  }
}

export async function getSummary(
  companyId: string,
  from: string,
  to: string,
): Promise<AnalyticsSummary> {
  if (!isValidObjectId(companyId)) {
    throw Object.assign(new Error('id inválido'), { statusCode: 404 });
  }
  validarPeriodo(from, to);
  const docs = await CompanyAnalyticsModel.find({
    companyId,
    date: { $gte: from, $lte: to },
  }).lean();
  let views = 0;
  let whatsappClicks = 0;
  let favorites = 0;
  for (const d of docs) {
    views += d.views ?? 0;
    whatsappClicks += d.whatsappClicks ?? 0;
    favorites += d.favorites ?? 0;
  }
  return { companyId, from, to, views, whatsappClicks, favorites };
}

export async function companyExists(companyId: string): Promise<boolean> {
  if (!isValidObjectId(companyId)) return false;
  const doc = await CompanyModel.findById(companyId).select({ _id: 1 }).lean();
  return Boolean(doc);
}