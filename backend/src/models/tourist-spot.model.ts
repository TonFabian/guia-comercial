import { model, Schema } from 'mongoose';

import type { TouristSpot, TouristSpotCategory } from '../../../shared/domain.js';

const CATEGORIAS: TouristSpotCategory[] = [
  'nature',
  'park',
  'waterfall',
  'viewpoint',
  'museum',
  'church',
  'monument',
  'square',
  'adventure',
  'other',
];

/**
 * Ponto turístico (atrativo permanente: praça, cachoeira, museu...).
 * `city` referencia 'City'; `relatedCompany` referencia 'Company' (empresa
 * vinculada, ex.: parque gerenciado pelo município).
 */
const touristSpotSchema = new Schema<TouristSpot>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIAS, required: true },
    photos: [String],
    address: { type: String, trim: true },
    city: { type: Schema.Types.ObjectId, ref: 'City' },
    latitude: Number,
    longitude: Number,
    openingHours: [String],
    entryFee: { type: String, enum: ['free', 'paid', 'donation'] },
    // Texto livre ("R$ 10,00"): o valor pode incluir contexto ("R$ 5,00 por pessoa").
    entryPrice: { type: String, trim: true },
    phone: String,
    whatsapp: String,
    website: String,
    instagram: String,
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    order: Number,
    relatedCompany: { type: Schema.Types.ObjectId, ref: 'Company' },
  },
  { timestamps: true },
);

// Índice composto para a listagem/telas do módulo de turismo, que filtram por
// status ativo, cidade e categoria ao mesmo tempo.
touristSpotSchema.index({ active: 1, city: 1, category: 1 });

export const TouristSpotModel = model<TouristSpot>('TouristSpot', touristSpotSchema);
