import { model, Schema } from 'mongoose';

/**
 * Contadores agregados de engajamento por empresa e por dia.
 * Sem PII: apenas totais. Isolamento por companyId (nunca por body).
 */
const companyAnalyticsSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    views: { type: Number, default: 0, min: 0 },
    whatsappClicks: { type: Number, default: 0, min: 0 },
    favorites: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

companyAnalyticsSchema.index({ companyId: 1, date: 1 }, { unique: true });

export const CompanyAnalyticsModel = model('CompanyAnalytics', companyAnalyticsSchema);