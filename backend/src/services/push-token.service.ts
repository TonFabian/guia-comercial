import { PushTokenModel } from '../models/push-token.model.js';

/** Documento do registro de token push (modelo não possui interface própria). */
interface PushTokenDocumento {
  token: string;
  clerkId?: string;
}

/** Mensagem de domínio do anti-sequestro (anti-hijack). */
const DONO_ALHEIO = 'token já registrado para outra conta';

function erroDonoAlheio(): Error & { statusCode: number } {
  return Object.assign(new Error(DONO_ALHEIO), { statusCode: 409 });
}

export async function upsertPushToken(token: string, clerkId?: string): Promise<void> {
  // `token` chega validado (string simples pelo zod): o filtro nunca recebe
  // operador do cliente — injeção tipo {"token":{"$ne":null}} morre na borda.
  //
  // Anti-sequestro: token já vinculado a outra conta não é rebindado — quem
  // conhece o token alheio não passa a receber as notificações do dono.
  // A condição de posse vai NO FILTRO da própria escrita (CAS atômico): não
  // há intervalo check-then-act em que o token troque de dono entre a leitura
  // e a escrita (a corrida de dois upserts concorrentes no mesmo token novo).
  const condicaoDePosse = clerkId
    ? { $or: [{ clerkId }, { clerkId: { $exists: false } }, { clerkId: null }] }
    : { $or: [{ clerkId: { $exists: false } }, { clerkId: null }] };

  let registrado: unknown;
  try {
    registrado = await PushTokenModel.findOneAndUpdate(
      { token, ...condicaoDePosse },
      { $set: { token, ...(clerkId ? { clerkId } : {}) } },
      { upsert: true, returnDocument: 'after' },
    ).lean<PushTokenDocumento | null>().exec();
  } catch (erro) {
    // Upsert contra token já vinculado a outro dono: o filtro não casa e o
    // Mongo tenta inserir — colide com o índice único (11000). Traduzimos
    // explicitamente para o 409 de domínio, sem depender do mapeamento global.
    if ((erro as { code?: number }).code === 11000) throw erroDonoAlheio();
    throw erro;
  }

  // O token existe mas pertence a outra conta (nenhum documento casou a
  // condição de posse): filho do mesmo anti-sequestro, mesmo 409.
  if (!registrado) throw erroDonoAlheio();
}

export async function listAllPushTokens(): Promise<string[]> {
  const docs = await PushTokenModel.find({ token: { $exists: true, $ne: null } })
    .select({ token: 1 })
    .lean()
    .exec();
  return docs.map((d) => d.token).filter((t): t is string => typeof t === 'string');
}
