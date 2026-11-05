import type { User } from '@/types/domain';

/** Nome exibido no header: nome completo, e-mail ou "Visitante". */
export function profileDisplayName(user: User | null): string {
  if (!user) {
    return 'Visitante';
  }

  const nomeCompleto = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return nomeCompleto || user.email || 'Usuário';
}
