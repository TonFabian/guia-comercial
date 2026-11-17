import { model, Schema } from 'mongoose';

import type { AppNotification } from '../../../shared/domain.js';

const notificationSchema = new Schema<AppNotification>(
  {
    clerkId: { type: String, required: true, trim: true },
    type: { type: String, enum: ['coupon', 'event'], required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    deepLink: { type: String, required: true, trim: true },
    imageUrl: { type: String, trim: true },
    refId: { type: String, required: true, trim: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ clerkId: 1, createdAt: -1 });
notificationSchema.index({ clerkId: 1, refId: 1 }, { unique: true });

export const NotificationModel = model<AppNotification>('Notification', notificationSchema);
