import { describe, expect, it } from 'vitest';

import { GenericAuthErrorMessage, clerkErrorToMessage } from './clerk-errors';

describe('mapeamento de erros do Clerk (admin)', () => {
  it('traduz código conhecido', () => {
    expect(clerkErrorToMessage({ code: 'form_password_incorrect' })).toBe('Senha incorreta');
  });

  it('lê código aninhado em errors[0].code (ClerkAPIResponseError)', () => {
    expect(clerkErrorToMessage({ errors: [{ code: 'form_identifier_not_found' }] })).toBe('E-mail não encontrado');
  });

  it('código desconhecido cai na mensagem genérica', () => {
    expect(clerkErrorToMessage({ code: 'algo_novo' })).toBe(GenericAuthErrorMessage);
  });

  it('erro sem código cai na mensagem genérica', () => {
    expect(clerkErrorToMessage(new Error('boom'))).toBe(GenericAuthErrorMessage);
  });

  it('null/undefined não quebram', () => {
    expect(clerkErrorToMessage(null)).toBe(GenericAuthErrorMessage);
    expect(clerkErrorToMessage(undefined)).toBe(GenericAuthErrorMessage);
  });
});
