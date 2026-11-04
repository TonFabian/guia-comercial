import { model, Schema } from 'mongoose';

import type { City } from '../../../shared/domain.js';

const citySchema = new Schema<City>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    state: { type: String, required: true, trim: true, uppercase: true },
  },
  { timestamps: true },
);

export const CityModel = model<City>('City', citySchema);