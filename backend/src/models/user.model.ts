import { model, Schema } from 'mongoose';

import type { User } from '../../../shared/domain.js';

/**
 * Espelho local do usuário autenticado pelo Clerk.
 * `clerkId` e `email` são únicos; a fonte da verdade continua no Clerk.
 */
const userSchema = new Schema<User>(
  {
    clerkId: { type: String, required: true, unique: true, index: true, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    city: Schema.Types.Mixed,
    lastSid: String,
    lastSignInAt: String,
    pushToken: String,
    favorites: { type: [String], default: [] },
    ownedCompanyIds: { type: [String], default: [] },
    preferences: {
      notifications: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

export const UserModel = model<User>('User', userSchema);
