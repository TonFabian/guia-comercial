import { CityModel } from '../models/city.model.js';
import { CompanyModel } from '../models/company.model.js';
import { AutonomousProfessionalModel } from '../models/autonomous-professional.model.js';
import { PushTokenModel } from '../models/push-token.model.js';
import { ReviewModel } from '../models/review.model.js';
import { UserModel } from '../models/user.model.js';
import type { City, User } from '../../../shared/domain.js';
import type { Pagination } from '../utils/http.js';

/** Acesso a dados do espelho local de usuários do Clerk. */

export function findUserByClerkId(clerkId: string): Promise<User | null> {
  return UserModel.findOne({ clerkId }).populate('city').lean<User>().exec();
}

/**
 * true quando o clerk tem a role admin.
 *
 * Modo legado (sem CLERK_SECRET_KEY): SEMPRE true — não há sessão com a qual
 * checar e toda consulta devolve "sim". Neste modo nenhum controle de acesso
 * é aplicado; garante o funcionamento local sem Clerk, mas nenhum ambiente
 * exposto publicamente deve rodar assim. Nunca lança: quem precisa bloquear
 * (401/403) usa `assertAdmin`; quem só precisa de uma decisão (ex.: exibir
 * rascunho por id) usa este helper.
 */
export async function ehAdmin(clerkId?: string): Promise<boolean> {
  if (!process.env.CLERK_SECRET_KEY) {
    return true;
  }
  if (!clerkId) {
    return false;
  }
  const user = await findUserByClerkId(clerkId);
  return user?.role === 'admin';
}

/**
 * Garante que a sessão é de um administrador.
 *
 * 401 sem identidade; 403 quando o espelho existe mas não é admin.
 *
 * Modo legado (sem CLERK_SECRET_KEY): TODA verificação de admin é liberada
 * (`ehAdmin` devolve true mesmo sem sessão) — no modo legado não há
 * verificação de identidade nem de role, as "mutações administrativas" são
 * tratadas como legítimas. É o modo de desenvolvimento; nenhum ambiente
 * exposto publicamente deve rodar sem a CLERK_SECRET_KEY.
 */
export async function assertAdmin(
  clerkId: string | undefined,
  recurso: string,
): Promise<void> {
  const admin = await ehAdmin(clerkId);
  if (admin) {
    return;
  }

  // Em modo autenticado a ausência de clerkId só acontece sem sessão; no
  // modo legado `ehAdmin` é true e o fluxo já retornou acima.
  if (!clerkId) {
    throw Object.assign(new Error('Não autenticado'), { statusCode: 401 });
  }

  throw Object.assign(new Error(`sem permissão para ${recurso}`), { statusCode: 403 });
}

/** Item da listagem de usuários do painel admin (sem dados sensíveis). */
export interface AdminUserListItem {
  _id: string;
  name?: string;
  email: string;
  role: 'user' | 'admin';
  city?: string | City;
  createdAt?: string;
  /** true quando o item é a conta do admin que fez a requisição. */
  isSelf?: boolean;
}

/**
 * Lista os usuários do espelho local para o painel admin.
 *
 * `pushToken` e os identificadores de sessão não entram na resposta: o painel
 * precisa de nome, e-mail, role e cidade, não de credencial de push.
 */
export async function listUsers(
  pagination: Pagination,
  actorClerkId?: string,
): Promise<{ items: AdminUserListItem[]; total: number }> {
  const [usuarios, total] = await Promise.all([
    UserModel.find({})
      .select({ pushToken: 0, lastSid: 0, lastSignInAt: 0 })
      .populate('city')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean<User[]>(),
    UserModel.countDocuments({}),
  ]);

  return { items: usuarios.map((u) => toAdminUserListItem(u, actorClerkId)), total };
}

/** Normaliza o documento lean no item público da listagem admin. */
function toAdminUserListItem(user: User, actorClerkId?: string): AdminUserListItem {
  const nome = [user.firstName, user.lastName].filter(Boolean).join(' ');

  return {
    _id: String(user._id),
    ...(nome ? { name: nome } : {}),
    email: user.email,
    role: user.role,
    ...(user.city ? { city: user.city } : {}),
    ...(user.createdAt ? { createdAt: user.createdAt } : {}),
    ...(actorClerkId && user.clerkId === actorClerkId ? { isSelf: true } : {}),
  };
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

export async function updateUserRole(id: string, role: 'user' | 'admin'): Promise<User | null> {
  const updated = await UserModel.findByIdAndUpdate(id, { $set: { role } }, { returnDocument: 'after' })
    .populate('city')
    .lean<User>();
  return updated;
}

/**
 * Edição de perfil pelo admin (modal do painel): nome e cidade.
 *
 * `city` chega como slug (convenção das demais rotas) e é resolvido para o
 * ObjectId aqui; `null` limpa a cidade do usuário.
 */
export async function updateUserProfile(
  id: string,
  data: { firstName?: string; lastName?: string; city?: string | null },
): Promise<AdminUserListItem | null> {
  const update: Record<string, unknown> = {};
  if (data.firstName !== undefined) update.firstName = data.firstName;
  if (data.lastName !== undefined) update.lastName = data.lastName;
  if (data.city !== undefined) {
    if (data.city === null) {
      update.city = null;
    } else {
      const city = await CityModel.findOne({ slug: data.city }).lean();
      if (!city) {
        throw Object.assign(new Error('cidade não encontrada'), { statusCode: 404 });
      }
      update.city = city._id;
    }
  }

  const updated = await UserModel.findByIdAndUpdate(id, { $set: update }, { returnDocument: 'after' })
    .populate('city')
    .lean<User>();

  if (!updated) return null;
  return toAdminUserListItem(updated);
}

/** Busca o documento bruto por id (controllers precisam do clerkId para defesa de self). */
export async function findUserById(id: string): Promise<User | null> {
  return UserModel.findById(id).lean<User>();
}

/**
 * Exclui um usuário e seus registros relacionados (LGPD).
 *
 * Remove push tokens, avaliações e empresas/profissionais autônomos de sua
 * propriedade. A exclusão do perfil no Clerk é best-effort (ignora erros
 * quando a chave não está configurada ou o usuário já não existe).
 */
export async function deleteUser(id: string): Promise<User | null> {
  const user = await UserModel.findById(id).lean<User>();
  if (!user) return null;

  const clerkId = user.clerkId;

  // Limpeza best-effort dos registros relacionados (não bloqueia a exclusão
  // do usuário se algum modelo não estiver disponível/mocado em testes).
  const cleanup = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err) {
      console.warn(`[deleteUser] falha ao limpar ${label}:`, err);
    }
  };

  await cleanup('pushToken', async () => {
    await PushTokenModel.deleteMany({ clerkId }).exec();
  });
  await cleanup('review', async () => {
    await ReviewModel.deleteMany({ clerkId }).exec();
  });
  await cleanup('company', async () => {
    await CompanyModel.deleteMany({ ownerClerkId: clerkId }).exec();
  });
  await cleanup('autonomousProfessional', async () => {
    await AutonomousProfessionalModel.deleteMany({ ownerClerkId: clerkId }).exec();
  });

  await UserModel.deleteOne({ _id: id }).exec();

  return user;
}
export async function listPushTokens(): Promise<string[]> {
  const users = await UserModel.find({ pushToken: { $exists: true, $ne: null } })
    .select({ pushToken: 1 })
    .lean()
    .exec();
  return users.map((u) => u.pushToken).filter((t): t is string => typeof t === 'string');
}
