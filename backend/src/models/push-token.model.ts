import { model, Schema } from 'mongoose';

const pushTokenSchema = new Schema(
  {
    token: { type: String, required: true, unique: true, trim: true },
    clerkId: { type: String, trim: true },
  },
  { timestamps: true },
);

export const PushTokenModel = model('PushToken', pushTokenSchema);