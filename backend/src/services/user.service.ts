import { CityModel } from '../models/city.model.js';
import { UserModel } from '../models/user.model.js';
import type { User } from '../../../shared/domain.js';

/** Acesso a dados do espelho local de usuários do Clerk. */

export function findUserByClerkId(clerkId: string): Promise<User | null> {
  return UserModel.findOne({ clerkId }).populate('city').lean<User>().exec();
}

/**
 * Cria ou atualiza o espelho a partir do `clerkId`.
 * `$set` com o mirror parcial preserva campos que o evento não trouxe.
 */
export async function upsertUserFromMirror(
  clerkId: string,
  mirror: Partial<User>,
): Promise<User> {
  const update: Partial<User> = { ...mirror };

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (mirror.email && adminEmails.includes(mirror.email.toLowerCase())) {
    update.role = 'admin';
  }

  // Default cidade = Castelo do Piauí (primeira cidade do MVP).
  if (!update.city) {
    const city = await CityModel.findOne({ slug: 'castelo-do-piaui' }).lean();
    if (city) (update as Record<string, unknown>).city = city._id;
  }

  const user = await UserModel.findOneAndUpdate(
    { clerkId },
    { $set: update },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean<User>();

  if (!user) {
    throw Object.assign(new Error('usuário não pôde ser gravado'), { statusCode: 500 });
  }

  return user;
}

/** Registra a sessão atual; só escreve quando a `sid` muda. */
export async function touchSession(clerkId: string, sid: string): Promise<void> {
  await UserModel.updateOne(
    { clerkId, lastSid: { $ne: sid } },
    { $set: { lastSid: sid, lastSignInAt: new Date().toISOString() } },
  ).exec();
}

export async function updateUserByClerkId(
  clerkId: string,
  mirror: Partial<User>,
): Promise<User | null> {
  const user = await UserModel.findOneAndUpdate(
    { clerkId },
    { $set: mirror },
    { returnDocument: "after" },
  )
    .populate('city')
    .lean<User>();

  return user;
}

export async function updatePushToken(clerkId: string, pushToken: string): Promise<void> {
  await UserModel.updateOne({ clerkId }, { $set: { pushToken } }).exec();
}

export async function removeUserByClerkId(clerkId: string): Promise<void> {
  await UserModel.deleteOne({ clerkId }).exec();
}

export async function listPushTokens(): Promise<string[]> {
  const users = await UserModel.find({ pushToken: { $exists: true, $ne: null } })
    .select({ pushToken: 1 })
    .lean()
    .exec();
  return users.map((u) => u.pushToken).filter((t): t is string => typeof t === 'string');
}
