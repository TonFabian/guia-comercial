import type { RequestHandler } from 'express';

import { scrubGuestResponse } from '../utils/guest.js';

/**
 * Interceptor de resposta: com convidado, redige contato/cÃ³digo antes de
 * responder; caso contrÃ¡rio, devolve o payload intacto.
 *
 * Intercepta `res.json`, `res.send` e `res.end`, jÃ¡ que todos podem carregar
 * um payload JSON (o Express delega `res.json`/`res.send` para `res.end` no
 * final). Redigir no `res.end` cobre os trÃªs caminhos com um Ãºnico ponto de
 * passagem, mantendo o Content-Length consistente.
 *
 * Os controllers nunca mudam: quem decide a redaÃ§Ã£o Ã© `req.auth`, que o
 * `optionalAuth` montou antes. Montar sempre (mesmo no modo legado, em que
 * `req.auth` fica `undefined`) mantÃ©m o comportamento antigo de pÃ©.
 */
export function guestScrub(): RequestHandler {
  return (req, res, next): void => {
    const originalEnd = res.end.bind(res);

    res.end = function end(chunk?: unknown, encoding?: unknown, cb?: unknown) {
      const isGuest = req.auth?.guest === true;
      if (isGuest && chunk != null) {
        const scrubbed = scrubChunk(chunk);
        if (scrubbed !== chunk) {
          const length =
            typeof scrubbed === 'string'
              ? Buffer.byteLength(scrubbed, (encoding as BufferEncoding) || 'utf8')
              : Buffer.isBuffer(scrubbed)
                ? scrubbed.length
                : Buffer.byteLength(String(scrubbed), (encoding as BufferEncoding) || 'utf8');

          if (!res.headersSent) {
            res.setHeader('Content-Length', length);
          }

          return originalEnd(scrubbed, encoding as never, cb as never);
        }
      }

      return originalEnd(chunk as never, encoding as never, cb as never);
    } as typeof res.end;

    next();
  };
}

/** Redige um chunk JSON quando o destinatÃ¡rio Ã© convidado. */
function scrubChunk(chunk: unknown): unknown {
  if (typeof chunk === 'string') {
    try {
      const parsed = JSON.parse(chunk);
      const scrubbed = scrubGuestResponse(parsed, true);
      if (scrubbed === parsed) {
        return chunk;
      }
      return JSON.stringify(scrubbed);
    } catch {
      return chunk;
    }
  }

  if (Buffer.isBuffer(chunk)) {
    const text = chunk.toString('utf8');
    try {
      const parsed = JSON.parse(text);
      const scrubbed = scrubGuestResponse(parsed, true);
      if (scrubbed === parsed) {
        return chunk;
      }
      return Buffer.from(JSON.stringify(scrubbed), 'utf8');
    } catch {
      return chunk;
    }
  }

  return chunk;
}
