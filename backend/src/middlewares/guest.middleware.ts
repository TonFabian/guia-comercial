import type { RequestHandler } from 'express';

import { scrubGuestResponse } from '../utils/guest.js';

/**
 * Interceptor de resposta: com convidado, redige contato/código antes de
 * responder; caso contrário, devolve o payload intacto.
 *
 * Os controllers nunca mudam: quem decide a redação é `req.auth`, que o
 * `optionalAuth` montou antes. Montar sempre (mesmo no modo legado, em que
 * `req.auth` fica `undefined`) mantém o comportamento antigo de pé.
 */
export function guestScrub(): RequestHandler {
  return (req, res, next): void => {
    const respondJson = res.json.bind(res);

    res.json = (payload: unknown) =>
      respondJson(
        req.auth?.guest === true ? scrubGuestResponse(payload, true) : payload,
      );

    next();
  };
}
