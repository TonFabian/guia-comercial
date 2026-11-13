import { model, Schema } from 'mongoose';

import type { PushCampaign } from '../../../shared/domain.js';

/**
 * Campanha de push notification administrativa (Push Center).
 * `receipts` guarda os pares { id, token } para o cron de receipts; `stats`
 * acumula contadores com default 0.
 */
const pushCampaignSchema = new Schema<PushCampaign>(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    imageUrl: { type: String, trim: true },
    deepLink: { type: String, trim: true },
    segment: {
      kind: {
        type: String,
        enum: ['broadcast', 'user', 'users', 'city', 'plan', 'favorites'],
        required: true,
      },
      userIds: [String],
      cityId: { type: String },
      plan: { type: String, enum: ['basic', 'premium'] },
      companyId: { type: String },
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sending', 'sent', 'failed'],
      required: true,
      default: 'draft',
    },
    scheduledFor: Date,
    sendingStartedAt: Date,
    sentAt: Date,
    receipts: [Schema.Types.Mixed],
    stats: {
      targeted: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      deadTokens: { type: Number, default: 0 },
    },
    error: String,
    createdByClerkId: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

// Cron de campanhas agendadas: busca scheduledFor <= agora com status scheduled.
pushCampaignSchema.index({ scheduledFor: 1, status: 1 });
// Listagem do admin: filtrada por status, ordenada por createdAt desc.
pushCampaignSchema.index({ status: 1, createdAt: -1 });

export const PushCampaignModel = model<PushCampaign>('PushCampaign', pushCampaignSchema);