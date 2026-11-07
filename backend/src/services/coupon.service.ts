import { isValidObjectId, Types } from 'mongoose';

import { CompanyModel } from '../models/company.model.js';
import { CouponModel } from '../models/coupon.model.js';
import type { CreateCouponDto, UpdateCouponDto } from '../types/dto.js';
import type { Pagination } from '../utils/http.js';
import { lerTexto } from '../utils/query.js';
import { assertOwnerOrAdmin } from './authorization.service.js';

/** Filtros aceitos na listagem de cupons. */
export interface CouponListFilters {
  /** id da empresa dona dos cupons */
  company?: unknown;
}

/**
 * Monta a query de cupons a partir dos filtros da URL. O parâmetro cru é
 * sanitizado (array/objeto → 400) e id não ObjectId vira um ObjectId
 * aleatório: a lista volta vazia em vez de erro, seguindo o mesmo padrão do
 * filtro de categoria por slug.
 */
export function buildCouponQuery(filters: CouponListFilters): { company?: string } {
  const company = lerTexto(filters.company, { nome: 'company' });
  if (company === undefined) return {};
  if (!isValidObjectId(company)) return { company: new Types.ObjectId().toString() };
  return { company };
}

/** Regras de dados para cupons. */

export async function listCoupons(filters: CouponListFilters, pagination: Pagination) {
  const query = buildCouponQuery(filters);
  const [items, total] = await Promise.all([
    CouponModel.find(query)
      .populate('company')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    CouponModel.countDocuments(query),
  ]);
  return { items, total };
}

export async function getCouponById(id: string) {
  return CouponModel.findById(id).populate('company').lean();
}

export async function createCoupon(dto: CreateCouponDto, clerkId?: string) {
  const company = await CompanyModel.findById(dto.company).lean();
  if (!company) {
    throw Object.assign(new Error('empresa não encontrada'), { statusCode: 404 });
  }
  await assertOwnerOrAdmin({
    resourceId: String(company._id),
    clerkId,
    findResource: async () => ({ exists: true, ownerClerkId: company.ownerClerkId }),
    notFoundMessage: 'empresa não encontrada',
    forbiddenMessage: 'sem permissão para gerenciar cupons desta empresa',
  });
  // expiresAt já chega validado (ISO); o driver Mongo aceita string ISO.
  return CouponModel.create(dto);
}

export async function updateCoupon(id: string, dto: UpdateCouponDto, clerkId?: string) {
  const coupon = await CouponModel.findById(id).lean();
  if (!coupon) {
    throw Object.assign(new Error('cupom não encontrado'), { statusCode: 404 });
  }
  const company = await CompanyModel.findById(coupon.company).lean();
  if (!company) {
    throw Object.assign(new Error('empresa não encontrada'), { statusCode: 404 });
  }
  await assertOwnerOrAdmin({
    resourceId: String(coupon.company),
    clerkId,
    findResource: async () => ({ exists: !!company, ownerClerkId: company?.ownerClerkId }),
    notFoundMessage: 'empresa não encontrada',
    forbiddenMessage: 'sem permissão para editar este cupom',
  });
  const { company: _ignore, ...rest } = dto as UpdateCouponDto & { company?: unknown };
  return CouponModel.findByIdAndUpdate(id, rest, { returnDocument: 'after', runValidators: true })
    .populate('company')
    .lean();
}

export async function deleteCoupon(id: string, clerkId?: string) {
  const coupon = await CouponModel.findById(id).lean();
  if (!coupon) {
    throw Object.assign(new Error('cupom não encontrado'), { statusCode: 404 });
  }
  const company = await CompanyModel.findById(coupon.company).lean();
  if (!company) {
    throw Object.assign(new Error('empresa não encontrada'), { statusCode: 404 });
  }
  await assertOwnerOrAdmin({
    resourceId: String(coupon.company),
    clerkId,
    findResource: async () => ({ exists: !!company, ownerClerkId: company?.ownerClerkId }),
    notFoundMessage: 'empresa não encontrada',
    forbiddenMessage: 'sem permissão para excluir este cupom',
  });
  const doc = await CouponModel.findByIdAndDelete(id).lean();
  if (!doc) {
    throw Object.assign(new Error('cupom não encontrado'), { statusCode: 404 });
  }
}

export function isObjectId(value: string): boolean {
  return isValidObjectId(value);
}