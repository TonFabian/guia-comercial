/**
 * Espelho local da whitelist de rotas de deep link do backend
 * (`backend/src/utils/deep-link.ts` — `DEEP_LINK_PADRAO`).
 *
 * A paridade é verificada literalmente em `admin/src/utils/deep-link.test.ts`.
 * Casamento por segmento: rotas exatas só casam idênticas; rotas não exatas
 * exigem o prefixo seguido de exatamente um segmento `[\w-]+`.
 */
export const DEEP_LINK_ROTAS = [
  { prefixo: '/', exato: true },
  { prefixo: '/(tabs)/search', exato: true },
  { prefixo: '/(tabs)/favorites', exato: true },
  { prefixo: '/(tabs)/profile', exato: true },
  { prefixo: '/company/', exato: false },
  { prefixo: '/event/', exato: false },
  { prefixo: '/tourist-spot/', exato: false },
  { prefixo: '/job/', exato: false },
  { prefixo: '/autonomous/', exato: false },
  { prefixo: '/map', exato: true },
  { prefixo: '/my-company', exato: true },
  { prefixo: '/announce', exato: true },
] as const;

const SEGMENTO = /^[\w-]+$/;

export function ehDeepLinkValido(url: string): boolean {
  if (typeof url !== 'string' || url.length === 0) return false;
  for (const entrada of DEEP_LINK_ROTAS) {
    if (entrada.exato) {
      if (url === entrada.prefixo) return true;
    } else {
      if (url.startsWith(entrada.prefixo)) {
        const resto = url.slice(entrada.prefixo.length);
        if (resto.length > 0 && !resto.includes('/') && SEGMENTO.test(resto)) {
          return true;
        }
      }
    }
  }
  return false;
}
