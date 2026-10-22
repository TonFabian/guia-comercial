import { isValidObjectId } from 'mongoose';

import { CouponModel } from '../models/coupon.model.js';
import type { CreateCouponDto, UpdateCouponDto } from '../types/dto.js';
import type { Pagination } from '../utils/http.js';

/** Regras de dados para cupons. */

export async function listCoupons(pagination: Pagination) {
  const [items, total] = await Promise.all([
    CouponModel.find()
      .populate('company')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    CouponModel.countDocuments(),
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
