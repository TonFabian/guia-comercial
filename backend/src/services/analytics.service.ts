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

export interface AnalyticsSummary {
  companyId: string;
  from: string;
  to: string;
  views: number;
  whatsappClicks: number;
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
  for (const d of docs) {
    views += d.views ?? 0;
    whatsappClicks += d.whatsappClicks ?? 0;
  }
  return { companyId, from, to, views, whatsappClicks };
}

export async function companyExists(companyId: string): Promise<boolean> {
  if (!isValidObjectId(companyId)) return false;
  const doc = await CompanyModel.findById(companyId).select({ _id: 1 }).lean();
  return Boolean(doc);
}