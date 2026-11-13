import { model, Schema } from 'mongoose';

/**
 * Registro de aviso de ciclo de plano já enviado (dedup do claim-first).
 * O índice único garante: no máximo UM aviso por (empresa, tipo, período) —
 * o envio grava primeiro e chave duplicada (11000) = já notificado.
 * Guarda apenas IDs e datas — sem PII (spec §10).
 */
const planNotificationSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    kind: { type: String, enum: ['expiring-7d', 'expiring-1d', 'expired'], required: true },
    planExpiresAt: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

planNotificationSchema.index({ companyId: 1, kind: 1, planExpiresAt: 1 }, { unique: true });

export const PlanNotificationModel = model('PlanNotification', planNotificationSchema);
