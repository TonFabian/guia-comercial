import { model, Schema } from 'mongoose';

import type { Category } from '../../../shared/domain.js';

/**
 * Categoria do guia comercial.
 * `slug` é único (índice gerado pelo próprio Mongoose via `unique: true`).
 */
const categorySchema = new Schema<Category>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    icon: String,
    order: Number,
  },
  { timestamps: true },
);

export const CategoryModel = model<Category>('Category', categorySchema);
