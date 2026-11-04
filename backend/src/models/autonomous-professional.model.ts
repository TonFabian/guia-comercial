import { model, Schema } from 'mongoose';

import type { AutonomousProfessional } from '../../../shared/domain.js';

const schema = new Schema<AutonomousProfessional>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    specialty: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    phone: String,
    whatsapp: String,
    photo: String,
    city: { type: Schema.Types.ObjectId, ref: 'City' },
    rating: { type: Number, min: 0, max: 5 },
    ratingCount: { type: Number, min: 0 },
    ownerClerkId: { type: String, trim: true, index: true },
  },
  { timestamps: true },
);

export const AutonomousProfessionalModel = model<AutonomousProfessional>(
  'AutonomousProfessional',
  schema,
);