import { PushTokenModel } from '../models/push-token.model.js';

export async function upsertPushToken(token: string, clerkId?: string): Promise<void> {
  await PushTokenModel.findOneAndUpdate(
    { token },
    { $set: { token, clerkId } },
    { upsert: true, returnDocument: "after" },
  ).exec();
}

export async function listAllPushTokens(): Promise<string[]> {
  const docs = await PushTokenModel.find({ token: { $exists: true, $ne: null } })
    .select({ token: 1 })
    .lean()
    .exec();
  return docs.map((d) => d.token).filter((t): t is string => typeof t === 'string');
}