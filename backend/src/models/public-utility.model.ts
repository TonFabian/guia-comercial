import { model, Schema } from 'mongoose';

import type { PublicUtility } from '../../../shared/domain.js';

/**
 * Serviço de utilidade pública exibido na Home (polícia, hospital, coleta).
 * `city` referencia 'City'; `category` é o grupo exibido no app.
 */
const publicUtilitySchema = new Schema<PublicUtility>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['emergency', 'health', 'civil', 'sanitation'],
      default: 'civil',
    },
    phone: { type: String, trim: true },
    details: [String],
    icon: { type: String, trim: true },
    city: { type: Schema.Types.ObjectId, ref: 'City' },
    order: Number,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const PublicUtilityModel = model<PublicUtility>(
  'PublicUtility',
  publicUtilitySchema,
);
