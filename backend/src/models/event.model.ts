import { model, Schema } from 'mongoose';

import type { TourEvent, TourEventCategory } from '../../../shared/domain.js';

const CATEGORIAS: TourEventCategory[] = [
  'festival',
  'show',
  'fair',
  'exhibition',
  'sport',
  'religious',
  'cultural',
  'workshop',
  'other',
];

/**
 * Evento turístico (temporário: festival, feira, show...).
 * `startDate`/`endDate` são strings `YYYY-MM-DD` (data pura, sem fuso) e a
 * lista de vigentes compara endDate com strings — nunca com datetime ISO.
 * `city` referencia 'City'; `organizerCompany` referencia 'Company'.
 * O nome do model nunca é `Event` (shadowing do DOM); a coleção é `events`.
 */
const tourEventSchema = new Schema<TourEvent>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIAS, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    startTime: { type: String },
    endTime: { type: String },
    location: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: Schema.Types.ObjectId, ref: 'City' },
    latitude: Number,
    longitude: Number,
    organizer: { type: String, trim: true },
    organizerCompany: { type: Schema.Types.ObjectId, ref: 'Company' },
    ticket: { type: String, enum: ['free', 'paid'] },
    // Texto livre ("R$ 25,00"): o valor pode incluir contexto ("R$ 15,00 meia").
    ticketPrice: { type: String, trim: true },
    ticketUrl: { type: String },
    photos: [String],
    phone: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    website: String,
    instagram: String,
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Índice da listagem do módulo de turismo: a agenda filtra por eventos ativos
// e vigentes (endDate >= hoje, comparado como string YYYY-MM-DD).
tourEventSchema.index({ active: 1, endDate: 1 });

export const TourEventModel = model<TourEvent>('TourEvent', tourEventSchema, 'events');
