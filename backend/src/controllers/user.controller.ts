import type { Request, RequestHandler, Response } from 'express';
import type { UpdateUserAdminDto, UpdateUserDto, UpdateUserRoleDto } from '../types/dto.js';

import type { User } from '../../../shared/domain.js';
import {
  assertAdmin,
  findUserByClerkId,
  listUsers as listUsersService,
  updateUserByClerkId,
  updatePushToken,
  updateUserRole as updateUserRoleService,
  updateUserProfile as updateUserProfileService,
  findUserById as findUserByIdService,
  deleteUser as deleteUserService,
} from '../services/user.service.js';
import { asyncHandler, parsePagination } from '../utils/http.js';

export interface UpdateMeDeps {
  update: typeof updateUserByClerkId;
}

export function makeUpdateMeController(
  deps: UpdateMeDeps = { update: updateUserByClerkId },
): RequestHandler {
  return async (req, res): Promise<void> => {
    const clerkId = req.auth?.clerkId;

    if (!clerkId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const updated = await deps.update(clerkId, req.body as UpdateUserDto);

    if (!updated) {
      res.status(404).json({ error: 'perfil não sincronizado ainda' });
      return;
    }

    res.json({ ...updated, _id: String(updated._id) });
  };
}

export function makeUpdatePushTokenController(): RequestHandler {
  return async (req, res): Promise<void> => {
    const clerkId = req.auth?.clerkId;
    if (!clerkId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const { pushToken } = req.body as { pushToken?: string };
    if (!pushToken) {
      res.status(400).json({ error: 'pushToken é obrigatório' });
      return;
    }
    await updatePushToken(clerkId, pushToken);
    res.json({ ok: true });
  };
}

export const updateMe: RequestHandler = makeUpdateMeController();
export const updatePushTokenController: RequestHandler = makeUpdatePushTokenController();

export interface MeDeps {
  find: typeof findUserByClerkId;
}

/**
 * GET /me: devolve o espelho local do usuário autenticado.
 *
 * Fábrica para os testes substituírem o acesso ao banco sem Mongo; a rota
 * real usa `me` com o service de verdade. Sem identidade no request dá 401
 * (defesa extra: a rota já deve ser montada atrás do `requireAuth`).
 */
export function makeMeController(deps: MeDeps = { find: findUserByClerkId }): RequestHandler {
  return async (req, res): Promise<void> => {
    const clerkId = req.auth?.clerkId;

    if (!clerkId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const user = await deps.find(clerkId);

    if (!user) {
      // Auto-curável: a próxima chamada autenticada recria o espelho via
      // bootstrap do middleware de auth.
      res.status(404).json({ error: 'perfil não sincronizado ainda' });
      return;
    }

    res.json(toUserJson(user));
  };
}

export const me: RequestHandler = makeMeController();

/**
 * GET /users: listagem de usuários do painel admin.
 *
 * Exige sessão de admin: 401 sem identidade e 403 para usuário sem a role
 * `admin`. A resposta não traz `pushToken` nem identificadores de sessão.
 */
export const listUsers = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await assertAdmin(req.auth?.clerkId, 'listar usuários');

    const pagination = parsePagination(req.query.page, req.query.pageSize);
    const { items, total } = await listUsersService(pagination, req.auth?.clerkId);
    res.json({ items, total, page: pagination.page, pageSize: pagination.pageSize });
  },
);

/** Normaliza `_id` (ObjectId no doc lean) para string, shape `User`. */
function toUserJson(user: User): User {
  return { ...user, _id: String(user._id) };
}

// -----------------------------------------------------------------------------
// Gestão de usuários pelo admin (role, perfil e exclusão LGPD)
// -----------------------------------------------------------------------------

/** Defesa de self: localiza o alvo por id e compara o clerkId do ator. */
async function localizarAlvo(
  deps: { find: typeof findUserByIdService },
  id: string,
  actorClerkId: string | undefined,
): Promise<{ usuario: User | null; erro?: { status: number; mensagem: string } }> {
  const usuario = await deps.find(id);
  if (!usuario) {
    return { usuario: null, erro: { status: 404, mensagem: 'usuário não encontrado' } };
  }
  if (actorClerkId && usuario.clerkId === actorClerkId) {
    return { usuario, erro: { status: 403, mensagem: 'ação não permitida na própria conta' } };
  }
  return { usuario };
}

// -----------------------------------------------------------------------------
// Role de usuário (admin): promover/rebaixar
// -----------------------------------------------------------------------------

export interface UpdateUserRoleDeps {
  assertAdmin: typeof assertAdmin;
  find: typeof findUserByIdService;
  update: typeof updateUserRoleService;
}

export function makeUpdateUserRoleController(
  deps: UpdateUserRoleDeps = { assertAdmin, find: findUserByIdService, update: updateUserRoleService },
): RequestHandler {
  return async (req, res): Promise<void> => {
    const actorClerkId = req.auth?.clerkId;
    await deps.assertAdmin(actorClerkId, 'alterar role de usuário');

    const alvo = await localizarAlvo(deps, String(req.params.id), actorClerkId);
    if (alvo.erro) {
      res.status(alvo.erro.status).json({ error: alvo.erro.mensagem });
      return;
    }

    const { role } = req.body as UpdateUserRoleDto;
    const updated = await deps.update(String(req.params.id), role);
    if (!updated) {
      res.status(404).json({ error: 'usuário não encontrado' });
      return;
    }
    res.json({ ...updated, _id: String(updated._id) });
  };
}

// -----------------------------------------------------------------------------
// Perfil de usuário (admin): nome e cidade (modal de edição do painel)
// -----------------------------------------------------------------------------

export interface UpdateUserProfileDeps {
  assertAdmin: typeof assertAdmin;
  find: typeof findUserByIdService;
  update: typeof updateUserProfileService;
}

export function makeUpdateUserProfileController(
  deps: UpdateUserProfileDeps = {
    assertAdmin,
    find: findUserByIdService,
    update: updateUserProfileService,
  },
): RequestHandler {
  return async (req, res): Promise<void> => {
    const actorClerkId = req.auth?.clerkId;
    await deps.assertAdmin(actorClerkId, 'editar perfil de usuário');

    // Editar o PRÓPRIO perfil é permitido (cidade/nome não são escalonamento
    // de privilégio); a defesa de self vale para a role e para a exclusão.
    const id = String(req.params.id);
    const usuario = await deps.find(id);
    if (!usuario) {
      res.status(404).json({ error: 'usuário não encontrado' });
      return;
    }

    try {
      const updated = await deps.update(id, req.body as UpdateUserAdminDto);
      if (!updated) {
        res.status(404).json({ error: 'usuário não encontrado' });
        return;
      }
      res.json(updated);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 500;
      const mensagem = err instanceof Error ? err.message : 'falha ao atualizar perfil';
      res.status(status).json({ error: mensagem });
    }
  };
}

// -----------------------------------------------------------------------------
// Exclusão de usuário (admin) — LGPD: apaga conta + registros relacionados
// -----------------------------------------------------------------------------

export interface DeleteUserDeps {
  assertAdmin: typeof assertAdmin;
  find: typeof findUserByIdService;
  remove: typeof deleteUserService;
}

export function makeDeleteUserController(
  deps: DeleteUserDeps = { assertAdmin, find: findUserByIdService, remove: deleteUserService },
): RequestHandler {
  return async (req, res): Promise<void> => {
    const actorClerkId = req.auth?.clerkId;
    await deps.assertAdmin(actorClerkId, 'excluir usuário');

    const alvo = await localizarAlvo(deps, String(req.params.id), actorClerkId);
    if (alvo.erro || !alvo.usuario) {
      res.status(alvo.erro?.status ?? 404).json({ error: alvo.erro?.mensagem ?? 'usuário não encontrado' });
      return;
    }

    await deps.remove(String(req.params.id));

    // Exclusão no Clerk é best-effort: não deve bloquear a resposta.
    if (process.env.CLERK_SECRET_KEY) {
      try {
        const { createClerkClient } = await import('@clerk/backend');
        const client = createClerkClient({
          secretKey: process.env.CLERK_SECRET_KEY,
          publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
        });
        await client.users.deleteUser(alvo.usuario.clerkId);
      } catch {
        // ignora: o espelho local já foi removido.
      }
    }

    res.status(204).send();
  };
}

export const updateUserRole: RequestHandler = makeUpdateUserRoleController();
export const updateUserProfile: RequestHandler = makeUpdateUserProfileController();
export const deleteUser: RequestHandler = makeDeleteUserController();
