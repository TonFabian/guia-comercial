import type { RequestHandler } from 'express';
import type { UpdateUserDto } from '../types/dto.js';

import type { User } from '../../../shared/domain.js';
import { findUserByClerkId, updateUserByClerkId, updatePushToken } from '../services/user.service.js';

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

/** Normaliza `_id` (ObjectId no doc lean) para string, shape `User`. */
function toUserJson(user: User): User {
  return { ...user, _id: String(user._id) };
}
