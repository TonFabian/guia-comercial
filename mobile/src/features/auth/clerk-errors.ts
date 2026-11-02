/**
 * Tradução dos códigos de erro do Clerk para mensagens em português.
 *
 * Módulo puro de propósito: sem Clerk, sem rede — testável por revisão e
 * reutilizável por todos os fluxos de autenticação.
 */
type ClerkErrorLike = { code?: string; message?: string };

const CLERK_ERROR_MESSAGES: Record<string, string> = {
  form_password_incorrect: 'Senha incorreta',
  form_identifier_exists: 'E-mail já cadastrado',
  form_identifier_not_found: 'E-mail não encontrado',
  form_password_length_incorrect: 'A senha deve ter no mínimo 8 caracteres',
  form_param_missing: 'Preencha todos os campos',
  form_param_format_invalid: 'Verifique o formato dos campos',
  identification_verify_email_code_invalid: 'Código inválido — confira o e-mail',
  verification_expired: 'Código expirado — solicite um novo',
  verification_already_used: 'Código já utilizado — solicite um novo',
  form_code_not_found: 'Código inválido — confira o e-mail',
  resource_already_signed_in: 'Você já está autenticado',
  strategy_invalid: 'Método de login não disponível',
};

export const GenericAuthErrorMessage = 'Não foi possível concluir. Tente novamente.';

/** Extrai o código conciliando com o formato do erro do Clerk. */
function clerkCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const candidate = error as ClerkErrorLike;

  return typeof candidate.code === 'string' ? candidate.code : undefined;
}

export function clerkErrorToMessage(error: unknown): string {
  const code = clerkCode(error);

  if (code && CLERK_ERROR_MESSAGES[code]) {
    return CLERK_ERROR_MESSAGES[code];
  }

  return GenericAuthErrorMessage;
}
