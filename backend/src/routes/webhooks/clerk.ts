import type { UserJSON, WebhookEvent } from '@clerk/backend';
import { verifyWebhook } from '@clerk/backend/webhooks';
import type { Request, RequestHandler } from 'express';

import {
  removeUserByClerkId,
  upsertUserFromMirror,
} from '../../services/user.service.js';
import {
  mapClerkUserToMirror,
  type ClerkUserData,
} from '../../utils/clerk-user.js';

/** Converte o payload do webhook (snake_case, campos nuláveis) no tipo do espelho. */
function userDataFromWebhook(data: UserJSON): ClerkUserData {
  return {
    id: data.id,
    first_name: data.first_name ?? undefined,
    last_name: data.last_name ?? undefined,
    email_addresses: data.email_addresses.map(({ id, email_address }) => ({
      id,
      email_address,
    })),
    primary_email_address_id: data.primary_email_address_id ?? undefined,
    phone_numbers: data.phone_numbers.map(({ id, phone_number }) => ({
      id,
      phone_number,
    })),
    primary_phone_number_id: data.primary_phone_number_id ?? undefined,
    image_url: data.image_url ?? undefined,
  };
}

export interface ClerkWebhookDeps {
  verify: (request: Request) => Promise<WebhookEvent>;
  upsert: typeof upsertUserFromMirror;
  remove: typeof removeUserByClerkId;
}

/**
 * Handler do webhook do Clerk, com dependências injetáveis.
 *
 * A injecão existe para que os testes substituam a verificação svix e o
 * acesso ao banco sem rede nem Mongo; a rota real usa `clerkWebhook`.
 * Reentrega de evento é idempotente: o upsert sobrescreve pelo `clerkId`.
 */
export function makeClerkWebhook(deps: ClerkWebhookDeps): RequestHandler {
  return async (req, res): Promise<void> => {
    let event: WebhookEvent;

    try {
      event = await deps.verify(req);
    } catch {
      // Assinatura inválida ou ausente: corpo pode até ser JSON válido,
      // mas sem svix autêntico nada do payload é confiável.
      res.status(400).json({ error: 'assinatura inválida' });
      return;
    }

    if (event.type === 'user.created' || event.type === 'user.updated') {
      await deps.upsert(
        event.data.id,
        mapClerkUserToMirror(userDataFromWebhook(event.data)),
      );
    } else if (event.type === 'user.deleted' && event.data.id) {
      // `id` é opcional no payload de deleção: sem id não há o que remover.
      await deps.remove(event.data.id);
    }

    // Outros eventos são ignorados — resposta 200 evita reentrega infinita.
    res.status(200).json({ received: true });
  };
}

/**
 * Dependências reais: verificação svix do `@clerk/backend` e o service local.
 */
export const clerkWebhook: RequestHandler = makeClerkWebhook({
  verify: verifyClerkRequest,
  upsert: upsertUserFromMirror,
  remove: removeUserByClerkId,
});

/**
 * Converte o request do Express (corpo bruto em Buffer) num `Request` web,
 * formato que `verifyWebhook` espera.
 */
async function verifyClerkRequest(req: Request): Promise<WebhookEvent> {
  const request = new Request('http://localhost/webhooks/clerk', {
    method: 'POST',
    headers: buildWebHeaders(req),
    body: Buffer.isBuffer(req.body) ? req.body : Buffer.from([]),
  });

  return verifyWebhook(request);
}

function buildWebHeaders(req: Request): Headers {
  const headers = new Headers();

  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) {
      continue;
    }

    headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }

  return headers;
}
