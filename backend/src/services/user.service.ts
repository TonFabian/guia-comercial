import { UserModel } from '../models/user.model.js';
import type { User } from '../../../shared/domain.js';

/** Acesso a dados do espelho local de usuários do Clerk. */

export function findUserByClerkId(clerkId: string): Promise<User | null> {
  return UserModel.findOne({ clerkId }).lean<User>().exec();
}

/**
 * Cria ou atualiza o espelho a partir do `clerkId`.
 * `$set` com o mirror parcial preserva campos que o evento não trouxe.
 */
export async function upsertUserFromMirror(
  clerkId: string,
  mirror: Partial<User>,
): Promise<User> {
  const user = await UserModel.findOneAndUpdate(
    { clerkId },
    { $set: mirror },
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
  ).lean<User>();

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
