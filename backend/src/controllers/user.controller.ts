import type { Request, RequestHandler, Response } from 'express';
import type { UpdateUserDto, UpdateUserRoleDto } from '../types/dto.js';

import type { User } from '../../../shared/domain.js';
import {
  assertAdmin,
  findUserByClerkId,
  listUsers as listUsersService,
  updateUserByClerkId,
  updatePushToken,
  updateUserRole as updateUserRoleService,
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
    const { items, total } = await listUsersService(pagination);
    res.json({ items, total, page: pagination.page, pageSize: pagination.pageSize });
  },
);

/** Normaliza `_id` (ObjectId no doc lean) para string, shape `User`. */
function toUserJson(user: User): User {
  return { ...user, _id: String(user._id) };
}

// -----------------------------------------------------------------------------
// Role de usuário (admin): promover/rebaixar
// -----------------------------------------------------------------------------

export interface UpdateUserRoleDeps {
  assertAdmin: typeof assertAdmin;
  find: typeof findUserByClerkId;
  update: typeof updateUserRoleService;
}

export function makeUpdateUserRoleController(
  deps: UpdateUserRoleDeps = { assertAdmin, find: findUserByClerkId, update: updateUserRoleService },
): RequestHandler {
  return async (req, res): Promise<void> => {
    const actorClerkId = req.auth?.clerkId;
    await deps.assertAdmin(actorClerkId, 'alterar role de usuário');

    const id = String(req.params.id);
    const { UserModel } = await import('../models/user.model.js');
    const usuario = await UserModel.findById(id).lean();
    if (!usuario) {
      res.status(404).json({ error: 'usuário não encontrado' });
      return;
    }

    if (actorClerkId && usuario.clerkId === actorClerkId) {
      res.status(403).json({ error: 'não é possível alterar a própria role' });
      return;
    }

    const { role } = req.body as UpdateUserRoleDto;
    const updated = await deps.update(id, role);
    if (!updated) {
      res.status(404).json({ error: 'usuário não encontrado' });
      return;
    }
    res.json({ ...updated, _id: String(updated._id) });
  };
}

// -----------------------------------------------------------------------------
// Exclusão de usuário (admin) — LGPD: apaga conta + registros relacionados
// -----------------------------------------------------------------------------

export interface DeleteUserDeps {
  assertAdmin: typeof assertAdmin;
  find: typeof findUserByClerkId;
  remove: typeof deleteUserService;
}

export function makeDeleteUserController(
  deps: DeleteUserDeps = { assertAdmin, find: findUserByClerkId, remove: deleteUserService },
): RequestHandler {
  return async (req, res): Promise<void> => {
    const actorClerkId = req.auth?.clerkId;
    await deps.assertAdmin(actorClerkId, 'excluir usuário');

    const id = String(req.params.id);
    const { UserModel } = await import('../models/user.model.js');
    const usuario = await UserModel.findById(id).lean();
    if (!usuario) {
      res.status(404).json({ error: 'usuário não encontrado' });
      return;
    }

    if (actorClerkId && usuario.clerkId === actorClerkId) {
      res.status(403).json({ error: 'não é possível excluir a própria conta' });
      return;
    }

    await deps.remove(id);

    // Exclusão no Clerk é best-effort: não deve bloquear a resposta.
    if (process.env.CLERK_SECRET_KEY) {
      try {
        const { createClerkClient } = await import('@clerk/backend');
        const client = createClerkClient({
          secretKey: process.env.CLERK_SECRET_KEY,
          publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
        });
        await client.users.deleteUser(usuario.clerkId);
      } catch {
        // ignora: o espelho local já foi removido.
      }
    }

    res.status(204).send();
  };
}

export const updateUserRole: RequestHandler = makeUpdateUserRoleController();
export const deleteUser: RequestHandler = makeDeleteUserController();
