import { model, Schema } from 'mongoose';

import type { Company } from '../../../shared/domain.js';

/**
 * Empresa/anunciante do guia.
 * `category` referencia 'Category'; `slug` é único.
 */
const companySchema = new Schema<Company>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    phone: String,
    whatsapp: String,
    address: String,
    city: String,
    logo: String,
    cover: String,
    isFeatured: { type: Boolean, default: false },
    rating: { type: Number, min: 0, max: 5 },
    ratingCount: { type: Number, min: 0 },
    isVerified: { type: Boolean, default: false },
    website: String,
    instagram: String,
    facebook: String,
    openingHours: [String],
    services: [String],
    products: [
      {
        name: { type: String, required: true, trim: true },
        description: String,
        price: { type: Number, min: 0 },
        image: String,
      },
    ],
  },
  { timestamps: true },
);

export const CompanyModel = model<Company>('Company', companySchema);
