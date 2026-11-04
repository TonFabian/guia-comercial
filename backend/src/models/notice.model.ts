import { model, Schema } from 'mongoose';

import type { Notice } from '../../../shared/domain.js';

const noticeSchema = new Schema<Notice>(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    type: { type: String, enum: ['general', 'alert', 'health'], default: 'general' },
    startsAt: String,
    expiresAt: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const NoticeModel = model<Notice>('Notice', noticeSchema);