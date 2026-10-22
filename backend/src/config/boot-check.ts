export interface BootEnvironment {
  NODE_ENV?: string;
  CLERK_SECRET_KEY?: string;
}

/**
 * Sem CLERK_SECRET_KEY a API sobe em modo legado (sem verificação de token).
 * Em produção isso precisa ser explícito, senão o deploy fica aberto em silêncio.
 */
export function warnIfWithoutAuthentication(env: BootEnvironment): void {
  if (env.NODE_ENV === 'production' && !env.CLERK_SECRET_KEY) {
    console.warn('ATENÇÃO: API rodando sem autenticação — defina CLERK_SECRET_KEY');
  }
}
