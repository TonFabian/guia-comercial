export interface BootEnvironment {
  NODE_ENV?: string;
  CLERK_SECRET_KEY?: string;
  CLERK_PUBLISHABLE_KEY?: string;
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

/**
 * Auth ligado exige o par de chaves: sem a publishable key o
 * `authenticateRequest` do Clerk falha e todo request autenticado viraria 401.
 * Config quebrada deve derrubar o boot, não degradar em silêncio.
 */
export function assertValidClerkConfiguration(env: BootEnvironment): void {
  if (env.CLERK_SECRET_KEY && !env.CLERK_PUBLISHABLE_KEY) {
    throw new Error(
      'CLERK_PUBLISHABLE_KEY é obrigatória quando CLERK_SECRET_KEY está definida',
    );
  }
}
