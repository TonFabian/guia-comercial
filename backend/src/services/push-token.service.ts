import { PushTokenModel } from '../models/push-token.model.js';

/** Documento do registro de token push (modelo não possui interface própria). */
interface PushTokenDocumento {
  token: string;
  clerkId?: string;
}

export async function upsertPushToken(token: string, clerkId?: string): Promise<void> {
  // `token` chega validado (string simples pelo zod): o filtro nunca recebe
  // operador do cliente — injeção tipo {"token":{"$ne":null}} morre na borda.
  const existente = await PushTokenModel.findOne({ token })
    .lean<PushTokenDocumento | null>()
    .exec();

  // Anti-sequestro: token já vinculado a outra conta não é rebindado — quem
  // conhece o token alheio não passa a receber as notificações do dono.
  if (existente?.clerkId && existente.clerkId !== clerkId) {
    throw Object.assign(new Error('token já registrado para outra conta'), { statusCode: 409 });
  }

  if (existente) {
    // Mesmo dono (vínculo idempotente) ou token de convidado ganando sessão:
    // atualiza sem `$set` de clerkId quando a sessão é de convidado.
    await PushTokenModel.updateOne(
      { token },
      { $set: { token, ...(clerkId ? { clerkId } : {}) } },
    ).exec();
    return;
  }

  // Novo registro: usa o clerkId da sessão (ou sem, quando convidado).
  await PushTokenModel.findOneAndUpdate(
    { token },
    { $set: { token, ...(clerkId ? { clerkId } : {}) } },
    { upsert: true, returnDocument: 'after' },
  ).exec();
}

export async function listAllPushTokens(): Promise<string[]> {
  const docs = await PushTokenModel.find({ token: { $exists: true, $ne: null } })
    .select({ token: 1 })
    .lean()
    .exec();
  return docs.map((d) => d.token).filter((t): t is string => typeof t === 'string');
}
