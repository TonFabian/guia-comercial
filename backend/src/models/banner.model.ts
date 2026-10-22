import { model, Schema } from 'mongoose';

import type { Banner } from '../../../shared/domain.js';

/**
 * Banner do carrossel inicial.
 * O domínio só declara `createdAt` — `updatedAt` fica desativado.
 */
const bannerSchema = new Schema<Banner>(
  {
    title: { type: String, required: true, trim: true },
    subtitle: String,
    image: String,
    link: String,
    order: Number,
    active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const BannerModel = model<Banner>('Banner', bannerSchema);
