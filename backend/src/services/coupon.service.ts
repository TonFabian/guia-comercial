import { isValidObjectId, Types } from 'mongoose';

import { CouponModel } from '../models/coupon.model.js';
import type { CreateCouponDto, UpdateCouponDto } from '../types/dto.js';
import type { Pagination } from '../utils/http.js';

/** Filtros aceitos na listagem de cupons. */
export interface CouponListFilters {
  /** id da empresa dona dos cupons */
  company?: unknown;
}

/**
 * Monta a query de cupons a partir dos filtros da URL.
 * Id de empresa inválido vira um ObjectId aleatório: a lista volta vazia em
 * vez de erro, seguindo o mesmo padrão do filtro de categoria por slug.
 */
export function buildCouponQuery(filters: CouponListFilters): { company?: string } {
  const company = filters.company;
  if (typeof company !== 'string' || company.length === 0) return {};
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

export async function createCoupon(dto: CreateCouponDto) {
  // expiresAt já chega validado (ISO); o driver Mongo aceita string ISO.
  return CouponModel.create(dto);
}

export async function updateCoupon(id: string, dto: UpdateCouponDto) {
  return CouponModel.findByIdAndUpdate(id, dto, { new: true, runValidators: true })
    .populate('company')
    .lean();
}

export async function deleteCoupon(id: string) {
  const doc = await CouponModel.findByIdAndDelete(id).lean();
  if (!doc) {
    throw Object.assign(new Error('cupom não encontrado'), { statusCode: 404 });
  }
}

export function isObjectId(value: string): boolean {
  return isValidObjectId(value);
}
