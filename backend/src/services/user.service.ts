import { CityModel } from '../models/city.model.js';
import { UserModel } from '../models/user.model.js';
import type { City, User } from '../../../shared/domain.js';
import type { Pagination } from '../utils/http.js';

/** Acesso a dados do espelho local de usuários do Clerk. */

export function findUserByClerkId(clerkId: string): Promise<User | null> {
  return UserModel.findOne({ clerkId }).populate('city').lean<User>().exec();
}

/**
 * Garante que a sessão é de um administrador.
 *
 * 401 sem identidade; 403 quando o espelho existe mas não é admin.
 */
export async function assertAdmin(
  clerkId: string | undefined,
  recurso: string,
): Promise<void> {
  if (!clerkId) {
    throw Object.assign(new Error('Não autenticado'), { statusCode: 401 });
  }

  const user = await findUserByClerkId(clerkId);
  if (user?.role !== 'admin') {
    throw Object.assign(new Error(`sem permissão para ${recurso}`), { statusCode: 403 });
  }
}

/** Item da listagem de usuários do painel admin (sem dados sensíveis). */
export interface AdminUserListItem {
  _id: string;
  name?: string;
  email: string;
  role: 'user' | 'admin';
  city?: string | City;
  createdAt?: string;
}

/**
 * Lista os usuários do espelho local para o painel admin.
 *
 * `pushToken` e os identificadores de sessão não entram na resposta: o painel
 * precisa de nome, e-mail, role e cidade, não de credencial de push.
 */
export async function listUsers(
  pagination: Pagination,
): Promise<{ items: AdminUserListItem[]; total: number }> {
  const [usuarios, total] = await Promise.all([
    UserModel.find({})
      .select({ pushToken: 0, clerkId: 0, lastSid: 0, lastSignInAt: 0 })
      .populate('city')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean<User[]>(),
    UserModel.countDocuments({}),
  ]);

  return { items: usuarios.map(toAdminUserListItem), total };
}

/** Normaliza o documento lean no item público da listagem admin. */
function toAdminUserListItem(user: User): AdminUserListItem {
  const nome = [user.firstName, user.lastName].filter(Boolean).join(' ');

  return {
    _id: String(user._id),
    ...(nome ? { name: nome } : {}),
    email: user.email,
    role: user.role,
    ...(user.city ? { city: user.city } : {}),
    ...(user.createdAt ? { createdAt: user.createdAt } : {}),
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

export async function listPushTokens(): Promise<string[]> {
  const users = await UserModel.find({ pushToken: { $exists: true, $ne: null } })
    .select({ pushToken: 1 })
    .lean()
    .exec();
  return users.map((u) => u.pushToken).filter((t): t is string => typeof t === 'string');
}
