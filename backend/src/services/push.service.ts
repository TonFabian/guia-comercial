import { Types, isValidObjectId } from 'mongoose';

import { PushTokenModel } from '../models/push-token.model.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendPushToTokens(tokens: string[], title: string, body: string): Promise<void> {
  if (tokens.length === 0) return;
  const mensagens = tokens.map((to) => ({ to, title, body }));
  try {
    const resposta = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mensagens),
    });
    if (!resposta.ok) {
      console.warn(`[push] API do Expo respondeu ${resposta.status} para ${tokens.length} mensagem(ns)`);
    }
  } catch (erro) {
    console.warn('[push] falha de rede ao enviar notificações:', erro instanceof Error ? erro.message : erro);
  }
}

export async function sendPushToUser(clerkId: string, title: string, body: string): Promise<void> {
  const docs = await PushTokenModel.find({ clerkId })
    .select({ token: 1 })
    .lean<{ token?: string }[]>()
    .exec();
  await sendPushToTokens(
    docs.map((d) => d.token).filter((t): t is string => typeof t === 'string'),
    title,
    body,
  );
}

export async function sendPushToCity(cityId: string, title: string, body: string): Promise<void> {
  if (!isValidObjectId(cityId)) return;
  const docs = await PushTokenModel.aggregate<{ token: string }>([
    { $match: { clerkId: { $exists: true, $ne: null } } },
    {
      $lookup: {
        from: 'users',
        localField: 'clerkId',
        foreignField: 'clerkId',
        as: 'usuario',
      },
    },
    { $unwind: '$usuario' },
    { $match: { 'usuario.city': new Types.ObjectId(cityId) } },
    { $project: { token: 1, _id: 0 } },
  ]).exec();
  await sendPushToTokens(docs.map((d) => d.token), title, body);
}
