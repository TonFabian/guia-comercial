import { model, Schema } from 'mongoose';

import type { Coupon } from '../../../shared/domain.js';

/**
 * Cupom de desconto vinculado a uma empresa.
 * O domínio só declara `createdAt`.
 */
const couponSchema = new Schema<Coupon>(
  {
    title: { type: String, required: true, trim: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    discount: String,
    description: String,
    expiresAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const CouponModel = model<Coupon>('Coupon', couponSchema);
