import { findUserByClerkId } from './user.service.js';

export interface ResourceOwner {
  exists: boolean;
  ownerClerkId?: string | null;
}

export interface AssertOwnerOrAdminParams {
  resourceId: string;
  clerkId?: string;
  /** Retorna existência e o ownerClerkId do recurso. */
  findResource: (id: string) => Promise<ResourceOwner>;
  notFoundMessage?: string;
  forbiddenMessage?: string;
  unauthorizedMessage?: string;
}

/**
 * Autorização reutilizável "owner ou admin".
 *
 * Sem CLERK_SECRET_KEY (modo legado) a autorização fica desabilitada.
 * Recurso inexistente → 404. Sem sessão → 401.
 * Recurso com dono definido: só o próprio dono ou um admin pode mutar.
 * Recurso sem dono (legado): apenas admins, evitando tomada de posse.
 */
export async function assertOwnerOrAdmin(params: AssertOwnerOrAdminParams): Promise<void> {
  const {
    resourceId,
    clerkId,
    findResource,
    notFoundMessage = 'recurso não encontrado',
    forbiddenMessage = 'sem permissão para editar este recurso',
    unauthorizedMessage = 'não autenticado',
  } = params;

  const resource = await findResource(resourceId);
  if (!resource.exists) {
    throw Object.assign(new Error(notFoundMessage), { statusCode: 404 });
  }

  // Sem auth configurada (modo legado), a autorização fica desabilitada.
  if (!process.env.CLERK_SECRET_KEY) {
    return;
  }

  if (!clerkId) {
    throw Object.assign(new Error(unauthorizedMessage), { statusCode: 401 });
  }

  // Recurso com dono definido: só o próprio dono ou um admin pode mutar.
  if (resource.ownerClerkId) {
    if (resource.ownerClerkId === clerkId) {
      return;
    }
    const user = await findUserByClerkId(clerkId);
    if (user?.role !== 'admin') {
      throw Object.assign(new Error(forbiddenMessage), { statusCode: 403 });
    }
    return;
  }

  // Recurso sem dono (legado): apenas admins, evitando tomada de posse.
  const user = await findUserByClerkId(clerkId);
  if (user?.role !== 'admin') {
    throw Object.assign(new Error(forbiddenMessage), { statusCode: 403 });
  }
}
